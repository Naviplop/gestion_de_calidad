import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditProgram, AuditProgramListItem } from '../entities/audit.entity';

@Injectable()
export class AuditProgramRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<AuditProgram | null> {
    const program = await this.prisma.auditProgram.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        name: true,
        description: true,
        periodStart: true,
        periodEnd: true,
        responsibleId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!program) {
      return null;
    }

    return new AuditProgram(
      program.id,
      program.organizationId,
      program.name,
      program.description,
      program.periodStart,
      program.periodEnd,
      program.responsibleId,
      program.status,
      program.createdAt,
      program.updatedAt,
    );
  }

  async findListByOrganization(
    organizationId: string,
    page: number,
    pageSize: number,
    search?: string,
    status?: string,
    responsibleId?: string,
  ): Promise<{ data: AuditProgramListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = { organizationId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (responsibleId) {
      where.responsibleId = responsibleId;
    }

    const [programs, total] = await Promise.all([
      this.prisma.auditProgram.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          periodStart: true,
          periodEnd: true,
          responsibleId: true,
          responsible: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.auditProgram.count({ where }),
    ]);

    const data = programs.map((p) => new AuditProgramListItem(
      p.id,
      p.name,
      p.description,
      p.periodStart,
      p.periodEnd,
      p.responsibleId,
      p.responsible ? { id: p.responsible.id, firstName: p.responsible.firstName, lastName: p.responsible.lastName } : null,
      p.status,
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

  async create(organizationId: string, data: {
    name: string;
    description?: string | null;
    periodStart: Date;
    periodEnd: Date;
    responsibleId?: string | null;
    status?: string;
  }): Promise<AuditProgram> {
    const program = await this.prisma.auditProgram.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        responsibleId: data.responsibleId,
        status: data.status || 'PLANNED',
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        description: true,
        periodStart: true,
        periodEnd: true,
        responsibleId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new AuditProgram(
      program.id,
      program.organizationId,
      program.name,
      program.description,
      program.periodStart,
      program.periodEnd,
      program.responsibleId,
      program.status,
      program.createdAt,
      program.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    name?: string;
    description?: string | null;
    periodStart?: Date;
    periodEnd?: Date;
    responsibleId?: string | null;
    status?: string;
  }): Promise<AuditProgram> {
    const program = await this.prisma.auditProgram.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.periodStart !== undefined && { periodStart: data.periodStart }),
        ...(data.periodEnd !== undefined && { periodEnd: data.periodEnd }),
        ...(data.responsibleId !== undefined && { responsibleId: data.responsibleId }),
        ...(data.status !== undefined && { status: data.status }),
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        description: true,
        periodStart: true,
        periodEnd: true,
        responsibleId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (program.organizationId !== organizationId) {
      throw new NotFoundException('AuditProgramNotFound');
    }

    return new AuditProgram(
      program.id,
      program.organizationId,
      program.name,
      program.description,
      program.periodStart,
      program.periodEnd,
      program.responsibleId,
      program.status,
      program.createdAt,
      program.updatedAt,
    );
  }

  async findDuplicate(organizationId: string, name: string, excludeId?: string): Promise<AuditProgram | null> {
    const where: Record<string, unknown> = {
      organizationId,
      name,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const program = await this.prisma.auditProgram.findFirst({ where });

    if (!program) {
      return null;
    }

    return new AuditProgram(
      program.id,
      program.organizationId,
      program.name,
      program.description,
      program.periodStart,
      program.periodEnd,
      program.responsibleId,
      program.status,
      program.createdAt,
      program.updatedAt,
    );
  }
}
