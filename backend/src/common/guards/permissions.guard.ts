import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../modules/auth/decorators/auth.decorators';
import { PrismaService } from '../../database/prisma.service';
import { SecurityEventService } from '../../modules/security-events/services/security-event.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService, private readonly securityEventService: SecurityEventService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.userId;
    const organizationId = request.organizationId;

    if (!userId || !organizationId) {
      throw new ForbiddenException('Forbidden');
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, user: { isActive: true } },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const userPermissions = new Set<string>();
    for (const userRole of userRoles) {
      if (!userRole.role.isActive) continue;
      for (const rp of userRole.role.permissions) {
        userPermissions.add(`${rp.permission.resource}:${rp.permission.action}`);
      }
    }

    const hasPermission = requiredPermissions.some((p) => userPermissions.has(p));
    if (!hasPermission) {
      const ipAddress = request.ip || request.connection?.remoteAddress || null;
      const userAgent = request.get?.('user-agent') || null;
      const correlationId = request.headers?.['x-correlation-id'];

      try {
        await this.securityEventService.recordEvent({
          organizationId,
          actorId: userId,
          eventType: 'PERMISSION_DENIED',
          severity: 'medium',
          description: `Access denied to ${request.method} ${request.originalUrl}. Required: ${requiredPermissions.join(', ')}`,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          correlationId: correlationId as string | undefined,
          metadata: {
            requiredPermissions,
            path: request.originalUrl,
            method: request.method,
          },
        });
      } catch (error) {
        this.logger.warn('Failed to record security event for permission denial', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
