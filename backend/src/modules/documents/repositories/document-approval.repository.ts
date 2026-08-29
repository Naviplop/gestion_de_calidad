import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { DocumentApproval } from '../entities/document.entity';
import { ApprovalStatus } from '@prisma/client';

@Injectable()
export class DocumentApprovalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<DocumentApproval | null> {
    const approval = await this.prisma.documentApproval.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        documentVersionId: true,
        organizationId: true,
        userId: true,
        status: true,
        comment: true,
        decidedAt: true,
        createdAt: true,
      },
    });

    if (!approval) {
      return null;
    }

    return new DocumentApproval(
      approval.id,
      approval.documentVersionId,
      approval.organizationId,
      approval.userId,
      approval.status,
      approval.comment,
      approval.decidedAt,
      approval.createdAt,
    );
  }

  async findByDocumentVersion(documentVersionId: string, organizationId: string): Promise<DocumentApproval[]> {
    const approvals = await this.prisma.documentApproval.findMany({
      where: { documentVersionId, organizationId },
      select: {
        id: true,
        documentVersionId: true,
        organizationId: true,
        userId: true,
        status: true,
        comment: true,
        decidedAt: true,
        createdAt: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return approvals.map((a: any) => new DocumentApproval(
      a.id,
      a.documentVersionId,
      a.organizationId,
      a.userId,
      a.status,
      a.comment,
      a.decidedAt,
      a.createdAt,
    ));
  }

  async create(organizationId: string, data: {
    documentVersionId: string;
    userId: string;
  }): Promise<DocumentApproval> {
    const approval = await this.prisma.documentApproval.create({
      data: {
        documentVersionId: data.documentVersionId,
        organizationId,
        userId: data.userId,
        status: ApprovalStatus.PENDING,
      },
      select: {
        id: true,
        documentVersionId: true,
        organizationId: true,
        userId: true,
        status: true,
        comment: true,
        decidedAt: true,
        createdAt: true,
      },
    });

    return new DocumentApproval(
      approval.id,
      approval.documentVersionId,
      approval.organizationId,
      approval.userId,
      approval.status,
      approval.comment,
      approval.decidedAt,
      approval.createdAt,
    );
  }

  async updateStatus(id: string, organizationId: string, status: ApprovalStatus, comment?: string | null): Promise<DocumentApproval> {
    const approval = await this.prisma.documentApproval.update({
      where: { id },
      data: {
        status,
        ...(comment !== undefined && { comment }),
        ...(status !== ApprovalStatus.PENDING && { decidedAt: new Date() }),
      },
      select: {
        id: true,
        documentVersionId: true,
        organizationId: true,
        userId: true,
        status: true,
        comment: true,
        decidedAt: true,
        createdAt: true,
      },
    });

    if (approval.organizationId !== organizationId) {
      throw new Error('DocumentApprovalNotFound');
    }

    return new DocumentApproval(
      approval.id,
      approval.documentVersionId,
      approval.organizationId,
      approval.userId,
      approval.status,
      approval.comment,
      approval.decidedAt,
      approval.createdAt,
    );
  }
}
