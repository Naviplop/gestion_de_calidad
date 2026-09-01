import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { RiskRepository } from '../repositories/risk.repository';
import { RiskAssessmentRepository } from '../repositories/risk-assessment.repository';
import { RiskControlRepository } from '../repositories/risk-control.repository';
import { RiskTreatmentRepository } from '../repositories/risk-treatment.repository';
import { PrismaService } from '../../../database/prisma.service';
import { CreateRiskDto, UpdateRiskDto } from '../dto/create-risk.dto';
import { CreateRiskAssessmentDto, UpdateRiskAssessmentDto } from '../dto/risk-assessment.dto';
import { CreateRiskControlDto, UpdateRiskControlDto } from '../dto/risk-control.dto';
import { CreateRiskTreatmentDto, UpdateRiskTreatmentDto } from '../dto/risk-treatment.dto';
import { Risk, RiskListItem } from '../entities/risk.entity';
import { RiskAssessment } from '../entities/risk-assessment.entity';
import { RiskControl } from '../entities/risk-control.entity';
import { RiskTreatment } from '../entities/risk-treatment.entity';
import { ConcurrencyService } from '../../../common/services/concurrency.service';
import { RiskStatus } from '@prisma/client';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';

@Injectable()
export class RisksService {
  constructor(
    private readonly riskRepository: RiskRepository,
    private readonly riskAssessmentRepository: RiskAssessmentRepository,
    private readonly riskControlRepository: RiskControlRepository,
    private readonly riskTreatmentRepository: RiskTreatmentRepository,
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

  // ========== RISKS ==========

  async listRisks(
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
    return this.riskRepository.findListByOrganization(
      organizationId,
      page,
      pageSize,
      search,
      status,
      riskType,
      processId,
      ownerId,
      sortBy,
      sortOrder,
    );
  }

  async getRisk(organizationId: string, id: string): Promise<Risk> {
    const risk = await this.riskRepository.findById(id, organizationId);
    if (!risk) {
      throw new NotFoundException('RiskNotFound');
    }
    return risk;
  }

  async createRisk(organizationId: string, userId: string, dto: CreateRiskDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Risk> {
    const duplicate = await this.riskRepository.findDuplicate(organizationId, dto.code);
    if (duplicate) {
      throw new ConflictException('DuplicateRiskCode');
    }

    if (dto.processId) {
      const process = await this.prisma.process.findFirst({
        where: { id: dto.processId },
        select: { organizationId: true },
      });
      if (!process || process.organizationId !== organizationId) {
        throw new ForbiddenException('InvalidProcess');
      }
    }

    if (dto.ownerId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.ownerId },
        select: { organizationId: true },
      });
      if (!user || user.organizationId !== organizationId) {
        throw new ForbiddenException('InvalidOwner');
      }
    }

