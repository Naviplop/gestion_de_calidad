import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Standard, StandardListItem, StandardRequirementListItem } from '../entities/standard.entity';

@Injectable()
export class StandardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(page: number, pageSize: number, search?: string): Promise<{ data: StandardListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [standards, total] = await Promise.all([
      this.prisma.standard.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          version: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.standard.count({ where }),
    ]);

    const data = standards.map((s) => new StandardListItem(
      s.id,
      s.code,
      s.name,
      s.description,
      s.version,
      s.isActive,
      s.createdAt,
      s.updatedAt,
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

  async findById(id: string): Promise<Standard | null> {
    const standard = await this.prisma.standard.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        version: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!standard) {
      return null;
    }

    return new Standard(
      standard.id,
      standard.code,
      standard.name,
      standard.description,
      standard.version,
      standard.isActive,
      standard.createdAt,
      standard.updatedAt,
    );
  }

  async findRequirements(standardId: string, page: number, pageSize: number, parentId?: string, search?: string): Promise<{ data: StandardRequirementListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = { standardId };

    if (parentId) {
      where.parentRequirementId = parentId;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [requirements, total] = await Promise.all([
      this.prisma.standardRequirement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { code: 'asc' },
        select: {
          id: true,
          standardId: true,
          code: true,
          title: true,
          description: true,
          clause: true,
          parentRequirementId: true,
          createdAt: true,
        },
      }),
      this.prisma.standardRequirement.count({ where }),
    ]);

    const data = requirements.map((r) => new StandardRequirementListItem(
      r.id,
      r.code,
      r.title,
      r.description,
      r.clause,
      r.parentRequirementId,
      r.createdAt,
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
}
