import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLog } from '../entities/audit-log.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId: string;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    payload?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
    correlationId?: string;
    previousHash?: string | null;
    eventHash: string;
  }): Promise<AuditLog> {
    const log = await this.prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        actorId: data.actorId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: data.payload as any,
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
        action: true,
        entityType: true,
        entityId: true,
        payload: true,
        ipAddress: true,
        userAgent: true,
        correlationId: true,
        previousHash: true,
        eventHash: true,
        createdAt: true,
      },
    });

    return new AuditLog(
      log.id,
      log.organizationId,
      log.actorId,
      log.action,
      log.entityType,
      log.entityId,
      log.payload as Record<string, unknown>,
      log.ipAddress,
      log.userAgent,
      log.correlationId,
      log.previousHash,
      log.eventHash,
      log.createdAt,
    );
  }

  async findLatestByOrganization(organizationId: string): Promise<AuditLog | null> {
    const log = await this.prisma.auditLog.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        organizationId: true,
        actorId: true,
        action: true,
        entityType: true,
        entityId: true,
        payload: true,
        ipAddress: true,
        userAgent: true,
        correlationId: true,
        previousHash: true,
        eventHash: true,
        createdAt: true,
      },
    });

    if (!log) return null;

    return new AuditLog(
      log.id,
      log.organizationId,
      log.actorId,
      log.action,
      log.entityType,
      log.entityId,
      log.payload as Record<string, unknown>,
      log.ipAddress,
      log.userAgent,
      log.correlationId,
      log.previousHash,
      log.eventHash,
      log.createdAt,
    );
  }

  async findByCorrelationId(organizationId: string, correlationId: string): Promise<AuditLog[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { organizationId, correlationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        organizationId: true,
        actorId: true,
        action: true,
        entityType: true,
        entityId: true,
        payload: true,
        ipAddress: true,
        userAgent: true,
        correlationId: true,
        previousHash: true,
        eventHash: true,
        createdAt: true,
      },
    });

    return logs.map((log) => new AuditLog(
      log.id,
      log.organizationId,
      log.actorId,
      log.action,
      log.entityType,
      log.entityId,
      log.payload as Record<string, unknown>,
      log.ipAddress,
      log.userAgent,
      log.correlationId,
      log.previousHash,
      log.eventHash,
      log.createdAt,
    ));
  }

  async findManyByOrganization(organizationId: string, filters: {
    action?: string;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    correlationId?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    pageSize: number;
  }): Promise<{ data: AuditLog[]; total: number }> {
    const where: Record<string, unknown> = { organizationId };

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.correlationId) {
      where.correlationId = filters.correlationId;
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
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        select: {
          id: true,
          organizationId: true,
          actorId: true,
          action: true,
          entityType: true,
          entityId: true,
          payload: true,
          ipAddress: true,
          userAgent: true,
          correlationId: true,
          previousHash: true,
          eventHash: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map((log) => new AuditLog(
        log.id,
        log.organizationId,
        log.actorId,
        log.action,
        log.entityType,
        log.entityId,
        log.payload as Record<string, unknown>,
        log.ipAddress,
        log.userAgent,
        log.correlationId,
        log.previousHash,
        log.eventHash,
        log.createdAt,
      )),
      total,
    };
  }
}
