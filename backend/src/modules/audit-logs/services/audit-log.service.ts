import { Injectable, Logger } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AuditLog } from '../entities/audit-log.entity';
import { createHash, randomUUID } from 'crypto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async recordEvent(data: {
    organizationId: string;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    payload?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
    correlationId?: string;
  }): Promise<AuditLog> {
    const previousLog = await this.auditLogRepository.findLatestByOrganization(data.organizationId);
    const previousHash = previousLog?.eventHash ?? null;

    const eventData = {
      organizationId: data.organizationId,
      actorId: data.actorId ?? null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId ?? null,
      payload: data.payload ?? {},
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      correlationId: data.correlationId ?? randomUUID(),
      previousHash,
    };

    const eventHash = this.computeEventHash(eventData);

    const auditLog = await this.auditLogRepository.create({
      ...eventData,
      eventHash,
    });

    this.logger.debug(`Audit event recorded: ${data.action} on ${data.entityType}`, {
      auditLogId: auditLog.id,
      correlationId: auditLog.correlationId,
    });

    return auditLog;
  }

  async findByCorrelationId(organizationId: string, correlationId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.findByCorrelationId(organizationId, correlationId);
  }

  async listLogs(organizationId: string, filters: {
    action?: string;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    correlationId?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    pageSize: number;
  }): Promise<{ data: AuditLog[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const result = await this.auditLogRepository.findManyByOrganization(organizationId, filters);
    return {
      data: result.data,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.pageSize) || 1,
      },
    };
  }

  private computeEventHash(data: {
    organizationId: string;
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    payload: Record<string, unknown>;
    ipAddress: string | null;
    userAgent: string | null;
    correlationId: string;
    previousHash: string | null;
  }): string {
    const hashInput = JSON.stringify({
      organizationId: data.organizationId,
      actorId: data.actorId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      payload: data.payload,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      correlationId: data.correlationId,
      previousHash: data.previousHash,
    });

    return createHash('sha256').update(hashInput).digest('hex');
  }
}
