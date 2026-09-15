import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ProcessRepository } from '../repositories/process.repository';
import { CreateProcessDto } from '../dto/create-process.dto';
import { UpdateProcessDto } from '../dto/update-process.dto';
import { Process, ProcessListItem } from '../entities/process.entity';

@Injectable()
export class ProcessesService {
  constructor(
    private readonly processRepository: ProcessRepository,
    private readonly prisma: PrismaService,
  ) {}

  async generateProcessCode(organizationId: string): Promise<string> {
    const existing = await this.prisma.process.findMany({
      where: { organizationId },
      orderBy: { code: 'asc' },
    });
    const maxNum = existing.reduce((max, p) => {
      const match = p.code.match(/^PR-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    return `PR-${String(maxNum + 1).padStart(3, '0')}`;
  }

  async listProcesses(organizationId: string, page: number, pageSize: number, search?: string): Promise<{ data: ProcessListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    return this.processRepository.findListByOrganization(organizationId, page, pageSize, search);
  }

  async getProcess(organizationId: string, id: string): Promise<Process> {
    const process = await this.processRepository.findById(id, organizationId);
    if (!process) {
      throw new NotFoundException('ProcessNotFound');
    }
    return process;
  }

  async createProcess(organizationId: string, dto: CreateProcessDto): Promise<Process> {
    if (dto.code) {
      const duplicate = await this.prisma.process.findFirst({
        where: { organizationId, code: dto.code },
      });
      if (duplicate) {
        throw new ConflictException('DuplicateProcessCode');
      }
      if (dto.parentProcessId) {
        if (dto.parentProcessId === dto.code) {
          throw new BadRequestException('InvalidParentProcess');
        }
        const parent = await this.prisma.process.findFirst({
          where: { id: dto.parentProcessId, organizationId },
        });
        if (!parent) {
          throw new BadRequestException('InvalidParentProcess');
        }
      }
      return this.prisma.process.create({
        data: {
          organizationId,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          areaId: dto.areaId,
          parentProcessId: dto.parentProcessId,
          ownerId: dto.ownerId,
          processType: dto.processType,
          isActive: true,
        },
      });
    }

    const MAX_RETRIES = 5;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const code = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT * FROM "Process" WHERE "organizationId" = ${organizationId} FOR UPDATE`;
        const existing = await tx.process.findMany({
          where: { organizationId },
          orderBy: { code: 'asc' },
        });
        const maxNum = existing.reduce((max, p) => {
          const match = p.code.match(/^PR-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
          }
          return max;
        }, 0);
        return `PR-${String(maxNum + 1).padStart(3, '0')}`;
      });

      try {
        return await this.prisma.process.create({
          data: {
            organizationId,
            code,
            name: dto.name,
            description: dto.description,
            areaId: dto.areaId,
            parentProcessId: dto.parentProcessId,
            ownerId: dto.ownerId,
            processType: dto.processType,
            isActive: true,
          },
        });
      } catch (error) {
        const prismaError = error as { code?: string };
        if (prismaError.code === 'P2002' && attempt === MAX_RETRIES - 1) {
          throw new ConflictException('DuplicateProcessCode');
        }
        if (prismaError.code !== 'P2002') {
          throw error;
        }
      }
    }
    throw new ConflictException('DuplicateProcessCode');
  }

  async updateProcess(organizationId: string, id: string, dto: UpdateProcessDto): Promise<Process> {
    const existing = await this.processRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('ProcessNotFound');
    }

    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.processRepository.findDuplicate(organizationId, dto.code, id);
      if (duplicate) {
        throw new ConflictException('DuplicateProcessCode');
      }
    }

    if (dto.parentProcessId) {
      if (dto.parentProcessId === id) {
        throw new BadRequestException('InvalidParentProcess');
      }
      const parent = await this.processRepository.findById(dto.parentProcessId, organizationId);
      if (!parent) {
        throw new BadRequestException('InvalidParentProcess');
      }
    }

    return this.processRepository.update(id, organizationId, {
      code: dto.code,
      name: dto.name,
      description: dto.description,
      areaId: dto.areaId,
      parentProcessId: dto.parentProcessId,
      ownerId: dto.ownerId,
      processType: dto.processType,
      isActive: dto.isActive,
    });
  }

  async deactivateProcess(organizationId: string, id: string): Promise<void> {
    const existing = await this.processRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('ProcessNotFound');
    }

    await this.processRepository.deactivate(id, organizationId);
  }
}
