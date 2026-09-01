import { Injectable, Logger } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AuditLog } from '../entities/audit-log.entity';
import { createHash, randomUUID } from 'crypto';

const SECRET_FIELDS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'secret',
  'jwt',
  'apiKey',
  'x-api-key',
  'mfaSecret',
  'recoveryCode',
]);

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
  }): Promise<AuditLog | null> {
    try {
      const previousLog = await this.auditLogRepository.findLatestByOrganization(data.organizationId);
      const previousHash = previousLog?.eventHash ?? null;

      const eventData = {
        organizationId: data.organizationId,
        actorId: data.actorId ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        payload: this.sanitizePayload(data.payload ?? {}),
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
    } catch (error) {
      this.logger.error(`Failed to record audit event: ${data.action} on ${data.entityType}`, {
        error: error instanceof Error ? error.message : String(error),
        organizationId: data.organizationId,
        correlationId: data.correlationId,
      });
      return null;
    }
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

  private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (SECRET_FIELDS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizePayload(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private canonicalizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      const value = obj[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sorted[key] = this.canonicalizeObject(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        sorted[key] = value.map((item) =>
          item && typeof item === 'object' && !Array.isArray(item)
            ? this.canonicalizeObject(item as Record<string, unknown>)
            : item,
        );
      } else {
        sorted[key] = value;
      }
    }
    return sorted;
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
    const canonicalPayload = this.canonicalizeObject(data.payload);
    const hashInput = JSON.stringify({
      organizationId: data.organizationId,
      actorId: data.actorId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      payload: canonicalPayload,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      correlationId: data.correlationId,
      previousHash: data.previousHash,
    });

    return createHash('sha256').update(hashInput).digest('hex');
  }
}
