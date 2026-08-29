import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async getStoredResponse(organizationId: string, key: string): Promise<{ statusCode: number; body: unknown } | null> {
    const record = await this.prisma.idempotencyKey.findFirst({
      where: { organizationId, key },
      select: { statusCode: true, responseBody: true },
    });

    if (!record) {
      return null;
    }

    return {
      statusCode: record.statusCode ?? 200,
      body: record.responseBody ?? {},
    };
  }

  async storeResponse(organizationId: string, key: string, resourceType: string, resourceId: string, method: string, path: string, statusCode: number, body: unknown, ttlSeconds = 86400): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.prisma.idempotencyKey.upsert({
      where: {
        organizationId_key: {
          organizationId,
          key,
        },
      },
      create: {
        organizationId,
        key,
        resourceType,
        resourceId,
        path,
        method: method.toUpperCase(),
        statusCode,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseBody: body as any,
        expiresAt,
      },
      update: {
        statusCode,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseBody: body as any,
        expiresAt,
      },
    });
  }
}
