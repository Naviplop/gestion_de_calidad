import { Injectable, Logger } from '@nestjs/common';
import { SecurityEventRepository } from '../repositories/security-event.repository';
import { SecurityEvent } from '../entities/security-event.entity';
import { createHash, randomUUID } from 'crypto';

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
  }): Promise<SecurityEvent> {
    const previousEvent = await this.securityEventRepository.findLatestByOrganization(data.organizationId);
    const previousHash = previousEvent?.eventHash ?? null;

    const eventData = {
      organizationId: data.organizationId,
      actorId: data.actorId ?? null,
      eventType: data.eventType,
      severity: data.severity,
      description: data.description,
      metadata: data.metadata ?? {},
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
    const hashInput = JSON.stringify({
      organizationId: data.organizationId,
      actorId: data.actorId,
      eventType: data.eventType,
      severity: data.severity,
      description: data.description,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      correlationId: data.correlationId,
      previousHash: data.previousHash,
    });

    return createHash('sha256').update(hashInput).digest('hex');
  }
}
