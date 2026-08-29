import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { DocumentReviewer } from '../entities/document.entity';
import { ReviewStatus } from '@prisma/client';

@Injectable()
export class DocumentReviewerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<DocumentReviewer | null> {
    const reviewer = await this.prisma.documentReviewer.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        documentVersionId: true,
        organizationId: true,
        userId: true,
        status: true,
        completedAt: true,
        comment: true,
        createdAt: true,
      },
    });

    if (!reviewer) {
      return null;
    }

    return new DocumentReviewer(
      reviewer.id,
      reviewer.documentVersionId,
      reviewer.organizationId,
      reviewer.userId,
      reviewer.status,
      reviewer.completedAt,
      reviewer.comment,
      reviewer.createdAt,
    );
  }

  async findByDocumentVersion(documentVersionId: string, organizationId: string): Promise<DocumentReviewer[]> {
    const reviewers = await this.prisma.documentReviewer.findMany({
      where: { documentVersionId, organizationId },
      select: {
        id: true,
        documentVersionId: true,
        organizationId: true,
        userId: true,
        status: true,
        completedAt: true,
        comment: true,
        createdAt: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return reviewers.map((r: any) => new DocumentReviewer(
      r.id,
      r.documentVersionId,
      r.organizationId,
      r.userId,
      r.status,
      r.completedAt,
      r.comment,
      r.createdAt,
    ));
  }

  async create(organizationId: string, data: {
    documentVersionId: string;
    userId: string;
  }): Promise<DocumentReviewer> {
    const reviewer = await this.prisma.documentReviewer.create({
      data: {
        documentVersionId: data.documentVersionId,
        organizationId,
        userId: data.userId,
        status: ReviewStatus.PENDING,
      },
      select: {
        id: true,
        documentVersionId: true,
        organizationId: true,
        userId: true,
        status: true,
        completedAt: true,
        comment: true,
        createdAt: true,
      },
    });

    return new DocumentReviewer(
      reviewer.id,
      reviewer.documentVersionId,
      reviewer.organizationId,
      reviewer.userId,
      reviewer.status,
      reviewer.completedAt,
      reviewer.comment,
      reviewer.createdAt,
    );
  }

  async updateStatus(id: string, organizationId: string, status: ReviewStatus, comment?: string | null): Promise<DocumentReviewer> {
    const reviewer = await this.prisma.documentReviewer.update({
      where: { id },
      data: {
        status,
        ...(comment !== undefined && { comment }),
        ...(status === ReviewStatus.COMPLETED && { completedAt: new Date() }),
      },
      select: {
        id: true,
        documentVersionId: true,
        organizationId: true,
        userId: true,
        status: true,
        completedAt: true,
        comment: true,
        createdAt: true,
      },
    });

    if (reviewer.organizationId !== organizationId) {
      throw new Error('DocumentReviewerNotFound');
    }

    return new DocumentReviewer(
      reviewer.id,
      reviewer.documentVersionId,
      reviewer.organizationId,
      reviewer.userId,
      reviewer.status,
      reviewer.completedAt,
      reviewer.comment,
      reviewer.createdAt,
    );
  }
}
