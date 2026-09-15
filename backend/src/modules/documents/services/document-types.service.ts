import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export interface DocumentTypeItem {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface DocumentTypeListResult {
  data: DocumentTypeItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

@Injectable()
export class DocumentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(_organizationId: string): Promise<DocumentTypeListResult> {
    const types = await this.prisma.documentType.findMany({
      orderBy: { name: 'asc' },
    });

    return {
      data: types.map((t) => ({
        id: t.id,
        organizationId: '',
        name: t.name,
        description: t.description,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
      })),
      meta: { page: 1, pageSize: types.length, total: types.length, totalPages: 1 },
    };
  }

  async get(organizationId: string, id: string): Promise<DocumentTypeItem> {
    const type = await this.prisma.documentType.findUnique({ where: { id } });
    if (!type) {
      throw new NotFoundException('DocumentTypeNotFound');
    }
    return {
      id: type.id,
      organizationId: '',
      name: type.name,
      description: type.description,
      isActive: type.isActive,
      createdAt: type.createdAt.toISOString(),
    };
  }

  async create(organizationId: string, dto: { name: string; description?: string }): Promise<DocumentTypeItem> {
    const existing = await this.prisma.documentType.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException('DuplicateDocumentTypeName');
    }

    const type = await this.prisma.documentType.create({
      data: { name: dto.name, description: dto.description || null },
    });

    return {
      id: type.id,
      organizationId: '',
      name: type.name,
      description: type.description,
      isActive: type.isActive,
      createdAt: type.createdAt.toISOString(),
    };
  }

  async update(organizationId: string, id: string, dto: { name?: string; description?: string; isActive?: boolean }): Promise<DocumentTypeItem> {
    const type = await this.prisma.documentType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      id: type.id,
      organizationId: '',
      name: type.name,
      description: type.description,
      isActive: type.isActive,
      createdAt: type.createdAt.toISOString(),
    };
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.prisma.documentType.delete({ where: { id } });
  }
}
