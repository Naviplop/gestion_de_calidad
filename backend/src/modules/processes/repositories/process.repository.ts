import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Process, ProcessListItem } from '../entities/process.entity';

@Injectable()
export class ProcessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<Process | null> {
    const process = await this.prisma.process.findFirst({
      where: { id, organizationId },
    });

    if (!process) {
      return null;
    }

    return new Process(
      process.id,
      process.organizationId,
      process.areaId,
      process.parentProcessId,
      process.code,
      process.name,
      process.description,
      process.ownerId,
      process.processType,
      process.isActive,
      process.createdAt,
      process.updatedAt,
    );
  }

  async findByOrganization(organizationId: string): Promise<Process[]> {
    const processes = await this.prisma.process.findMany({
      where: { organizationId },
      orderBy: { code: 'asc' },
    });

    return processes.map((p) => new Process(
      p.id,
      p.organizationId,
      p.areaId,
      p.parentProcessId,
      p.code,
      p.name,
      p.description,
      p.ownerId,
      p.processType,
      p.isActive,
      p.createdAt,
      p.updatedAt,
    ));
  }

  async findListByOrganization(organizationId: string, page: number, pageSize: number, search?: string): Promise<{ data: ProcessListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = { organizationId };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [processes, total] = await Promise.all([
      this.prisma.process.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          areaId: true,
          area: { select: { id: true, name: true } },
          parentProcessId: true,
          parentProcess: { select: { id: true, name: true } },
          ownerId: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
          processType: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.process.count({ where }),
    ]);

    const data = processes.map((p) => new ProcessListItem(
      p.id,
      p.code,
      p.name,
      p.description,
      p.areaId,
      p.area?.name ?? null,
      p.parentProcessId,
      p.parentProcess?.name ?? null,
      p.ownerId,
      p.owner ? `${p.owner.firstName} ${p.owner.lastName}` : null,
      p.processType,
      p.isActive,
      p.createdAt,
      p.updatedAt,
    ));

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findDuplicate(organizationId: string, code: string, excludeId?: string): Promise<Process | null> {
    const where: Record<string, unknown> = {
      organizationId,
      code,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const process = await this.prisma.process.findFirst({ where });

    if (!process) {
      return null;
    }

    return new Process(
      process.id,
      process.organizationId,
      process.areaId,
      process.parentProcessId,
      process.code,
      process.name,
      process.description,
      process.ownerId,
      process.processType,
      process.isActive,
      process.createdAt,
      process.updatedAt,
    );
  }

  async create(organizationId: string, data: {
    code: string;
    name: string;
    description?: string | null;
    areaId?: string | null;
    parentProcessId?: string | null;
    ownerId?: string | null;
    processType?: string | null;
  }): Promise<Process> {
    const process = await this.prisma.process.create({
      data: {
        organizationId,
        code: data.code,
        name: data.name,
        description: data.description,
        areaId: data.areaId,
        parentProcessId: data.parentProcessId,
        ownerId: data.ownerId,
        processType: data.processType,
        isActive: true,
      },
    });

    return new Process(
      process.id,
      process.organizationId,
      process.areaId,
      process.parentProcessId,
      process.code,
      process.name,
      process.description,
      process.ownerId,
      process.processType,
      process.isActive,
      process.createdAt,
      process.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    code?: string;
    name?: string;
    description?: string | null;
    areaId?: string | null;
    parentProcessId?: string | null;
    ownerId?: string | null;
    processType?: string | null;
    isActive?: boolean;
  }): Promise<Process> {
    await this.prisma.process.findFirstOrThrow({
      where: { id, organizationId },
    });

    const process = await this.prisma.process.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.areaId !== undefined && { areaId: data.areaId }),
        ...(data.parentProcessId !== undefined && { parentProcessId: data.parentProcessId }),
        ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
        ...(data.processType !== undefined && { processType: data.processType }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return new Process(
      process.id,
      process.organizationId,
      process.areaId,
      process.parentProcessId,
      process.code,
      process.name,
      process.description,
      process.ownerId,
      process.processType,
      process.isActive,
      process.createdAt,
      process.updatedAt,
    );
  }

  async deactivate(id: string, organizationId: string): Promise<void> {
    await this.prisma.process.findFirstOrThrow({
      where: { id, organizationId },
    });

    await this.prisma.process.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
