import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SecurityEvent } from '../entities/security-event.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class SecurityEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId: string;
    actorId?: string | null;
    eventType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
    correlationId?: string;
    previousHash?: string | null;
    eventHash: string;
  }): Promise<SecurityEvent> {
    const event = await this.prisma.securityEvent.create({
      data: {
        organizationId: data.organizationId,
        actorId: data.actorId,
        eventType: data.eventType,
        severity: data.severity,
        description: data.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (data.metadata ?? {}) as any,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        correlationId: data.correlationId ?? randomUUID(),
        previousHash: data.previousHash,
        eventHash: data.eventHash,
      },
      select: {
        id: true,
        organizationId: true,
        actorId: true,
        eventType: true,
        severity: true,
        description: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        correlationId: true,
        previousHash: true,
        eventHash: true,
        createdAt: true,
      },
    });

    return new SecurityEvent(
      event.id,
      event.organizationId,
      event.actorId,
      event.eventType,
      event.severity as 'low' | 'medium' | 'high' | 'critical',
      event.description,
      event.metadata as Record<string, unknown>,
      event.ipAddress,
      event.userAgent,
      event.correlationId,
      event.previousHash,
      event.eventHash,
      event.createdAt,
    );
  }

  async findLatestByOrganization(organizationId: string): Promise<SecurityEvent | null> {
    const event = await this.prisma.securityEvent.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        organizationId: true,
        actorId: true,
        eventType: true,
        severity: true,
        description: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        correlationId: true,
        previousHash: true,
        eventHash: true,
        createdAt: true,
      },
    });

    if (!event) return null;

    return new SecurityEvent(
      event.id,
      event.organizationId,
      event.actorId,
      event.eventType,
      event.severity as 'low' | 'medium' | 'high' | 'critical',
      event.description,
      event.metadata as Record<string, unknown>,
      event.ipAddress,
      event.userAgent,
      event.correlationId,
      event.previousHash,
      event.eventHash,
      event.createdAt,
    );
  }

  async findManyByOrganization(organizationId: string, filters: {
    eventType?: string;
    severity?: string;
    actorId?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    pageSize: number;
  }): Promise<{ data: SecurityEvent[]; total: number }> {
    const where: Record<string, unknown> = { organizationId };

    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.dateFrom || filters.dateTo) {
      const createdAt: Record<string, unknown> = {};
      if (filters.dateFrom) {
        createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        createdAt.lte = new Date(filters.dateTo);
      }
      where.createdAt = createdAt;
    }

    const [data, total] = await Promise.all([
      this.prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        select: {
          id: true,
          organizationId: true,
          actorId: true,
          eventType: true,
          severity: true,
          description: true,
          metadata: true,
          ipAddress: true,
          userAgent: true,
          correlationId: true,
          previousHash: true,
          eventHash: true,
          createdAt: true,
        },
      }),
      this.prisma.securityEvent.count({ where }),
    ]);

    return {
      data: data.map((event) => new SecurityEvent(
        event.id,
        event.organizationId,
        event.actorId,
        event.eventType,
        event.severity as 'low' | 'medium' | 'high' | 'critical',
        event.description,
        event.metadata as Record<string, unknown>,
        event.ipAddress,
        event.userAgent,
        event.correlationId,
        event.previousHash,
        event.eventHash,
        event.createdAt,
      )),
      total,
    };
  }
}
