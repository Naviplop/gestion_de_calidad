import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '../entities/user.entity';

export interface AuthorizationContext {
  actor: JwtPayload;
  action: string;
  resource: string;
  resourceId?: string;
  organizationId?: string;
}

interface RolePermissions {
  resource: string;
  action: string;
}

interface RoleObject {
  name: string;
  permissions?: RolePermissions[];
}

@Injectable()
export class AuthorizationEngine {
  private readonly logger = new Logger(AuthorizationEngine.name);

  authorize(context: AuthorizationContext): void {
    this.logger.debug('Authorization check', {
      actor: context.actor.sub,
      action: context.action,
      resource: context.resource,
      resourceId: context.resourceId,
      organizationId: context.organizationId,
    });

    if (!context.actor || !context.actor.sub) {
      throw new ForbiddenException('Forbidden');
    }

    if (context.organizationId && context.actor.org !== context.organizationId) {
      this.logger.warn('Authorization denied - organization mismatch', {
        actor: context.actor.sub,
        expectedOrg: context.organizationId,
        actualOrg: context.actor.org,
      });
      throw new ForbiddenException('Forbidden');
    }

    const hasPermission = this.checkPermission(context.actor, context.action, context.resource);
    if (!hasPermission) {
      this.logger.warn('Authorization denied', {
        actor: context.actor.sub,
        action: context.action,
        resource: context.resource,
      });
      throw new ForbiddenException('Forbidden');
    }
  }

  authorizeOrganizationAction(
    actor: JwtPayload,
    action: string,
    resource: string,
    organizationId: string,
  ): void {
    this.authorize({
      actor,
      action,
      resource,
      organizationId,
    });
  }

  private checkPermission(actor: JwtPayload, action: string, resource: string): boolean {
    if (!actor.roles || actor.roles.length === 0) {
      return false;
    }

    const requiredPermission = `${resource}:${action}`;
    const actorPermissions = this.extractPermissions(actor);

    return actorPermissions.includes(requiredPermission);
  }

  private extractPermissions(actor: JwtPayload): string[] {
    const permissions: string[] = [];

    if (actor.roles && Array.isArray(actor.roles)) {
      for (const role of actor.roles) {
        const roleObj = role as unknown as RoleObject;
        if (roleObj && roleObj.permissions && Array.isArray(roleObj.permissions)) {
          for (const perm of roleObj.permissions) {
            if (perm && perm.resource && perm.action) {
              permissions.push(`${perm.resource}:${perm.action}`);
            }
          }
        }
      }
    }

    return permissions;
  }
}
