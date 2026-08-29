import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { DocumentDistribution, DocumentAcknowledgement } from '../entities/document.entity';
import { DistributionStatus } from '@prisma/client';

@Injectable()
export class DocumentDistributionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<DocumentDistribution | null> {
    const distribution = await this.prisma.documentDistribution.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        documentId: true,
        documentVersionId: true,
        organizationId: true,
        assignedToUserId: true,
        assignedToDepartmentId: true,
        assignedToRoleId: true,
        status: true,
        createdAt: true,
      },
    });

    if (!distribution) {
      return null;
    }

    return new DocumentDistribution(
      distribution.id,
      distribution.documentId,
      distribution.documentVersionId,
      distribution.organizationId,
      distribution.assignedToUserId,
      distribution.assignedToDepartmentId,
      distribution.assignedToRoleId,
      distribution.status,
      distribution.createdAt,
    );
  }

  async findByDocument(documentId: string, organizationId: string): Promise<DocumentDistribution[]> {
    const distributions = await this.prisma.documentDistribution.findMany({
      where: { documentId, organizationId },
      select: {
        id: true,
        documentId: true,
        documentVersionId: true,
        organizationId: true,
        assignedToUserId: true,
        assignedToDepartmentId: true,
        assignedToRoleId: true,
        status: true,
        createdAt: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return distributions.map((d: any) => new DocumentDistribution(
      d.id,
      d.documentId,
      d.documentVersionId,
      d.organizationId,
      d.assignedToUserId,
      d.assignedToDepartmentId,
      d.assignedToRoleId,
      d.status,
      d.createdAt,
    ));
  }

  async create(organizationId: string, data: {
    documentId: string;
    documentVersionId: string;
    assignedToUserId?: string | null;
    assignedToDepartmentId?: string | null;
    assignedToRoleId?: string | null;
  }): Promise<DocumentDistribution> {
    const distribution = await this.prisma.documentDistribution.create({
      data: {
        documentId: data.documentId,
        documentVersionId: data.documentVersionId,
        organizationId,
        assignedToUserId: data.assignedToUserId,
        assignedToDepartmentId: data.assignedToDepartmentId,
        assignedToRoleId: data.assignedToRoleId,
        status: DistributionStatus.PENDING,
      },
      select: {
        id: true,
        documentId: true,
        documentVersionId: true,
        organizationId: true,
        assignedToUserId: true,
        assignedToDepartmentId: true,
        assignedToRoleId: true,
        status: true,
        createdAt: true,
      },
    });

    return new DocumentDistribution(
      distribution.id,
      distribution.documentId,
      distribution.documentVersionId,
      distribution.organizationId,
      distribution.assignedToUserId,
      distribution.assignedToDepartmentId,
      distribution.assignedToRoleId,
      distribution.status,
      distribution.createdAt,
    );
  }

  async findExisting(distributionId: string, organizationId: string, userId: string): Promise<DocumentAcknowledgement | null> {
    const existing = await this.prisma.documentAcknowledgement.findFirst({
      where: {
        documentDistributionId: distributionId,
        organizationId,
        userId,
      },
    });

    if (!existing) {
      return null;
    }

    return {
      id: existing.id,
      documentDistributionId: existing.documentDistributionId,
      organizationId: existing.organizationId,
      userId: existing.userId,
      ipAddress: existing.ipAddress,
      userAgent: existing.userAgent,
      acknowledgedAt: existing.acknowledgedAt,
    };
  }

  async createAcknowledgement(organizationId: string, data: {
    documentDistributionId: string;
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<DocumentAcknowledgement> {
    const acknowledgement = await this.prisma.documentAcknowledgement.create({
      data: {
        documentDistributionId: data.documentDistributionId,
        organizationId,
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
      select: {
        id: true,
        documentDistributionId: true,
        organizationId: true,
        userId: true,
        ipAddress: true,
        userAgent: true,
        acknowledgedAt: true,
      },
    });

    return new DocumentAcknowledgement(
      acknowledgement.id,
      acknowledgement.documentDistributionId,
      acknowledgement.organizationId,
      acknowledgement.userId,
      acknowledgement.ipAddress,
      acknowledgement.userAgent,
      acknowledgement.acknowledgedAt,
    );
  }
}
