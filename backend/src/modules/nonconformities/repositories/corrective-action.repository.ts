import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CorrectiveAction, CorrectiveActionListItem } from '../entities/nonconformity.entity';
import { CorrectiveActionStatus } from '@prisma/client';

@Injectable()
export class CorrectiveActionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<CorrectiveAction | null> {
    const action = await this.prisma.correctiveAction.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        nonconformityId: true,
        code: true,
        description: true,
        responsibleId: true,
        dueDate: true,
        completedAt: true,
        status: true,
        effectivenessRequired: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!action) {
      return null;
    }

    return new CorrectiveAction(
      action.id,
      action.organizationId,
      action.nonconformityId,
      action.code,
      action.description,
      action.responsibleId,
      action.dueDate,
      action.completedAt,
      action.status,
      action.effectivenessRequired,
      action.createdAt,
      action.updatedAt,
    );
  }

  async findByNonconformity(
    nonconformityId: string,
    organizationId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: CorrectiveActionListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const skip = (page - 1) * pageSize;
    const [actions, total] = await Promise.all([
      this.prisma.correctiveAction.findMany({
        where: { nonconformityId, organizationId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          organizationId: true,
          nonconformityId: true,
          code: true,
          description: true,
          responsibleId: true,
          responsible: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          dueDate: true,
          completedAt: true,
          status: true,
          effectivenessRequired: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.correctiveAction.count({ where: { nonconformityId, organizationId } }),
    ]);

    const data = actions.map((a) => new CorrectiveActionListItem(
      a.id,
      a.nonconformityId,
      a.code,
      a.description,
      a.responsibleId,
      a.responsible ? { id: a.responsible.id, firstName: a.responsible.firstName, lastName: a.responsible.lastName } : null,
      a.dueDate,
      a.completedAt,
      a.status,
      a.effectivenessRequired,
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
    nonconformityId: string;
    code: string;
    description: string;
    responsibleId: string;
    dueDate?: Date | null;
    effectivenessRequired?: boolean;
  }): Promise<CorrectiveAction> {
    const action = await this.prisma.correctiveAction.create({
      data: {
        organizationId,
        nonconformityId: data.nonconformityId,
        code: data.code,
        description: data.description,
        responsibleId: data.responsibleId,
        dueDate: data.dueDate,
        effectivenessRequired: data.effectivenessRequired ?? true,
        status: 'PENDING',
      },
      select: {
        id: true,
        organizationId: true,
        nonconformityId: true,
        code: true,
        description: true,
        responsibleId: true,
        dueDate: true,
        completedAt: true,
        status: true,
        effectivenessRequired: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new CorrectiveAction(
      action.id,
      action.organizationId,
      action.nonconformityId,
      action.code,
      action.description,
      action.responsibleId,
      action.dueDate,
      action.completedAt,
      action.status,
      action.effectivenessRequired,
      action.createdAt,
      action.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    description?: string;
    responsibleId?: string;
    dueDate?: Date | null;
    status?: CorrectiveActionStatus;
    completedAt?: Date | null;
    effectivenessRequired?: boolean;
  }): Promise<CorrectiveAction> {
    await this.prisma.correctiveAction.findFirstOrThrow({
      where: { id, organizationId },
    });

    const action = await this.prisma.correctiveAction.update({
      where: { id },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.responsibleId !== undefined && { responsibleId: data.responsibleId }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
        ...(data.effectivenessRequired !== undefined && { effectivenessRequired: data.effectivenessRequired }),
      },
      select: {
        id: true,
        organizationId: true,
        nonconformityId: true,
        code: true,
        description: true,
        responsibleId: true,
        dueDate: true,
        completedAt: true,
        status: true,
        effectivenessRequired: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new CorrectiveAction(
      action.id,
      action.organizationId,
      action.nonconformityId,
      action.code,
      action.description,
      action.responsibleId,
      action.dueDate,
      action.completedAt,
      action.status,
      action.effectivenessRequired,
      action.createdAt,
      action.updatedAt,
    );
  }

  async findDuplicate(organizationId: string, code: string, excludeId?: string): Promise<CorrectiveAction | null> {
    const where: Record<string, unknown> = {
      organizationId,
      code,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const action = await this.prisma.correctiveAction.findFirst({ where });

    if (!action) {
      return null;
    }

    return new CorrectiveAction(
      action.id,
      action.organizationId,
      action.nonconformityId,
      action.code,
      action.description,
      action.responsibleId,
      action.dueDate,
      action.completedAt,
      action.status,
      action.effectivenessRequired,
      action.createdAt,
      action.updatedAt,
    );
  }
}
