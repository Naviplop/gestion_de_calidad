import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditChecklist } from '../entities/audit.entity';

@Injectable()
export class AuditChecklistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<AuditChecklist | null> {
    const checklist = await this.prisma.auditChecklist.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        auditId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!checklist) {
      return null;
    }

    return new AuditChecklist(
      checklist.id,
      checklist.organizationId,
      checklist.auditId,
      checklist.name,
      checklist.createdAt,
      checklist.updatedAt,
    );
  }

  async findByAudit(auditId: string, organizationId: string): Promise<AuditChecklist[]> {
    const checklists = await this.prisma.auditChecklist.findMany({
      where: { auditId, organizationId },
      select: {
        id: true,
        organizationId: true,
        auditId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return checklists.map((c) => new AuditChecklist(
      c.id,
      c.organizationId,
      c.auditId,
      c.name,
      c.createdAt,
      c.updatedAt,
    ));
  }

  async create(organizationId: string, data: {
    auditId: string;
    name: string;
  }): Promise<AuditChecklist> {
    const checklist = await this.prisma.auditChecklist.create({
      data: {
        organizationId,
        auditId: data.auditId,
        name: data.name,
      },
      select: {
        id: true,
        organizationId: true,
        auditId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new AuditChecklist(
      checklist.id,
      checklist.organizationId,
      checklist.auditId,
      checklist.name,
      checklist.createdAt,
      checklist.updatedAt,
    );
  }
}
