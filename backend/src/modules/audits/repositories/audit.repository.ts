import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Audit, AuditListItem } from '../entities/audit.entity';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<Audit | null> {
    const audit = await this.prisma.audit.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        auditProgramId: true,
        processId: true,
        leadAuditorId: true,
        code: true,
        title: true,
        auditType: true,
        plannedStart: true,
        plannedEnd: true,
        actualStart: true,
        actualEnd: true,
        status: true,
        scope: true,
        objective: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!audit) {
      return null;
    }

    return new Audit(
      audit.id,
      audit.organizationId,
      audit.auditProgramId,
      audit.processId,
      audit.leadAuditorId,
      audit.code,
      audit.title,
      audit.auditType,
      audit.plannedStart,
      audit.plannedEnd,
      audit.actualStart,
      audit.actualEnd,
      audit.status,
      audit.scope,
      audit.objective,
      audit.createdAt,
      audit.updatedAt,
    );
  }

  async findListByOrganization(
    organizationId: string,
    page: number,
    pageSize: number,
    search?: string,
    status?: string,
    auditProgramId?: string,
    processId?: string,
    leadAuditorId?: string,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<{ data: AuditListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = { organizationId };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (auditProgramId) {
      where.auditProgramId = auditProgramId;
    }

    if (processId) {
      where.processId = processId;
    }

    if (leadAuditorId) {
      where.leadAuditorId = leadAuditorId;
    }

    const orderBy: Record<string, string> = {};
    if (sortBy && ['createdAt', 'plannedStart', 'code'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [audits, total] = await Promise.all([
      this.prisma.audit.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          auditProgramId: true,
          processId: true,
          leadAuditorId: true,
          code: true,
          title: true,
          auditType: true,
          plannedStart: true,
          plannedEnd: true,
          actualStart: true,
          actualEnd: true,
          status: true,
          scope: true,
          objective: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.audit.count({ where }),
    ]);

    const data = audits.map((a) => new AuditListItem(
      a.id,
      a.auditProgramId,
      a.processId,
      a.leadAuditorId,
      a.code,
      a.title,
      a.auditType,
      a.plannedStart,
      a.plannedEnd,
      a.actualStart,
      a.actualEnd,
      a.status,
      a.scope,
      a.objective,
      a.createdAt,
      a.updatedAt,
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
    auditProgramId?: string | null;
    processId?: string | null;
    leadAuditorId?: string | null;
    code: string;
    title: string;
    auditType?: string | null;
    plannedStart?: Date | null;
    plannedEnd?: Date | null;
    scope?: string | null;
    objective?: string | null;
    status?: string;
  }): Promise<Audit> {
    const audit = await this.prisma.audit.create({
      data: {
        organizationId,
        auditProgramId: data.auditProgramId,
        processId: data.processId,
        leadAuditorId: data.leadAuditorId,
        code: data.code,
        title: data.title,
        auditType: data.auditType,
        plannedStart: data.plannedStart,
        plannedEnd: data.plannedEnd,
        scope: data.scope,
        objective: data.objective,
        status: data.status || 'PLANNED',
      },
      select: {
        id: true,
        organizationId: true,
        auditProgramId: true,
        processId: true,
        leadAuditorId: true,
        code: true,
        title: true,
        auditType: true,
        plannedStart: true,
        plannedEnd: true,
        actualStart: true,
        actualEnd: true,
        status: true,
        scope: true,
        objective: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new Audit(
      audit.id,
      audit.organizationId,
      audit.auditProgramId,
      audit.processId,
      audit.leadAuditorId,
      audit.code,
      audit.title,
      audit.auditType,
      audit.plannedStart,
      audit.plannedEnd,
      audit.actualStart,
      audit.actualEnd,
      audit.status,
      audit.scope,
      audit.objective,
      audit.createdAt,
      audit.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    auditProgramId?: string | null;
    processId?: string | null;
    leadAuditorId?: string | null;
    title?: string;
    auditType?: string | null;
    plannedStart?: Date | null;
    plannedEnd?: Date | null;
    actualStart?: Date | null;
    actualEnd?: Date | null;
    status?: string;
    scope?: string | null;
    objective?: string | null;
  }): Promise<Audit> {
    const audit = await this.prisma.audit.update({
      where: { id },
      data: {
        ...(data.auditProgramId !== undefined && { auditProgramId: data.auditProgramId }),
        ...(data.processId !== undefined && { processId: data.processId }),
        ...(data.leadAuditorId !== undefined && { leadAuditorId: data.leadAuditorId }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.auditType !== undefined && { auditType: data.auditType }),
        ...(data.plannedStart !== undefined && { plannedStart: data.plannedStart }),
        ...(data.plannedEnd !== undefined && { plannedEnd: data.plannedEnd }),
        ...(data.actualStart !== undefined && { actualStart: data.actualStart }),
        ...(data.actualEnd !== undefined && { actualEnd: data.actualEnd }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.scope !== undefined && { scope: data.scope }),
        ...(data.objective !== undefined && { objective: data.objective }),
      },
      select: {
        id: true,
        organizationId: true,
        auditProgramId: true,
        processId: true,
        leadAuditorId: true,
        code: true,
        title: true,
        auditType: true,
        plannedStart: true,
        plannedEnd: true,
        actualStart: true,
        actualEnd: true,
        status: true,
        scope: true,
        objective: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (audit.organizationId !== organizationId) {
      throw new NotFoundException('AuditNotFound');
    }

    return new Audit(
      audit.id,
      audit.organizationId,
      audit.auditProgramId,
      audit.processId,
      audit.leadAuditorId,
      audit.code,
      audit.title,
      audit.auditType,
      audit.plannedStart,
      audit.plannedEnd,
      audit.actualStart,
      audit.actualEnd,
      audit.status,
      audit.scope,
      audit.objective,
      audit.createdAt,
      audit.updatedAt,
    );
  }

  async findDuplicate(organizationId: string, code: string, excludeId?: string): Promise<Audit | null> {
    const where: Record<string, unknown> = {
      organizationId,
      code,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const audit = await this.prisma.audit.findFirst({ where });

    if (!audit) {
      return null;
    }

    return new Audit(
      audit.id,
      audit.organizationId,
      audit.auditProgramId,
      audit.processId,
      audit.leadAuditorId,
      audit.code,
      audit.title,
      audit.auditType,
      audit.plannedStart,
      audit.plannedEnd,
      audit.actualStart,
      audit.actualEnd,
      audit.status,
      audit.scope,
      audit.objective,
      audit.createdAt,
      audit.updatedAt,
    );
  }
}
