import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Public } from '../auth/decorators/auth.decorators';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @Public()
  health() {
    return {
      status: 'ok',
      service: 'qms-backend',
      version: process.env.APP_VERSION || '0.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @Public()
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        service: 'qms-backend',
        version: process.env.APP_VERSION || '0.0.0',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch {
      return {
        status: 'not_ready',
        service: 'qms-backend',
        version: process.env.APP_VERSION || '0.0.0',
        timestamp: new Date().toISOString(),
        database: 'unreachable',
      };
    }
  }

  @Get('liveness')
  @Public()
  liveness() {
    return {
      status: 'alive',
      service: 'qms-backend',
      version: process.env.APP_VERSION || '0.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
