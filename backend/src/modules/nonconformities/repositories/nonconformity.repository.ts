import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Nonconformity, NonconformityListItem } from '../entities/nonconformity.entity';
import { NonconformityStatus } from '@prisma/client';

@Injectable()
export class NonconformityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<Nonconformity | null> {
    const nonconformity = await this.prisma.nonconformity.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        auditId: true,
        findingId: true,
        processId: true,
        code: true,
        title: true,
        description: true,
        severity: true,
        detectedAt: true,
        responsibleId: true,
        status: true,
        closedAt: true,
        closedById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!nonconformity) {
      return null;
    }

    return new Nonconformity(
      nonconformity.id,
      nonconformity.organizationId,
      nonconformity.auditId,
      nonconformity.findingId,
      nonconformity.processId,
      nonconformity.code,
      nonconformity.title,
      nonconformity.description,
      nonconformity.severity,
      nonconformity.detectedAt,
      nonconformity.responsibleId,
      nonconformity.status,
      nonconformity.closedAt,
      nonconformity.closedById,
      nonconformity.createdAt,
      nonconformity.updatedAt,
    );
  }

  async findListByOrganization(
    organizationId: string,
    page: number,
    pageSize: number,
    search?: string,
    status?: NonconformityStatus,
    severity?: string,
    auditId?: string,
    findingId?: string,
    processId?: string,
    responsibleId?: string,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<{ data: NonconformityListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
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

    if (severity) {
      where.severity = severity;
    }

    if (auditId) {
      where.auditId = auditId;
    }

    if (findingId) {
      where.findingId = findingId;
    }

    if (processId) {
      where.processId = processId;
    }

    if (responsibleId) {
      where.responsibleId = responsibleId;
    }

    const orderBy: Record<string, string> = {};
    if (sortBy && ['createdAt', 'detectedAt', 'code'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [nonconformities, total] = await Promise.all([
      this.prisma.nonconformity.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          auditId: true,
          findingId: true,
          processId: true,
          code: true,
          title: true,
          description: true,
          severity: true,
          detectedAt: true,
          responsibleId: true,
          responsible: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          status: true,
          closedAt: true,
          closedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.nonconformity.count({ where }),
    ]);

    const data = nonconformities.map((n) => new NonconformityListItem(
      n.id,
      n.auditId,
      n.findingId,
      n.processId,
      n.code,
      n.title,
      n.description,
      n.severity,
      n.detectedAt,
      n.responsibleId,
      n.responsible ? { id: n.responsible.id, firstName: n.responsible.firstName, lastName: n.responsible.lastName } : null,
      n.status,
      n.closedAt,
      n.closedBy ? { id: n.closedBy.id, firstName: n.closedBy.firstName, lastName: n.closedBy.lastName } : null,
      n.createdAt,
      n.updatedAt,
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
    auditId?: string | null;
    findingId?: string | null;
    processId?: string | null;
    code: string;
    title: string;
    description: string;
    severity: string;
    detectedAt: Date;
    responsibleId?: string | null;
  }): Promise<Nonconformity> {
    const nonconformity = await this.prisma.nonconformity.create({
      data: {
        organizationId,
        auditId: data.auditId,
        findingId: data.findingId,
        processId: data.processId,
        code: data.code,
        title: data.title,
        description: data.description,
        severity: data.severity,
        detectedAt: data.detectedAt,
        responsibleId: data.responsibleId,
        status: 'OPEN',
      },
      select: {
        id: true,
        organizationId: true,
        auditId: true,
        findingId: true,
        processId: true,
        code: true,
        title: true,
        description: true,
        severity: true,
        detectedAt: true,
        responsibleId: true,
        status: true,
        closedAt: true,
        closedById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new Nonconformity(
      nonconformity.id,
      nonconformity.organizationId,
      nonconformity.auditId,
      nonconformity.findingId,
      nonconformity.processId,
      nonconformity.code,
      nonconformity.title,
      nonconformity.description,
      nonconformity.severity,
      nonconformity.detectedAt,
      nonconformity.responsibleId,
      nonconformity.status,
      nonconformity.closedAt,
      nonconformity.closedById,
      nonconformity.createdAt,
      nonconformity.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    title?: string;
    description?: string;
    severity?: string;
    responsibleId?: string | null;
    status?: NonconformityStatus;
    closedAt?: Date | null;
    closedById?: string | null;
  }): Promise<Nonconformity> {
    await this.prisma.nonconformity.findFirstOrThrow({
      where: { id, organizationId },
    });

    const nonconformity = await this.prisma.nonconformity.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.severity !== undefined && { severity: data.severity }),
        ...(data.responsibleId !== undefined && { responsibleId: data.responsibleId }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.closedAt !== undefined && { closedAt: data.closedAt }),
        ...(data.closedById !== undefined && { closedById: data.closedById }),
      },
      select: {
        id: true,
        organizationId: true,
        auditId: true,
        findingId: true,
        processId: true,
        code: true,
        title: true,
        description: true,
        severity: true,
        detectedAt: true,
        responsibleId: true,
        status: true,
        closedAt: true,
        closedById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new Nonconformity(
      nonconformity.id,
      nonconformity.organizationId,
      nonconformity.auditId,
      nonconformity.findingId,
      nonconformity.processId,
      nonconformity.code,
      nonconformity.title,
      nonconformity.description,
      nonconformity.severity,
      nonconformity.detectedAt,
      nonconformity.responsibleId,
      nonconformity.status,
      nonconformity.closedAt,
      nonconformity.closedById,
      nonconformity.createdAt,
      nonconformity.updatedAt,
    );
  }

  async findDuplicate(organizationId: string, code: string, excludeId?: string): Promise<Nonconformity | null> {
    const where: Record<string, unknown> = {
      organizationId,
      code,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const nonconformity = await this.prisma.nonconformity.findFirst({ where });

    if (!nonconformity) {
      return null;
    }

    return new Nonconformity(
      nonconformity.id,
      nonconformity.organizationId,
      nonconformity.auditId,
      nonconformity.findingId,
      nonconformity.processId,
      nonconformity.code,
      nonconformity.title,
      nonconformity.description,
      nonconformity.severity,
      nonconformity.detectedAt,
      nonconformity.responsibleId,
      nonconformity.status,
      nonconformity.closedAt,
      nonconformity.closedById,
      nonconformity.createdAt,
      nonconformity.updatedAt,
    );
  }
}
