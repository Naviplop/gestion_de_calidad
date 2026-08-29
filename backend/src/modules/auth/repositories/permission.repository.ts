import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Permission } from '../entities/permission.entity';

@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Permission | null> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) return null;

    return this.mapToEntity(permission);
  }

  async findAll(): Promise<Permission[]> {
    const permissions = await this.prisma.permission.findMany();
    return permissions.map((permission) => this.mapToEntity(permission));
  }

  async findByResource(resource: string): Promise<Permission[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { resource },
    });

    return permissions.map((permission) => this.mapToEntity(permission));
  }

  async findByResourceAndAction(resource: string, action: string): Promise<Permission | null> {
    const permission = await this.prisma.permission.findFirst({
      where: { resource, action },
    });

    if (!permission) return null;

    return this.mapToEntity(permission);
  }

  private mapToEntity(permission: {
    id: string;
    resource: string;
    action: string;
    description: string | null;
    createdAt: Date;
  }): Permission {
    return new Permission(
      permission.id,
      permission.resource,
      permission.action,
      permission.description,
      permission.createdAt,
    );
  }
}
