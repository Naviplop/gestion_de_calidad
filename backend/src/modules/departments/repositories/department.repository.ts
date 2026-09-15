import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Department, DepartmentListItem } from '../entities/department.entity';

@Injectable()
export class DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<Department | null> {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId },
    });

    if (!dept) {
      return null;
    }

    return new Department(
      dept.id,
      dept.organizationId,
      dept.name,
      dept.description,
      dept.parentDepartmentId,
      dept.isActive,
      dept.createdAt,
      dept.updatedAt,
    );
  }

  async findByOrganization(organizationId: string): Promise<Department[]> {
    const depts = await this.prisma.department.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });

    return depts.map((d) => new Department(
      d.id,
      d.organizationId,
      d.name,
      d.description,
      d.parentDepartmentId,
      d.isActive,
      d.createdAt,
      d.updatedAt,
    ));
  }

  async findListByOrganization(organizationId: string, page: number, pageSize: number, search?: string): Promise<{ data: DepartmentListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = { organizationId };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [departments, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          parentDepartmentId: true,
          parentDepartment: { select: { id: true, name: true } },
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.department.count({ where }),
    ]);

    const data = departments.map((d) => new DepartmentListItem(
      d.id,
      d.name,
      d.description,
      d.parentDepartmentId,
      d.parentDepartment?.name ?? null,
      d.isActive,
      d.createdAt,
      d.updatedAt,
    ));

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findDuplicate(organizationId: string, name: string, excludeId?: string): Promise<Department | null> {
    const where: Record<string, unknown> = {
      organizationId,
      name,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const dept = await this.prisma.department.findFirst({ where });

    if (!dept) {
      return null;
    }

    return new Department(
      dept.id,
      dept.organizationId,
      dept.name,
      dept.description,
      dept.parentDepartmentId,
      dept.isActive,
      dept.createdAt,
      dept.updatedAt,
    );
  }

  async create(organizationId: string, data: {
    name: string;
    description?: string | null;
    parentDepartmentId?: string | null;
  }): Promise<Department> {
    const dept = await this.prisma.department.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        parentDepartmentId: data.parentDepartmentId,
        isActive: true,
      },
    });

    return new Department(
      dept.id,
      dept.organizationId,
      dept.name,
      dept.description,
      dept.parentDepartmentId,
      dept.isActive,
      dept.createdAt,
      dept.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    name?: string;
    description?: string | null;
    parentDepartmentId?: string | null;
    isActive?: boolean;
  }): Promise<Department> {
    const dept = await this.prisma.department.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.parentDepartmentId !== undefined && { parentDepartmentId: data.parentDepartmentId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    if (dept.organizationId !== organizationId) {
      throw new NotFoundException('DepartmentNotFound');
    }

    return new Department(
      dept.id,
      dept.organizationId,
      dept.name,
      dept.description,
      dept.parentDepartmentId,
      dept.isActive,
      dept.createdAt,
      dept.updatedAt,
    );
  }

  async deactivate(id: string, organizationId: string): Promise<void> {
    const dept = await this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    });

    if (dept.organizationId !== organizationId) {
      throw new NotFoundException('DepartmentNotFound');
    }
  }

  async detectCycle(departmentId: string, newParentId: string, organizationId: string): Promise<boolean> {
    if (!newParentId) {
      return false;
    }
    if (departmentId && newParentId === departmentId) {
      return true;
    }
    let currentId: string | null = newParentId;
    const visited = new Set<string>();
    if (departmentId) {
      visited.add(departmentId);
    }

    while (currentId) {
      if (currentId === departmentId) {
        return true;
      }
      if (visited.has(currentId)) {
        return true;
      }
      visited.add(currentId);

      const dept: { parentDepartmentId: string | null } | null = await this.prisma.department.findFirst({
        where: { id: currentId, organizationId },
        select: { parentDepartmentId: true },
      });

      if (!dept) {
        return false;
      }

      currentId = dept.parentDepartmentId;
    }

    return false;
  }
}
