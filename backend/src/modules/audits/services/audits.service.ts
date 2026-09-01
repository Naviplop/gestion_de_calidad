import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AuditProgramRepository } from '../repositories/audit-program.repository';
import { AuditRepository } from '../repositories/audit.repository';
import { AuditChecklistRepository } from '../repositories/audit-checklist.repository';
import { AuditChecklistItemRepository } from '../repositories/audit-checklist-item.repository';
import { AuditFindingRepository } from '../repositories/audit-finding.repository';
import { PrismaService } from '../../../database/prisma.service';
import { CreateAuditProgramDto, UpdateAuditProgramDto } from '../dto/create-audit-program.dto';
import { CreateAuditDto, UpdateAuditDto } from '../dto/create-audit.dto';
import { CreateAuditChecklistDto, CreateAuditChecklistItemDto, UpdateAuditChecklistItemDto } from '../dto/audit-checklist.dto';
import { AuditStatus } from '@prisma/client';
import { CreateAuditFindingDto, UpdateAuditFindingDto } from '../dto/audit-finding.dto';
import { AuditProgram, AuditProgramListItem, Audit, AuditListItem, AuditChecklist, AuditChecklistItem, AuditFinding, AuditFindingListItem } from '../entities/audit.entity';
import { ConcurrencyService } from '../../../common/services/concurrency.service';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';