    const risk = await this.riskRepository.create(organizationId, {
      processId: dto.processId,
      code: dto.code,
      title: dto.title,
      description: dto.description,
      riskType: dto.riskType,
      ownerId: dto.ownerId,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'RISK_CREATED',
      entityType: 'Risk',
      entityId: risk.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return risk;
  }

  async updateRisk(organizationId: string, id: string, userId: string, dto: UpdateRiskDto, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Risk> {
    const existing = await this.riskRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('RiskNotFound');
    }

    this.concurrencyService.validateIfMatch(existing, ifMatch);

    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.riskRepository.findDuplicate(organizationId, dto.code, id);
      if (duplicate) {
        throw new ConflictException('DuplicateRiskCode');
      }
    }

    if (dto.processId) {
      const process = await this.prisma.process.findFirst({
        where: { id: dto.processId },
        select: { organizationId: true },
      });
      if (!process || process.organizationId !== organizationId) {
        throw new ForbiddenException('InvalidProcess');
      }
    }

    if (dto.ownerId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.ownerId },
        select: { organizationId: true },
      });
      if (!user || user.organizationId !== organizationId) {
        throw new ForbiddenException('InvalidOwner');
      }
    }

    const risk = await this.riskRepository.update(id, organizationId, {
      title: dto.title,
      description: dto.description,
      riskType: dto.riskType,
      ownerId: dto.ownerId,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'RISK_UPDATED',
      entityType: 'Risk',
      entityId: risk.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return risk;
  }

  // ========== ASSESSMENTS ==========

  async listRiskAssessments(
    organizationId: string,
    riskId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: RiskAssessment[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const risk = await this.riskRepository.findById(riskId, organizationId);
    if (!risk) {
      throw new NotFoundException('RiskNotFound');
    }

    return this.riskAssessmentRepository.findListByRisk(riskId, organizationId, page, pageSize);
  }

  async getRiskAssessment(organizationId: string, riskId: string, id: string): Promise<RiskAssessment> {
    const risk = await this.riskRepository.findById(riskId, organizationId);
    if (!risk) {
      throw new NotFoundException('RiskNotFound');
    }

    const assessment = await this.riskAssessmentRepository.findById(id, organizationId);
    if (!assessment || assessment.riskId !== riskId) {
      throw new NotFoundException('RiskAssessmentNotFound');
    }

    return assessment;
  }

  async createRiskAssessment(organizationId: string, riskId: string, userId: string, dto: CreateRiskAssessmentDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<RiskAssessment> {
    const risk = await this.riskRepository.findById(riskId, organizationId);
    if (!risk) {
      throw new NotFoundException('RiskNotFound');
    }

    const assessment = await this.riskAssessmentRepository.create(organizationId, {
      riskId,
      probability: dto.probability,
      impact: dto.impact,
      calculationData: dto.calculationData || {},
      assessedById: userId,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'RISK_ASSESSED',
      entityType: 'RiskAssessment',
      entityId: assessment.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return assessment;
  }

  async updateRiskAssessment(organizationId: string, riskId: string, id: string, userId: string, dto: UpdateRiskAssessmentDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<RiskAssessment> {
    const risk = await this.riskRepository.findById(riskId, organizationId);
    if (!risk) {
      throw new NotFoundException('RiskNotFound');
    }

    const existing = await this.riskAssessmentRepository.findById(id, organizationId);
    if (!existing || existing.riskId !== riskId) {
      throw new NotFoundException('RiskAssessmentNotFound');
    }

    const assessment = await this.riskAssessmentRepository.update(id, organizationId, {
      probability: dto.probability,
      impact: dto.impact,
      calculationData: dto.calculationData || existing.calculationData,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'RISK_ASSESSED',
      entityType: 'RiskAssessment',
      entityId: assessment.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return assessment;
  }

  // ========== CONTROLS ==========

  async listRiskControls(
    organizationId: string,
    riskId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: RiskControl[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const risk = await this.riskRepository.findById(riskId, organizationId);
    if (!risk) {
      throw new NotFoundException('RiskNotFound');
    }

    const controls = await this.riskControlRepository.findByRisk(riskId, organizationId);
    const total = controls.length;
    const skip = (page - 1) * pageSize;
    const data = controls.slice(skip, skip + pageSize);

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

  async createRiskControl(organizationId: string, riskId: string, userId: string, dto: CreateRiskControlDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<RiskControl> {
    const risk = await this.riskRepository.findById(riskId, organizationId);
    if (!risk) {
      throw new NotFoundException('RiskNotFound');
    }

    const control = await this.riskControlRepository.create(organizationId, {
      riskId,
      userId,
      description: dto.description,
      controlType: dto.controlType,
      effectiveness: dto.effectiveness || null,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'RISK_CONTROL_CREATED',
      entityType: 'RiskControl',
      entityId: control.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return control;
  }

  async updateRiskControl(organizationId: string, riskId: string, id: string, userId: string, dto: UpdateRiskControlDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<RiskControl> {
    const risk = await this.riskRepository.findById(riskId, organizationId);
    if (!risk) {
      throw new NotFoundException('RiskNotFound');
    }

    const existing = await this.riskControlRepository.findById(id, organizationId);
    if (!existing || existing.riskId !== riskId) {
      throw new NotFoundException('RiskControlNotFound');
    }

    const control = await this.riskControlRepository.update(id, organizationId, {
      description: dto.description,
      controlType: dto.controlType,
      effectiveness: dto.effectiveness,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'RISK_CONTROL_UPDATED',
      entityType: 'RiskControl',
      entityId: control.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return control;
  }

  // ========== TREATMENTS ==========

  async listRiskTreatments(
    organizationId: string,
    riskId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: RiskTreatment[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const risk = await this.riskRepository.findById(riskId, organizationId);
    if (!risk) {
      throw new NotFoundException('RiskNotFound');
    }

    const treatments = await this.riskTreatmentRepository.findByRisk(riskId, organizationId);
    const total = treatments.length;
    const skip = (page - 1) * pageSize;
    const data = treatments.slice(skip, skip + pageSize);

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

  async getRiskTreatment(organizationId: string, riskId: string, id: string): Promise<RiskTreatment> {
    const risk = await this.riskRepository.findById(riskId, organizationId);
    if (!risk) {
      throw new NotFoundException('RiskNotFound');
    }

    const treatment = await this.riskTreatmentRepository.findById(id, organizationId);
    if (!treatment || treatment.riskId !== riskId) {
      throw new NotFoundException('RiskTreatmentNotFound');
    }

    return treatment;
  }

  async createRiskTreatment(organizationId: string, riskId: string, userId: string, dto: CreateRiskTreatmentDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<RiskTreatment> {
    const risk = await this.riskRepository.findById(riskId, organizationId);
    if (!risk) {
      throw new NotFoundException('RiskNotFound');
    }

    if (dto.responsibleId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.responsibleId },
        select: { organizationId: true },
      });
      if (!user || user.organizationId !== organizationId) {
        throw new ForbiddenException('InvalidResponsible');
      }
    }

    const treatment = await this.riskTreatmentRepository.create(organizationId, {
      riskId,
      strategy: dto.strategy,
      description: dto.description,
      responsibleId: dto.responsibleId || null,
      dueDate: dto.dueDate || null,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'RISK_TREATMENT_CREATED',
      entityType: 'RiskTreatment',
      entityId: treatment.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return treatment;
  }

  async updateRiskTreatment(organizationId: string, riskId: string, id: string, userId: string, dto: UpdateRiskTreatmentDto, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<RiskTreatment> {
    const risk = await this.riskRepository.findById(riskId, organizationId);
    if (!risk) {
      throw new NotFoundException('RiskNotFound');
    }

    const existing = await this.riskTreatmentRepository.findById(id, organizationId);
    if (!existing || existing.riskId !== riskId) {
      throw new NotFoundException('RiskTreatmentNotFound');
    }

    this.concurrencyService.validateIfMatch(existing, ifMatch);

    if (dto.responsibleId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.responsibleId },
        select: { organizationId: true },
      });
      if (!user || user.organizationId !== organizationId) {
        throw new ForbiddenException('InvalidResponsible');
      }
    }

    const treatment = await this.riskTreatmentRepository.update(id, organizationId, {
      strategy: dto.strategy,
      description: dto.description,
      responsibleId: dto.responsibleId,
      dueDate: dto.dueDate,
      status: dto.status,
      completedAt: dto.completedAt,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'RISK_TREATMENT_UPDATED',
      entityType: 'RiskTreatment',
      entityId: treatment.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return treatment;
  }

  async findTreatmentById(organizationId: string, id: string): Promise<RiskTreatment | null> {
    return this.riskTreatmentRepository.findById(id, organizationId);
  }
}
