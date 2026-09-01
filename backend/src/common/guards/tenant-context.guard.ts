import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrganizationMembership, UserMembershipStatus } from '../../modules/organizations/entities/organization.entity';
import { IS_PUBLIC_KEY } from '../../modules/auth/decorators/auth.decorators';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TenantContextGuard {
  constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}

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

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        isActive: true,
        isLocked: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    let membershipStatus = UserMembershipStatus.ACTIVE;
    if (!user.isActive) {
      membershipStatus = UserMembershipStatus.INACTIVE;
    } else if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
      membershipStatus = UserMembershipStatus.LOCKED;
    }

    const membership = new OrganizationMembership(
      user.id,
      user.organizationId,
      membershipStatus,
      user.isActive,
    );

    request.organizationContext = {
      organizationId: user.organizationId,
      userId: user.id,
      membership,
    };

    return true;
  }
}
