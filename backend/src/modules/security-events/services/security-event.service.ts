import { Injectable, Logger } from '@nestjs/common';
import { SecurityEventRepository } from '../repositories/security-event.repository';
import { SecurityEvent } from '../entities/security-event.entity';
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
export class SecurityEventService {
  private readonly logger = new Logger(SecurityEventService.name);

  constructor(private readonly securityEventRepository: SecurityEventRepository) {}

  async recordEvent(data: {
    organizationId: string;
    actorId?: string | null;
    eventType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
    correlationId?: string;
  }): Promise<SecurityEvent | null> {
    if (!data.organizationId) {
      return null;
    }

    try {
      const previousEvent = await this.securityEventRepository.findLatestByOrganization(data.organizationId);
      const previousHash = previousEvent?.eventHash ?? null;

      const eventData = {
        organizationId: data.organizationId,
        actorId: data.actorId ?? null,
        eventType: data.eventType,
        severity: data.severity,
        description: data.description,
        metadata: this.sanitizeMetadata(data.metadata ?? {}),
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        correlationId: data.correlationId ?? randomUUID(),
        previousHash,
      };

      const eventHash = this.computeEventHash(eventData);

      const securityEvent = await this.securityEventRepository.create({
        ...eventData,
        eventHash,
      });

      this.logger.debug(`Security event recorded: ${data.eventType}`, {
        securityEventId: securityEvent.id,
        correlationId: securityEvent.correlationId,
        severity: data.severity,
      });

      return securityEvent;
    } catch (error) {
      this.logger.error(`Failed to record security event: ${data.eventType}`, {
        error: error instanceof Error ? error.message : String(error),
        organizationId: data.organizationId,
        correlationId: data.correlationId,
      });
      return null;
    }
  }

  async listEvents(organizationId: string, filters: {
    eventType?: string;
    severity?: string;
    actorId?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    pageSize: number;
  }): Promise<{ data: SecurityEvent[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const result = await this.securityEventRepository.findManyByOrganization(organizationId, filters);

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

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (SECRET_FIELDS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
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
    eventType: string;
    severity: string;
    description: string;
    metadata: Record<string, unknown>;
    ipAddress: string | null;
    userAgent: string | null;
    correlationId: string;
    previousHash: string | null;
  }): string {
    const canonicalMetadata = this.canonicalizeObject(data.metadata);
    const hashInput = JSON.stringify({
      organizationId: data.organizationId,
      actorId: data.actorId,
      eventType: data.eventType,
      severity: data.severity,
      description: data.description,
      metadata: canonicalMetadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      correlationId: data.correlationId,
      previousHash: data.previousHash,
    });

    return createHash('sha256').update(hashInput).digest('hex');
  }
}
