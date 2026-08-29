import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditFinding, AuditFindingListItem } from '../entities/audit.entity';

@Injectable()
export class AuditFindingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<AuditFinding | null> {
    const finding = await this.prisma.auditFinding.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        auditId: true,
        checklistItemId: true,
        requirementId: true,
        findingType: true,
        title: true,
        description: true,
        evidence: true,
        severity: true,
        identifiedById: true,
        identifiedAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!finding) {
      return null;
    }

    return new AuditFinding(
      finding.id,
      finding.organizationId,
      finding.auditId,
      finding.checklistItemId,
      finding.requirementId,
      finding.findingType,
      finding.title,
      finding.description,
      finding.evidence,
      finding.severity,
      finding.identifiedById,
      finding.identifiedAt,
      finding.status,
      finding.createdAt,
      finding.updatedAt,
    );
  }

  async findByAudit(
    auditId: string,
    organizationId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: AuditFindingListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const skip = (page - 1) * pageSize;
    const [findings, total] = await Promise.all([
      this.prisma.auditFinding.findMany({
        where: { auditId, organizationId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          organizationId: true,
          auditId: true,
          checklistItemId: true,
          requirementId: true,
          findingType: true,
          title: true,
          description: true,
          evidence: true,
          severity: true,
          identifiedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          identifiedAt: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.auditFinding.count({ where: { auditId, organizationId } }),
    ]);

    const data = findings.map((f) => new AuditFindingListItem(
      f.id,
      f.auditId,
      f.checklistItemId,
      f.requirementId,
      f.findingType,
      f.title,
      f.description,
      f.evidence,
      f.severity,
      f.identifiedBy?.id ?? '',
      f.identifiedBy ? { id: f.identifiedBy.id, firstName: f.identifiedBy.firstName, lastName: f.identifiedBy.lastName } : null,
      f.identifiedAt,
      f.status,
      f.createdAt,
      f.updatedAt,
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
    auditId: string;
    checklistItemId?: string | null;
    requirementId?: string | null;
    findingType: string;
    title: string;
    description: string;
    evidence?: string | null;
    severity?: string | null;
    identifiedById: string;
  }): Promise<AuditFinding> {
    const finding = await this.prisma.auditFinding.create({
      data: {
        organizationId,
        auditId: data.auditId,
        checklistItemId: data.checklistItemId,
        requirementId: data.requirementId,
        findingType: data.findingType,
        title: data.title,
        description: data.description,
        evidence: data.evidence,
        severity: data.severity,
        identifiedById: data.identifiedById,
        status: 'OPEN',
      },
      select: {
        id: true,
        organizationId: true,
        auditId: true,
        checklistItemId: true,
        requirementId: true,
        findingType: true,
        title: true,
        description: true,
        evidence: true,
        severity: true,
        identifiedById: true,
        identifiedAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new AuditFinding(
      finding.id,
      finding.organizationId,
      finding.auditId,
      finding.checklistItemId,
      finding.requirementId,
      finding.findingType,
      finding.title,
      finding.description,
      finding.evidence,
      finding.severity,
      finding.identifiedById,
      finding.identifiedAt,
      finding.status,
      finding.createdAt,
      finding.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    title?: string;
    description?: string;
    evidence?: string | null;
    severity?: string | null;
    status?: string;
  }): Promise<AuditFinding> {
    const finding = await this.prisma.auditFinding.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.evidence !== undefined && { evidence: data.evidence }),
        ...(data.severity !== undefined && { severity: data.severity }),
        ...(data.status !== undefined && { status: data.status }),
      },
      select: {
        id: true,
        organizationId: true,
        auditId: true,
        checklistItemId: true,
        requirementId: true,
        findingType: true,
        title: true,
        description: true,
        evidence: true,
        severity: true,
        identifiedById: true,
        identifiedAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (finding.organizationId !== organizationId) {
      throw new NotFoundException('AuditFindingNotFound');
    }

    return new AuditFinding(
      finding.id,
      finding.organizationId,
      finding.auditId,
      finding.checklistItemId,
      finding.requirementId,
      finding.findingType,
      finding.title,
      finding.description,
      finding.evidence,
      finding.severity,
      finding.identifiedById,
      finding.identifiedAt,
      finding.status,
      finding.createdAt,
      finding.updatedAt,
    );
  }
}
