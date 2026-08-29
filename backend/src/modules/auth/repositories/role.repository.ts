import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Role } from '../entities/role.entity';

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<Role | null> {
    const role = await this.prisma.role.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!role) return null;

    return this.mapToEntity(role);
  }

  async findByOrganization(organizationId: string): Promise<Role[]> {
    const roles = await this.prisma.role.findMany({
      where: { organizationId },
    });

    return roles.map((role) => this.mapToEntity(role));
  }

  async findByName(organizationId: string, name: string): Promise<Role | null> {
    const role = await this.prisma.role.findFirst({
      where: { organizationId, name },
    });

    if (!role) return null;

    return this.mapToEntity(role);
  }

  private mapToEntity(role: {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Role {
    return new Role(
      role.id,
      role.organizationId,
      role.name,
      role.description,
      role.isSystem,
      role.isActive,
      role.createdAt,
      role.updatedAt,
    );
  }
}
