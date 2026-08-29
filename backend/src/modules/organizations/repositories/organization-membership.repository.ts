import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { OrganizationMembershipEntity } from '../entities/membership.entity';

@Injectable()
export class OrganizationMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMembers(organizationId: string): Promise<OrganizationMembershipEntity[]> {
    const members = await this.prisma.user.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isLocked: true,
        roles: {
          where: { role: { isActive: true } },
          include: { role: { select: { name: true } } },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return members.map((member) => {
      const status = !member.isActive ? 'INACTIVE' : member.isLocked ? 'LOCKED' : 'ACTIVE';
      const roles = member.roles.map((ur) => ur.role.name);

      return new OrganizationMembershipEntity(
        member.id,
        member.organizationId,
        member.email,
        member.firstName,
        member.lastName,
        status,
        roles,
        member.createdAt,
        member.updatedAt,
      );
    });
  }

  async findMember(organizationId: string, userId: string): Promise<OrganizationMembershipEntity | null> {
    const member = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isLocked: true,
        roles: {
          where: { role: { isActive: true } },
          include: { role: { select: { name: true } } },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!member) return null;

    const status = !member.isActive ? 'INACTIVE' : member.isLocked ? 'LOCKED' : 'ACTIVE';
    const roles = member.roles.map((ur) => ur.role.name);

    return new OrganizationMembershipEntity(
      member.id,
      member.organizationId,
      member.email,
      member.firstName,
      member.lastName,
      status,
      roles,
      member.createdAt,
      member.updatedAt,
    );
  }

  async addMember(
    organizationId: string,
    userId: string,
    roleIds: string[],
    actorId: string,
  ): Promise<void> {
    await this.prisma.userRole.deleteMany({ where: { userId } });

    await this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({
        userId,
        roleId,
        assignedBy: actorId,
      })),
      skipDuplicates: true,
    });
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    const member = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });

    if (!member) {
      return;
    }

    await this.prisma.userRole.deleteMany({ where: { userId } });
  }

  async hasAdminRole(organizationId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        id: userId,
        organizationId,
        isActive: true,
        deletedAt: null,
        roles: {
          some: {
            role: {
              isActive: true,
              permissions: {
                some: {
                  permission: {
                    resource: 'users',
                    action: 'manage',
                  },
                },
              },
            },
          },
        },
      },
    });

    return count > 0;
  }
}
