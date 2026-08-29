import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { OrganizationMembershipRepository } from '../repositories/organization-membership.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { PrismaService } from '../../../database/prisma.service';
import { OrganizationMembershipEntity } from '../entities/membership.entity';

@Injectable()
export class OrganizationMembershipService {
  constructor(
    private readonly membershipRepository: OrganizationMembershipRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly prisma: PrismaService,
  ) {}

  async listMembers(organizationId: string): Promise<OrganizationMembershipEntity[]> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException('OrganizationNotFound');
    }

    return this.membershipRepository.findMembers(organizationId);
  }

  async addMember(
    organizationId: string,
    userId: string,
    roleIds: string[],
    actorId: string,
  ): Promise<void> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException('OrganizationNotFound');
    }

    const member = await this.membershipRepository.findMember(organizationId, userId);
    if (!member) {
      throw new NotFoundException('MemberNotFound');
    }

    const isActorAdmin = await this.membershipRepository.hasAdminRole(organizationId, actorId);
    if (!isActorAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    if (userId === actorId) {
      throw new ConflictException('CannotModifyOwnMembership');
    }

    const activeAdmins = await this.prisma.user.count({
      where: {
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

    const memberIsAdmin = await this.membershipRepository.hasAdminRole(organizationId, userId);
    if (memberIsAdmin && activeAdmins <= 1 && roleIds.length > 0) {
      throw new ConflictException('CannotRemoveLastAdmin');
    }

    await this.membershipRepository.addMember(organizationId, userId, roleIds, actorId);
  }

  async removeMember(organizationId: string, userId: string, actorId: string): Promise<void> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException('OrganizationNotFound');
    }

    const member = await this.membershipRepository.findMember(organizationId, userId);
    if (!member) {
      throw new NotFoundException('MemberNotFound');
    }

    const isActorAdmin = await this.membershipRepository.hasAdminRole(organizationId, actorId);
    if (!isActorAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    if (userId === actorId) {
      throw new ConflictException('CannotRemoveSelf');
    }

    const memberIsAdmin = await this.membershipRepository.hasAdminRole(organizationId, userId);
    if (memberIsAdmin) {
      const activeAdmins = await this.prisma.user.count({
        where: {
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

      if (activeAdmins <= 1) {
        throw new ConflictException('CannotRemoveLastAdmin');
      }
    }

    await this.membershipRepository.removeMember(organizationId, userId);
  }
}
