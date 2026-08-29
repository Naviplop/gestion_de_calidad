import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProcessRepository } from '../repositories/process.repository';
import { CreateProcessDto } from '../dto/create-process.dto';
import { UpdateProcessDto } from '../dto/update-process.dto';
import { Process, ProcessListItem } from '../entities/process.entity';

@Injectable()
export class ProcessesService {
  constructor(private readonly processRepository: ProcessRepository) {}

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
    const duplicate = await this.processRepository.findDuplicate(organizationId, dto.code);
    if (duplicate) {
      throw new ConflictException('DuplicateProcessCode');
    }

    if (dto.parentProcessId) {
      if (dto.parentProcessId === dto.code) {
        throw new BadRequestException('InvalidParentProcess');
      }
      const parent = await this.processRepository.findById(dto.parentProcessId, organizationId);
      if (!parent) {
        throw new BadRequestException('InvalidParentProcess');
      }
    }

    return this.processRepository.create(organizationId, {
      code: dto.code,
      name: dto.name,
      description: dto.description,
      areaId: dto.areaId,
      parentProcessId: dto.parentProcessId,
      ownerId: dto.ownerId,
      processType: dto.processType,
    });
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
