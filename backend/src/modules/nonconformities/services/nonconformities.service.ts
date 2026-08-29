import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { NonconformityRepository } from '../repositories/nonconformity.repository';
import { RootCauseAnalysisRepository } from '../repositories/root-cause.repository';
import { CorrectiveActionRepository } from '../repositories/corrective-action.repository';
import { CorrectiveActionVerificationRepository } from '../repositories/corrective-action-verification.repository';
import { PrismaService } from '../../../database/prisma.service';
import { CreateNonconformityDto, UpdateNonconformityDto } from '../dto/create-nonconformity.dto';
import { CreateRootCauseAnalysisDto, UpdateRootCauseAnalysisDto } from '../dto/create-root-cause.dto';
import { CreateCorrectiveActionDto, UpdateCorrectiveActionDto } from '../dto/create-corrective-action.dto';
import { CreateVerificationDto } from '../dto/create-verification.dto';
import { Nonconformity, NonconformityListItem, RootCauseAnalysis, CorrectiveAction, CorrectiveActionListItem, CorrectiveActionVerification } from '../entities/nonconformity.entity';
import { ConcurrencyService } from '../../../common/services/concurrency.service';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';

@Injectable()
export class NonconformitiesService {
  constructor(
    private readonly nonconformityRepository: NonconformityRepository,
    private readonly rootCauseAnalysisRepository: RootCauseAnalysisRepository,
    private readonly correctiveActionRepository: CorrectiveActionRepository,
    private readonly correctiveActionVerificationRepository: CorrectiveActionVerificationRepository,
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

  // ========== NONCONFORMITIES ==========

  async listNonconformities(
    organizationId: string,
    page: number,
    pageSize: number,
    search?: string,
    status?: string,
    severity?: string,
    auditId?: string,
    findingId?: string,
    processId?: string,
    responsibleId?: string,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<{ data: NonconformityListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    return this.nonconformityRepository.findListByOrganization(
      organizationId,
      page,
      pageSize,
      search,
      status,
      severity,
      auditId,
      findingId,
      processId,
      responsibleId,
      sortBy,
      sortOrder,
    );
  }

  async getNonconformity(organizationId: string, id: string): Promise<Nonconformity> {
    const nonconformity = await this.nonconformityRepository.findById(id, organizationId);
    if (!nonconformity) {
      throw new NotFoundException('NonconformityNotFound');
    }
    return nonconformity;
  }

  async createNonconformity(organizationId: string, userId: string, dto: CreateNonconformityDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Nonconformity> {
    const duplicate = await this.nonconformityRepository.findDuplicate(organizationId, dto.code);
    if (duplicate) {
      throw new ConflictException('DuplicateNonconformityCode');
    }

    if (dto.findingId) {
      const finding = await this.prisma.auditFinding.findFirst({
        where: { id: dto.findingId },
        select: { organizationId: true, auditId: true },
      });
      if (!finding || finding.organizationId !== organizationId) {
        throw new ForbiddenException('InvalidFinding');
      }
    }

    if (dto.auditId) {
      const audit = await this.prisma.audit.findFirst({
        where: { id: dto.auditId },
        select: { organizationId: true },
      });
      if (!audit || audit.organizationId !== organizationId) {
        throw new ForbiddenException('InvalidAudit');
      }
    }

    const nonconformity = await this.nonconformityRepository.create(organizationId, {
      auditId: dto.auditId,
      findingId: dto.findingId,
      processId: dto.processId,
      code: dto.code,
      title: dto.title,
      description: dto.description,
      severity: dto.severity,
      detectedAt: dto.detectedAt,
      responsibleId: dto.responsibleId,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'NONCONFORMITY_CREATED',
      entityType: 'Nonconformity',
      entityId: nonconformity.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return nonconformity;
  }

  async updateNonconformity(organizationId: string, id: string, userId: string, dto: UpdateNonconformityDto, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Nonconformity> {
    const existing = await this.nonconformityRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('NonconformityNotFound');
    }

    this.concurrencyService.validateIfMatch(existing, ifMatch);

    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.nonconformityRepository.findDuplicate(organizationId, dto.code, id);
      if (duplicate) {
        throw new ConflictException('DuplicateNonconformityCode');
      }
    }

    const nonconformity = await this.nonconformityRepository.update(id, organizationId, {
      title: dto.title,
      description: dto.description,
      severity: dto.severity,
      responsibleId: dto.responsibleId,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'NONCONFORMITY_UPDATED',
      entityType: 'Nonconformity',
      entityId: nonconformity.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return nonconformity;
  }

  async closeNonconformity(organizationId: string, id: string, userId: string, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Nonconformity> {
    const nonconformity = await this.nonconformityRepository.findById(id, organizationId);
    if (!nonconformity) {
      throw new NotFoundException('NonconformityNotFound');
    }

    this.concurrencyService.validateIfMatch(nonconformity, ifMatch);

    if (nonconformity.status === 'CLOSED') {
      throw new BadRequestException('InvalidStatusTransition');
    }

    const rootCause = await this.rootCauseAnalysisRepository.findByNonconformity(id, organizationId);
    if (!rootCause) {
      throw new BadRequestException('RootCauseRequired');
    }

    const actions = await this.prisma.correctiveAction.findMany({
      where: { nonconformityId: id, organizationId },
      select: { id: true },
    });

    for (const action of actions) {
      const verification = await this.prisma.correctiveActionVerification.findFirst({
        where: { correctiveActionId: action.id },
      });
      if (!verification) {
        throw new BadRequestException('AllActionsMustBeVerified');
      }
    }

    const updated = await this.nonconformityRepository.update(id, organizationId, {
      status: 'CLOSED',
      closedAt: new Date(),
      closedById: userId,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'NONCONFORMITY_CLOSED',
      entityType: 'Nonconformity',
      entityId: updated.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return updated;
  }

  // ========== ROOT CAUSE ANALYSIS ==========

  async getRootCauseAnalysis(organizationId: string, nonconformityId: string): Promise<RootCauseAnalysis> {
    const nonconformity = await this.nonconformityRepository.findById(nonconformityId, organizationId);
    if (!nonconformity) {
      throw new NotFoundException('NonconformityNotFound');
    }

    const analysis = await this.rootCauseAnalysisRepository.findByNonconformity(nonconformityId, organizationId);
    if (!analysis) {
      throw new NotFoundException('RootCauseAnalysisNotFound');
    }

    return analysis;
  }

  async createRootCauseAnalysis(organizationId: string, nonconformityId: string, userId: string, dto: CreateRootCauseAnalysisDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<RootCauseAnalysis> {
    const nonconformity = await this.nonconformityRepository.findById(nonconformityId, organizationId);
    if (!nonconformity) {
      throw new NotFoundException('NonconformityNotFound');
    }

    const existing = await this.rootCauseAnalysisRepository.findByNonconformity(nonconformityId, organizationId);
    if (existing) {
      throw new ConflictException('RootCauseAlreadyExists');
    }

    const analysis = await this.rootCauseAnalysisRepository.create(organizationId, {
      nonconformityId,
      methodology: dto.methodology,
      analysisData: dto.analysisData,
      conclusion: dto.conclusion,
      createdById: userId,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'ROOT_CAUSE_CREATED',
      entityType: 'RootCauseAnalysis',
      entityId: analysis.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return analysis;
  }

  async updateRootCauseAnalysis(organizationId: string, id: string, userId: string, dto: UpdateRootCauseAnalysisDto, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<RootCauseAnalysis> {
    const existing = await this.rootCauseAnalysisRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('RootCauseAnalysisNotFound');
    }

    this.concurrencyService.validateIfMatch(existing, ifMatch);

    const analysis = await this.rootCauseAnalysisRepository.update(id, organizationId, {
      methodology: dto.methodology,
      analysisData: dto.analysisData,
      conclusion: dto.conclusion,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'ROOT_CAUSE_UPDATED',
      entityType: 'RootCauseAnalysis',
      entityId: analysis.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return analysis;
  }

  // ========== CORRECTIVE ACTIONS ==========

  async listCorrectiveActions(
    organizationId: string,
    nonconformityId: string,
    page: number,
    pageSize: number,
    _status?: string,
    _responsibleId?: string,
  ): Promise<{ data: CorrectiveActionListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const nonconformity = await this.nonconformityRepository.findById(nonconformityId, organizationId);
    if (!nonconformity) {
      throw new NotFoundException('NonconformityNotFound');
    }

    return this.correctiveActionRepository.findByNonconformity(nonconformityId, organizationId, page, pageSize);
  }

  async getCorrectiveAction(organizationId: string, id: string): Promise<CorrectiveAction> {
    const action = await this.correctiveActionRepository.findById(id, organizationId);
    if (!action) {
      throw new NotFoundException('CorrectiveActionNotFound');
    }
    return action;
  }

  async createCorrectiveAction(organizationId: string, nonconformityId: string, userId: string, dto: CreateCorrectiveActionDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<CorrectiveAction> {
    const nonconformity = await this.nonconformityRepository.findById(nonconformityId, organizationId);
    if (!nonconformity) {
      throw new NotFoundException('NonconformityNotFound');
    }

    const duplicate = await this.correctiveActionRepository.findDuplicate(organizationId, dto.code);
    if (duplicate) {
      throw new ConflictException('DuplicateCorrectiveActionCode');
    }

    const action = await this.correctiveActionRepository.create(organizationId, {
      nonconformityId,
      code: dto.code,
      description: dto.description,
      responsibleId: dto.responsibleId,
      dueDate: dto.dueDate,
      effectivenessRequired: dto.effectivenessRequired,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'CORRECTIVE_ACTION_CREATED',
      entityType: 'CorrectiveAction',
      entityId: action.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return action;
  }

  async updateCorrectiveAction(organizationId: string, id: string, userId: string, dto: UpdateCorrectiveActionDto, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<CorrectiveAction> {
    const existing = await this.correctiveActionRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('CorrectiveActionNotFound');
    }

    this.concurrencyService.validateIfMatch(existing, ifMatch);

    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.correctiveActionRepository.findDuplicate(organizationId, dto.code, id);
      if (duplicate) {
        throw new ConflictException('DuplicateCorrectiveActionCode');
      }
    }

    const action = await this.correctiveActionRepository.update(id, organizationId, {
      description: dto.description,
      responsibleId: dto.responsibleId,
      dueDate: dto.dueDate,
      status: dto.status,
      completedAt: dto.status === 'COMPLETED' ? new Date() : existing.completedAt,
      effectivenessRequired: dto.effectivenessRequired,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'CORRECTIVE_ACTION_UPDATED',
      entityType: 'CorrectiveAction',
      entityId: action.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return action;
  }

  async completeCorrectiveAction(organizationId: string, id: string, userId: string, completedAt: Date, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<CorrectiveAction> {
    const action = await this.correctiveActionRepository.findById(id, organizationId);
    if (!action) {
      throw new NotFoundException('CorrectiveActionNotFound');
    }

    this.concurrencyService.validateIfMatch(action, ifMatch);

    if (action.status === 'COMPLETED') {
      throw new BadRequestException('InvalidStatusTransition');
    }

    const updated = await this.correctiveActionRepository.update(id, organizationId, {
      status: 'COMPLETED',
      completedAt,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'CORRECTIVE_ACTION_COMPLETED',
      entityType: 'CorrectiveAction',
      entityId: updated.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return updated;
  }

  async verifyCorrectiveAction(organizationId: string, id: string, userId: string, dto: CreateVerificationDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<CorrectiveActionVerification> {
    const action = await this.correctiveActionRepository.findById(id, organizationId);
    if (!action) {
      throw new NotFoundException('CorrectiveActionNotFound');
    }

    if (action.nonconformityId) {
      const nonconformity = await this.nonconformityRepository.findById(action.nonconformityId, organizationId);
      if (!nonconformity) {
        throw new NotFoundException('NonconformityNotFound');
      }
    }

    const verification = await this.correctiveActionVerificationRepository.create(organizationId, {
      correctiveActionId: id,
      verifierId: userId,
      effectivenessStatus: dto.effectivenessStatus,
      evidence: dto.evidence,
      comments: dto.comments,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'VERIFICATION_CREATED',
      entityType: 'CorrectiveActionVerification',
      entityId: verification.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return verification;
  }
}