@Injectable()
export class AuditsService {
  constructor(
    private readonly auditProgramRepository: AuditProgramRepository,
    private readonly auditRepository: AuditRepository,
    private readonly auditChecklistRepository: AuditChecklistRepository,
    private readonly auditChecklistItemRepository: AuditChecklistItemRepository,
    private readonly auditFindingRepository: AuditFindingRepository,
    private readonly prisma: PrismaService,
    private readonly concurrencyService: ConcurrencyService,
    private readonly auditLogService: AuditLogService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  private async recordAuditEvent(params: {
    organizationId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
    correlationId?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.recordEvent({
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        payload: params.payload,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        correlationId: params.correlationId,
      });
    } catch {
      // Audit logging failure must not break business operations
    }
  }

  // ========== AUDIT PROGRAMS ==========

  async listAuditPrograms(organizationId: string, page: number, pageSize: number, search?: string, status?: string, responsibleId?: string): Promise<{ data: AuditProgramListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    return this.auditProgramRepository.findListByOrganization(organizationId, page, pageSize, search, status, responsibleId);
  }

  async getAuditProgram(organizationId: string, id: string): Promise<AuditProgram> {
    const program = await this.auditProgramRepository.findById(id, organizationId);
    if (!program) {
      throw new NotFoundException('AuditProgramNotFound');
    }
    return program;
  }

  async createAuditProgram(organizationId: string, userId: string, dto: CreateAuditProgramDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<AuditProgram> {
    const duplicate = await this.auditProgramRepository.findDuplicate(organizationId, dto.name);
    if (duplicate) {
      throw new ConflictException('DuplicateAuditProgramName');
    }

    if (dto.periodEnd < dto.periodStart) {
      throw new BadRequestException('InvalidPeriod');
    }

    const program = await this.auditProgramRepository.create(organizationId, {
      name: dto.name,
      description: dto.description,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      responsibleId: dto.responsibleId,
      status: 'PLANNED',
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'AUDIT_PROGRAM_CREATED',
      entityType: 'AuditProgram',
      entityId: program.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return program;
  }

  async updateAuditProgram(organizationId: string, id: string, userId: string, dto: UpdateAuditProgramDto, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<AuditProgram> {
    const existing = await this.auditProgramRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('AuditProgramNotFound');
    }

    this.concurrencyService.validateIfMatch(existing, ifMatch);

    if (dto.periodStart && dto.periodEnd && dto.periodEnd < dto.periodStart) {
      throw new BadRequestException('InvalidPeriod');
    }

    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.auditProgramRepository.findDuplicate(organizationId, dto.name, id);
      if (duplicate) {
        throw new ConflictException('DuplicateAuditProgramName');
      }
    }

    const program = await this.auditProgramRepository.update(id, organizationId, {
      name: dto.name,
      description: dto.description,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      responsibleId: dto.responsibleId,
      status: dto.status,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'AUDIT_PROGRAM_UPDATED',
      entityType: 'AuditProgram',
      entityId: program.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return program;
  }

  // ========== AUDITS ==========

  async listAudits(organizationId: string, page: number, pageSize: number, search?: string, status?: AuditStatus, auditProgramId?: string, processId?: string, leadAuditorId?: string, sortBy?: string, sortOrder?: string): Promise<{ data: AuditListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    return this.auditRepository.findListByOrganization(organizationId, page, pageSize, search, status, auditProgramId, processId, leadAuditorId, sortBy, sortOrder);
  }

  async getAudit(organizationId: string, id: string): Promise<Audit> {
    const audit = await this.auditRepository.findById(id, organizationId);
    if (!audit) {
      throw new NotFoundException('AuditNotFound');
    }
    return audit;
  }

  async createAudit(organizationId: string, userId: string, dto: CreateAuditDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Audit> {
    const duplicate = await this.auditRepository.findDuplicate(organizationId, dto.code);
    if (duplicate) {
      throw new ConflictException('DuplicateAuditCode');
    }

    const audit = await this.auditRepository.create(organizationId, {
      auditProgramId: dto.auditProgramId,
      processId: dto.processId,
      leadAuditorId: dto.leadAuditorId,
      code: dto.code,
      title: dto.title,
      auditType: dto.auditType,
      plannedStart: dto.plannedStart,
      plannedEnd: dto.plannedEnd,
      scope: dto.scope,
      objective: dto.objective,
      status: 'PLANNED',
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'AUDIT_CREATED',
      entityType: 'Audit',
      entityId: audit.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return audit;
  }

  async updateAudit(organizationId: string, id: string, userId: string, dto: UpdateAuditDto, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Audit> {
    const existing = await this.auditRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('AuditNotFound');
    }

    this.concurrencyService.validateIfMatch(existing, ifMatch);

    const audit = await this.auditRepository.update(id, organizationId, {
      auditProgramId: dto.auditProgramId,
      processId: dto.processId,
      leadAuditorId: dto.leadAuditorId,
      title: dto.title,
      auditType: dto.auditType,
      plannedStart: dto.plannedStart,
      plannedEnd: dto.plannedEnd,
      actualStart: dto.actualStart,
      actualEnd: dto.actualEnd,
      scope: dto.scope,
      objective: dto.objective,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'AUDIT_UPDATED',
      entityType: 'Audit',
      entityId: audit.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return audit;
  }

  async startAudit(organizationId: string, id: string, userId: string, actualStart: Date, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Audit> {
    const audit = await this.auditRepository.findById(id, organizationId);
    if (!audit) {
      throw new NotFoundException('AuditNotFound');
    }

    this.concurrencyService.validateIfMatch(audit, ifMatch);

    if (audit.status !== 'PLANNED') {
      throw new BadRequestException('InvalidStatusTransition');
    }

    const updated = await this.auditRepository.update(id, organizationId, {
      status: 'IN_PROGRESS',
      actualStart,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'AUDIT_STARTED',
      entityType: 'Audit',
      entityId: updated.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return updated;
  }

  async completeAudit(organizationId: string, id: string, userId: string, actualEnd: Date, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Audit> {
    const audit = await this.auditRepository.findById(id, organizationId);
    if (!audit) {
      throw new NotFoundException('AuditNotFound');
    }

    this.concurrencyService.validateIfMatch(audit, ifMatch);

    if (audit.status !== 'IN_PROGRESS') {
      throw new BadRequestException('InvalidStatusTransition');
    }

    const updated = await this.auditRepository.update(id, organizationId, {
      status: 'COMPLETED',
      actualEnd,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'AUDIT_COMPLETED',
      entityType: 'Audit',
      entityId: updated.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return updated;
  }

  async cancelAudit(organizationId: string, id: string, userId: string, _reason?: string, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Audit> {
    const audit = await this.auditRepository.findById(id, organizationId);
    if (!audit) {
      throw new NotFoundException('AuditNotFound');
    }

    this.concurrencyService.validateIfMatch(audit, ifMatch);

    if (audit.status !== 'PLANNED' && audit.status !== 'IN_PROGRESS') {
      throw new BadRequestException('InvalidStatusTransition');
    }

    const updated = await this.auditRepository.update(id, organizationId, {
      status: 'CANCELLED',
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'AUDIT_CANCELLED',
      entityType: 'Audit',
      entityId: updated.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return updated;
  }

  // ========== CHECKLISTS ==========

  async listChecklists(organizationId: string, auditId: string): Promise<AuditChecklist[]> {
    const audit = await this.auditRepository.findById(auditId, organizationId);
    if (!audit) {
      throw new NotFoundException('AuditNotFound');
    }

    return this.auditChecklistRepository.findByAudit(auditId, organizationId);
  }

  async createChecklist(organizationId: string, auditId: string, userId: string, dto: CreateAuditChecklistDto): Promise<AuditChecklist> {
    const audit = await this.auditRepository.findById(auditId, organizationId);
    if (!audit) {
      throw new NotFoundException('AuditNotFound');
    }

    return this.auditChecklistRepository.create(organizationId, {
      auditId,
      name: dto.name,
    });
  }

  async getChecklist(organizationId: string, id: string): Promise<AuditChecklist & { items: AuditChecklistItem[] }> {
    const checklist = await this.auditChecklistRepository.findById(id, organizationId);
    if (!checklist) {
      throw new NotFoundException('AuditChecklistNotFound');
    }

    const items = await this.auditChecklistItemRepository.findByChecklist(id, organizationId);

    return {
      ...checklist,
      items,
    };
  }

  async createChecklistItem(organizationId: string, checklistId: string, userId: string, dto: CreateAuditChecklistItemDto): Promise<AuditChecklistItem> {
    const checklist = await this.auditChecklistRepository.findById(checklistId, organizationId);
    if (!checklist) {
      throw new NotFoundException('AuditChecklistNotFound');
    }

    return this.auditChecklistItemRepository.create(organizationId, {
      checklistId,
      requirementId: dto.requirementId,
      question: dto.question,
      sortOrder: dto.sortOrder,
    });
  }

  async updateChecklistItem(organizationId: string, id: string, userId: string, dto: UpdateAuditChecklistItemDto, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<AuditChecklistItem> {
    const existing = await this.auditChecklistItemRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('AuditChecklistItemNotFound');
    }

    this.concurrencyService.validateIfMatch(existing, ifMatch);

    const item = await this.auditChecklistItemRepository.update(id, organizationId, {
      response: dto.response,
      evidence: dto.evidence,
      comments: dto.comments,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'CHECKLIST_ITEM_UPDATED',
      entityType: 'AuditChecklistItem',
      entityId: item.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return item;
  }

  // ========== FINDINGS ==========

  async listFindings(organizationId: string, auditId: string, page: number, pageSize: number, findingType?: string, severity?: string, status?: string, requirementId?: string): Promise<{ data: AuditFindingListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const audit = await this.auditRepository.findById(auditId, organizationId);
    if (!audit) {
      throw new NotFoundException('AuditNotFound');
    }

    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = { auditId, organizationId };

    if (findingType) {
      where.findingType = findingType;
    }

    if (severity) {
      where.severity = severity;
    }

    if (status) {
      where.status = status;
    }

    if (requirementId) {
      where.requirementId = requirementId;
    }

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
          identifiedById: true,
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
      }) as Promise<Array<{
        id: string;
        organizationId: string;
        auditId: string;
        checklistItemId: string | null;
        requirementId: string | null;
        findingType: string;
        title: string;
        description: string;
        evidence: string | null;
        severity: string | null;
        identifiedById: string;
        identifiedBy: { id: string; firstName: string; lastName: string } | null;
        identifiedAt: Date;
        status: string;
        createdAt: Date;
        updatedAt: Date;
      }>>,
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
      f.identifiedById,
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

  async createFinding(organizationId: string, auditId: string, userId: string, dto: CreateAuditFindingDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<AuditFinding> {
    const audit = await this.auditRepository.findById(auditId, organizationId);
    if (!audit) {
      throw new NotFoundException('AuditNotFound');
    }

    const finding = await this.auditFindingRepository.create(organizationId, {
      auditId,
      checklistItemId: dto.checklistItemId,
      requirementId: dto.requirementId,
      findingType: dto.findingType,
      title: dto.title,
      description: dto.description,
      evidence: dto.evidence,
      severity: dto.severity,
      identifiedById: userId,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'FINDING_CREATED',
      entityType: 'AuditFinding',
      entityId: finding.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return finding;
  }

  async updateFinding(organizationId: string, id: string, userId: string, dto: UpdateAuditFindingDto, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<AuditFinding> {
    const existing = await this.auditFindingRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('AuditFindingNotFound');
    }

    this.concurrencyService.validateIfMatch(existing, ifMatch);

    const finding = await this.auditFindingRepository.update(id, organizationId, {
      title: dto.title,
      description: dto.description,
      evidence: dto.evidence,
      severity: dto.severity,
      status: dto.status,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'FINDING_UPDATED',
      entityType: 'AuditFinding',
      entityId: finding.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return finding;
  }
}
