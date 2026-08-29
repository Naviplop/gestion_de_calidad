import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository';
import { PrismaService } from '../../../database/prisma.service';
import { Organization } from '../entities/organization.entity';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly prisma: PrismaService,
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

  async getOrganization(organizationId: string): Promise<Organization> {
    const org = await this.organizationRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundException('OrganizationNotFound');
    }
    return org;
  }

  async createOrganization(data: {
    name: string;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    timezone?: string;
    locale?: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
  }, actorId: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Organization> {
    if (data.taxId) {
      const existing = await this.organizationRepository.findByTaxId(data.taxId);
      if (existing) {
        throw new ConflictException('DuplicateTaxId');
      }
    }

    const organization = await this.organizationRepository.create(data);

    await this.recordAuditEvent({
      organizationId: organization.id,
      actorId,
      action: 'ORGANIZATION_CREATED',
      entityType: 'Organization',
      entityId: organization.id,
      payload: { name: organization.name },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return organization;
  }

  async updateOrganization(organizationId: string, data: {
    name?: string;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    timezone?: string;
    locale?: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
  }, actorId: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Organization> {
    await this.getOrganization(organizationId);

    if (data.taxId) {
      const existing = await this.organizationRepository.findByTaxId(data.taxId);
      if (existing && existing.id !== organizationId) {
        throw new ConflictException('DuplicateTaxId');
      }
    }

    const organization = await this.organizationRepository.update(organizationId, organizationId, data);

    await this.recordAuditEvent({
      organizationId,
      actorId,
      action: 'ORGANIZATION_UPDATED',
      entityType: 'Organization',
      entityId: organization.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return organization;
  }

  async deactivateOrganization(organizationId: string, actorId: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<void> {
    const org = await this.getOrganization(organizationId);
    if (!org.isAvailableForOperations) {
      throw new NotFoundException('OrganizationNotAvailable');
    }

    const activeUsers = await this.prisma.user.count({
      where: {
        organizationId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (activeUsers > 0) {
      throw new ConflictException('OrganizationHasActiveUsers');
    }

    await this.organizationRepository.deactivate(organizationId, organizationId);

    await this.recordAuditEvent({
      organizationId,
      actorId,
      action: 'ORGANIZATION_DEACTIVATED',
      entityType: 'Organization',
      entityId: organizationId,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });
  }

  async listSettings(organizationId: string) {
    const settings = await this.prisma.organizationSetting.findMany({
      where: { organizationId },
    });

    return settings.map((s) => ({
      key: s.key,
      value: s.value,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async updateSettings(organizationId: string, data: Record<string, unknown>, actorId: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string) {
    const updates = Object.entries(data).map(([key, value]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeValue = value as any;
      return this.prisma.organizationSetting.upsert({
        where: {
          organizationId_key: {
            organizationId,
            key,
          },
        },
        update: { value: safeValue },
        create: {
          organizationId,
          key,
          value: safeValue,
        },
      });
    });

    await this.prisma.$transaction(updates);

    await this.recordAuditEvent({
      organizationId,
      actorId,
      action: 'ORGANIZATION_SETTINGS_UPDATED',
      entityType: 'OrganizationSetting',
      entityId: organizationId,
      payload: { keys: Object.keys(data) },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return this.listSettings(organizationId);
  }
}
