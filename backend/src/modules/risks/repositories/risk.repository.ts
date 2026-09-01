import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Risk, RiskListItem } from '../entities/risk.entity';
import { RiskStatus } from '@prisma/client';

@Injectable()
export class RiskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<Risk | null> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        processId: true,
        code: true,
        title: true,
        description: true,
        riskType: true,
        ownerId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!risk) {
      return null;
    }

    return new Risk(
      risk.id,
      risk.organizationId,
      risk.processId,
      risk.code,
      risk.title,
      risk.description,
      risk.riskType,
      risk.ownerId,
      risk.status,
      risk.createdAt,
      risk.updatedAt,
    );
  }

  async findListByOrganization(
    organizationId: string,
    page: number,
    pageSize: number,
    search?: string,
    status?: RiskStatus,
    riskType?: string,
    processId?: string,
    ownerId?: string,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<{ data: RiskListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
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

    if (riskType) {
      where.riskType = riskType;
    }

    if (processId) {
      where.processId = processId;
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    const orderBy: Record<string, string> = {};
    if (sortBy && ['createdAt', 'updatedAt', 'code'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [risks, total] = await Promise.all([
      this.prisma.risk.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          processId: true,
          code: true,
          title: true,
          description: true,
          riskType: true,
          ownerId: true,
          owner: {
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
      this.prisma.risk.count({ where }),
    ]);

    const data = risks.map((r) => new RiskListItem(
      r.id,
      r.processId,
      r.code,
      r.title,
      r.description,
      r.riskType,
      r.ownerId,
      r.owner ? { id: r.owner.id, firstName: r.owner.firstName, lastName: r.owner.lastName } : null,
      r.status,
      r.createdAt,
      r.updatedAt,
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
    processId?: string | null;
    code: string;
    title: string;
    description: string;
    riskType: string;
    ownerId?: string | null;
  }): Promise<Risk> {
    const risk = await this.prisma.risk.create({
      data: {
        organizationId,
        processId: data.processId,
        code: data.code,
        title: data.title,
        description: data.description,
        riskType: data.riskType,
        ownerId: data.ownerId,
        status: 'IDENTIFIED',
      },
      select: {
        id: true,
        organizationId: true,
        processId: true,
        code: true,
        title: true,
        description: true,
        riskType: true,
        ownerId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new Risk(
      risk.id,
      risk.organizationId,
      risk.processId,
      risk.code,
      risk.title,
      risk.description,
      risk.riskType,
      risk.ownerId,
      risk.status,
      risk.createdAt,
      risk.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    title?: string;
    description?: string;
    riskType?: string;
    ownerId?: string | null;
    status?: RiskStatus;
  }): Promise<Risk> {
    await this.prisma.risk.findFirstOrThrow({
      where: { id, organizationId },
    });

    const risk = await this.prisma.risk.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.riskType !== undefined && { riskType: data.riskType }),
        ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
        ...(data.status !== undefined && { status: data.status }),
      },
      select: {
        id: true,
        organizationId: true,
        processId: true,
        code: true,
        title: true,
        description: true,
        riskType: true,
        ownerId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new Risk(
      risk.id,
      risk.organizationId,
      risk.processId,
      risk.code,
      risk.title,
      risk.description,
      risk.riskType,
      risk.ownerId,
      risk.status,
      risk.createdAt,
      risk.updatedAt,
    );
  }

  async findDuplicate(organizationId: string, code: string, excludeId?: string): Promise<Risk | null> {
    const where: Record<string, unknown> = {
      organizationId,
      code,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const risk = await this.prisma.risk.findFirst({ where });

    if (!risk) {
      return null;
    }

    return new Risk(
      risk.id,
      risk.organizationId,
      risk.processId,
      risk.code,
      risk.title,
      risk.description,
      risk.riskType,
      risk.ownerId,
      risk.status,
      risk.createdAt,
      risk.updatedAt,
    );
  }
}
