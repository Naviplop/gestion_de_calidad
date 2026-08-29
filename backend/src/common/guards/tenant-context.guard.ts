import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrganizationMembership, UserMembershipStatus } from '../../modules/organizations/entities/organization.entity';

@Injectable()
export class TenantContextGuard {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
