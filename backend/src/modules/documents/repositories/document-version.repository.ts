import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { DocumentVersion } from '../entities/document.entity';
import { DocumentStatus } from '@prisma/client';

@Injectable()
export class DocumentVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<DocumentVersion | null> {
    const version = await this.prisma.documentVersion.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        documentId: true,
        organizationId: true,
        versionMajor: true,
        versionMinor: true,
        versionLabel: true,
        fileAssetId: true,
        fileHash: true,
        changeReason: true,
        status: true,
        createdById: true,
        approvedById: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!version) {
      return null;
    }

    return new DocumentVersion(
      version.id,
      version.documentId,
      version.organizationId,
      version.versionMajor,
      version.versionMinor,
      version.versionLabel,
      version.fileAssetId,
      version.fileHash,
      version.changeReason,
      version.status,
      version.createdById,
      version.approvedById,
      version.approvedAt,
      version.createdAt,
      version.updatedAt,
    );
  }

  async findByDocument(documentId: string, organizationId: string, page: number, pageSize: number): Promise<{ data: DocumentVersion[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const skip = (page - 1) * pageSize;
    const [versions, total] = await Promise.all([
      this.prisma.documentVersion.findMany({
        where: { documentId, organizationId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          documentId: true,
          organizationId: true,
          versionMajor: true,
          versionMinor: true,
          versionLabel: true,
          fileAssetId: true,
          fileHash: true,
          changeReason: true,
          status: true,
          createdById: true,
          approvedById: true,
          approvedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.documentVersion.count({ where: { documentId, organizationId } }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = versions.map((v: any) => new DocumentVersion(
      v.id,
      v.documentId,
      v.organizationId,
      v.versionMajor,
      v.versionMinor,
      v.versionLabel,
      v.fileAssetId,
      v.fileHash,
      v.changeReason,
      v.status,
      v.createdById,
      v.approvedById,
      v.approvedAt,
      v.createdAt,
      v.updatedAt,
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

  async findDuplicate(documentId: string, versionMajor: number, versionMinor: number, excludeId?: string): Promise<DocumentVersion | null> {
    const where: Record<string, unknown> = {
      documentId,
      versionMajor,
      versionMinor,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const version = await this.prisma.documentVersion.findFirst({ where });

    if (!version) {
      return null;
    }

    return new DocumentVersion(
      version.id,
      version.documentId,
      version.organizationId,
      version.versionMajor,
      version.versionMinor,
      version.versionLabel,
      version.fileAssetId,
      version.fileHash,
      version.changeReason,
      version.status,
      version.createdById,
      version.approvedById,
      version.approvedAt,
      version.createdAt,
      version.updatedAt,
    );
  }

  async create(organizationId: string, data: {
    documentId: string;
    versionMajor: number;
    versionMinor: number;
    versionLabel: string;
    fileAssetId: string;
    fileHash: string;
    changeReason: string;
    createdById: string;
  }): Promise<DocumentVersion> {
    const version = await this.prisma.documentVersion.create({
      data: {
        documentId: data.documentId,
        organizationId,
        versionMajor: data.versionMajor,
        versionMinor: data.versionMinor,
        versionLabel: data.versionLabel,
        fileAssetId: data.fileAssetId,
        fileHash: data.fileHash,
        changeReason: data.changeReason,
        status: DocumentStatus.DRAFT,
        createdById: data.createdById,
      },
      select: {
        id: true,
        documentId: true,
        organizationId: true,
        versionMajor: true,
        versionMinor: true,
        versionLabel: true,
        fileAssetId: true,
        fileHash: true,
        changeReason: true,
        status: true,
        createdById: true,
        approvedById: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new DocumentVersion(
      version.id,
      version.documentId,
      version.organizationId,
      version.versionMajor,
      version.versionMinor,
      version.versionLabel,
      version.fileAssetId,
      version.fileHash,
      version.changeReason,
      version.status,
      version.createdById,
      version.approvedById,
      version.approvedAt,
      version.createdAt,
      version.updatedAt,
    );
  }

  async updateStatus(id: string, organizationId: string, status: DocumentStatus, approvedById?: string | null): Promise<DocumentVersion> {
    const version = await this.prisma.documentVersion.update({
      where: { id },
      data: {
        status,
        ...(approvedById && { approvedById }),
        ...(status === 'APPROVED' && { approvedAt: new Date() }),
      },
      select: {
        id: true,
        documentId: true,
        organizationId: true,
        versionMajor: true,
        versionMinor: true,
        versionLabel: true,
        fileAssetId: true,
        fileHash: true,
        changeReason: true,
        status: true,
        createdById: true,
        approvedById: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (version.organizationId !== organizationId) {
      throw new NotFoundException('DocumentVersionNotFound');
    }

    return new DocumentVersion(
      version.id,
      version.documentId,
      version.organizationId,
      version.versionMajor,
      version.versionMinor,
      version.versionLabel,
      version.fileAssetId,
      version.fileHash,
      version.changeReason,
      version.status,
      version.createdById,
      version.approvedById,
      version.approvedAt,
      version.createdAt,
      version.updatedAt,
    );
  }
}
