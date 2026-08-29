import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditChecklistItem } from '../entities/audit.entity';

@Injectable()
export class AuditChecklistItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<AuditChecklistItem | null> {
    const item = await this.prisma.auditChecklistItem.findFirst({
      where: { id, checklist: { organizationId } },
      select: {
        id: true,
        checklistId: true,
        requirementId: true,
        question: true,
        response: true,
        evidence: true,
        comments: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!item) {
      return null;
    }

    return new AuditChecklistItem(
      item.id,
      item.checklistId,
      item.requirementId,
      item.question,
      item.response,
      item.evidence,
      item.comments,
      item.sortOrder,
      item.createdAt,
      item.updatedAt,
    );
  }

  async findByChecklist(checklistId: string, organizationId: string): Promise<AuditChecklistItem[]> {
    const items = await this.prisma.auditChecklistItem.findMany({
      where: { checklistId, checklist: { organizationId } },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        checklistId: true,
        requirementId: true,
        question: true,
        response: true,
        evidence: true,
        comments: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return items.map((item) => new AuditChecklistItem(
      item.id,
      item.checklistId,
      item.requirementId,
      item.question,
      item.response,
      item.evidence,
      item.comments,
      item.sortOrder,
      item.createdAt,
      item.updatedAt,
    ));
  }

  async create(organizationId: string, data: {
    checklistId: string;
    requirementId?: string | null;
    question: string;
    sortOrder?: number;
  }): Promise<AuditChecklistItem> {
    const item = await this.prisma.auditChecklistItem.create({
      data: {
        checklistId: data.checklistId,
        requirementId: data.requirementId,
        question: data.question,
        sortOrder: data.sortOrder || 0,
      },
      select: {
        id: true,
        checklistId: true,
        requirementId: true,
        question: true,
        response: true,
        evidence: true,
        comments: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new AuditChecklistItem(
      item.id,
      item.checklistId,
      item.requirementId,
      item.question,
      item.response,
      item.evidence,
      item.comments,
      item.sortOrder,
      item.createdAt,
      item.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    response?: string | null;
    evidence?: string | null;
    comments?: string | null;
  }): Promise<AuditChecklistItem> {
    const item = await this.prisma.auditChecklistItem.update({
      where: { id },
      data: {
        ...(data.response !== undefined && { response: data.response }),
        ...(data.evidence !== undefined && { evidence: data.evidence }),
        ...(data.comments !== undefined && { comments: data.comments }),
      },
      select: {
        id: true,
        checklistId: true,
        requirementId: true,
        question: true,
        response: true,
        evidence: true,
        comments: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const itemWithOrg = await this.prisma.auditChecklistItem.findFirst({
      where: { id },
      select: { checklist: { select: { organizationId: true } } },
    });

    if (!itemWithOrg || !itemWithOrg.checklist || itemWithOrg.checklist.organizationId !== organizationId) {
      throw new NotFoundException('AuditChecklistItemNotFound');
    }

    return new AuditChecklistItem(
      item.id,
      item.checklistId,
      item.requirementId,
      item.question,
      item.response,
      item.evidence,
      item.comments,
      item.sortOrder,
      item.createdAt,
      item.updatedAt,
    );
  }
}
