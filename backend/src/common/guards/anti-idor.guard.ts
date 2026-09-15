import { Injectable, ExecutionContext, ForbiddenException, BadRequestException, SetMetadata, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { SecurityEventService } from '../../modules/security-events/services/security-event.service';
import { Request } from 'express';

export const RESOURCE_OWNERSHIP_KEY = 'resourceOwnership';

export interface ResourceOwnershipMetadata {
  resourceType: 'user' | 'role' | 'organization' | 'department' | 'process' | 'document' | 'documentVersion' | 'documentDistribution' | 'auditProgram' | 'audit' | 'auditChecklist' | 'auditChecklistItem' | 'auditFinding' | 'nonconformity' | 'correctiveAction' | 'rootCauseAnalysis' | 'risk' | 'riskAssessment' | 'riskControl' | 'riskTreatment' | 'fileAsset';
  resourceIdParam: string;
}

export const RequireResourceOwnership = (metadata: ResourceOwnershipMetadata) =>
  SetMetadata(RESOURCE_OWNERSHIP_KEY, metadata);

@Injectable()
export class AntiIdorGuard {
  private readonly logger = new Logger(AntiIdorGuard.name);
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { organizationContext?: { organizationId: string }; organizationId?: string; userId?: string }>();
    const metadata = this.reflector.get<ResourceOwnershipMetadata>(
      RESOURCE_OWNERSHIP_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return true;
    }

    const currentOrganizationId = request.organizationContext?.organizationId || request.organizationId;
    if (!currentOrganizationId) {
      throw new ForbiddenException('Forbidden');
    }

    const rawResourceId = request.params[metadata.resourceIdParam];
    const resourceId = Array.isArray(rawResourceId) ? rawResourceId[0] : rawResourceId;
    if (!resourceId) {
      throw new ForbiddenException('Forbidden');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(resourceId)) {
      throw new BadRequestException('Invalid resource ID format');
    }

    let resourceOrganizationId: string | null = null;

    switch (metadata.resourceType) {
      case 'user': {
        const user = await this.prisma.user.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!user || user.organizationId !== currentOrganizationId) {
          resourceOrganizationId = user?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = user.organizationId;
        break;
      }
      case 'role': {
        const role = await this.prisma.role.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!role || role.organizationId !== currentOrganizationId) {
          resourceOrganizationId = role?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = role.organizationId;
        break;
      }
      case 'organization': {
        if (resourceId !== currentOrganizationId) {
          resourceOrganizationId = resourceId;
          break;
        }
        resourceOrganizationId = currentOrganizationId;
        break;
      }
      case 'department': {
        const department = await this.prisma.department.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!department || department.organizationId !== currentOrganizationId) {
          resourceOrganizationId = department?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = department.organizationId;
        break;
      }
      case 'process': {
        const process = await this.prisma.process.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!process || process.organizationId !== currentOrganizationId) {
          resourceOrganizationId = process?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = process.organizationId;
        break;
      }
      case 'document': {
        const document = await this.prisma.document.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!document || document.organizationId !== currentOrganizationId) {
          resourceOrganizationId = document?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = document.organizationId;
        break;
      }
      case 'documentVersion': {
        const version = await this.prisma.documentVersion.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!version || version.organizationId !== currentOrganizationId) {
          resourceOrganizationId = version?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = version.organizationId;
        break;
      }
      case 'documentDistribution': {
        const distribution = await this.prisma.documentDistribution.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!distribution || distribution.organizationId !== currentOrganizationId) {
          resourceOrganizationId = distribution?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = distribution.organizationId;
        break;
      }
      case 'auditProgram': {
        const program = await this.prisma.auditProgram.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!program || program.organizationId !== currentOrganizationId) {
          resourceOrganizationId = program?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = program.organizationId;
        break;
      }
      case 'audit': {
        const audit = await this.prisma.audit.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!audit || audit.organizationId !== currentOrganizationId) {
          resourceOrganizationId = audit?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = audit.organizationId;
        break;
      }
      case 'auditChecklist': {
        const checklist = await this.prisma.auditChecklist.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!checklist || checklist.organizationId !== currentOrganizationId) {
          resourceOrganizationId = checklist?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = checklist.organizationId;
        break;
      }
      case 'auditChecklistItem': {
        const item = await this.prisma.auditChecklistItem.findFirst({
          where: { id: resourceId },
          select: { checklist: { select: { organizationId: true } } },
        });
        if (!item || !item.checklist || item.checklist.organizationId !== currentOrganizationId) {
          resourceOrganizationId = item?.checklist?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = item.checklist.organizationId;
        break;
      }
      case 'auditFinding': {
        const finding = await this.prisma.auditFinding.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!finding || finding.organizationId !== currentOrganizationId) {
          resourceOrganizationId = finding?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = finding.organizationId;
        break;
      }
      case 'nonconformity': {
        const nonconformity = await this.prisma.nonconformity.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!nonconformity || nonconformity.organizationId !== currentOrganizationId) {
          resourceOrganizationId = nonconformity?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = nonconformity.organizationId;
        break;
      }
      case 'correctiveAction': {
        const action = await this.prisma.correctiveAction.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!action || action.organizationId !== currentOrganizationId) {
          resourceOrganizationId = action?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = action.organizationId;
        break;
      }
      case 'rootCauseAnalysis': {
        const analysis = await this.prisma.rootCauseAnalysis.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!analysis || analysis.organizationId !== currentOrganizationId) {
          resourceOrganizationId = analysis?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = analysis.organizationId;
        break;
      }
      case 'risk': {
        const risk = await this.prisma.risk.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!risk || risk.organizationId !== currentOrganizationId) {
          resourceOrganizationId = risk?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = risk.organizationId;
        break;
      }
      case 'riskAssessment': {
        const assessment = await this.prisma.riskAssessment.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!assessment || assessment.organizationId !== currentOrganizationId) {
          resourceOrganizationId = assessment?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = assessment.organizationId;
        break;
      }
      case 'riskControl': {
        const control = await this.prisma.riskControl.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!control || control.organizationId !== currentOrganizationId) {
          resourceOrganizationId = control?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = control.organizationId;
        break;
      }
      case 'riskTreatment': {
        const treatment = await this.prisma.riskTreatment.findFirst({
          where: { id: resourceId },
          select: { organizationId: true },
        });
        if (!treatment || treatment.organizationId !== currentOrganizationId) {
          resourceOrganizationId = treatment?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = treatment.organizationId;
        break;
      }
      case 'fileAsset': {
        const fileAsset = await this.prisma.fileAsset.findFirst({
          where: { id: resourceId, deletedAt: null },
          select: { organizationId: true },
        });
        if (!fileAsset || fileAsset.organizationId !== currentOrganizationId) {
          resourceOrganizationId = fileAsset?.organizationId ?? null;
          break;
        }
        resourceOrganizationId = fileAsset.organizationId;
        break;
      }
      default:
        throw new ForbiddenException('Forbidden');
    }

    if (resourceOrganizationId !== currentOrganizationId) {
      const userId = request.userId;
      const ipAddress = request.ip || request.connection?.remoteAddress || null;
      const userAgent = request.get?.('user-agent') || null;
      const correlationId = request.headers?.['x-correlation-id'];

      this.securityEventService.recordEvent({
        organizationId: currentOrganizationId,
        actorId: userId ?? null,
        eventType: 'TENANT_ACCESS_DENIED',
        severity: 'high',
        description: `Cross-tenant access attempt on ${metadata.resourceType} ${resourceId}. Expected org: ${currentOrganizationId}, Found org: ${resourceOrganizationId}`,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        correlationId: correlationId as string | undefined,
        metadata: {
          resourceType: metadata.resourceType,
          resourceId,
          expectedOrganizationId: currentOrganizationId,
          actualOrganizationId: resourceOrganizationId,
          path: request.originalUrl,
          method: request.method,
        },
      }).catch((error) => {
        this.logger.warn('Failed to record security event for IDOR violation', {
          error: error instanceof Error ? error.message : String(error),
        });
      });

      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
