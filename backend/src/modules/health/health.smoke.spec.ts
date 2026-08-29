import { describe, it, expect } from '@jest/globals';
import { HealthController } from './health.controller';
import { PrismaService } from '../../database/prisma.service';

describe('Foundation - Backend Smoke Tests', () => {
  it('should define health endpoints', () => {
    const controller = new HealthController({} as Parameters<typeof HealthController.prototype.health>[0]);
    expect(controller.health()).toEqual({
      status: 'ok',
      service: 'qms-backend',
      version: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('should define liveness endpoint', () => {
    const controller = new HealthController({} as Parameters<typeof HealthController.prototype.liveness>[0]);
    expect(controller.liveness()).toEqual({
      status: 'alive',
      service: 'qms-backend',
      version: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('should define readiness endpoint with database check', async () => {
    const prisma = { $queryRaw: jest.fn() } as unknown as PrismaService;
    const controller = new HealthController(prisma);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    const result = await controller.readiness();

    expect(result.status).toBe('ready');
    expect(result.database).toBe('connected');
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('should report database unreachable on readiness failure', async () => {
    const prisma = { $queryRaw: jest.fn() } as unknown as PrismaService;
    const controller = new HealthController(prisma);
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('connection failed'));

    const result = await controller.readiness();

    expect(result.status).toBe('not_ready');
    expect(result.database).toBe('unreachable');
  });
});
