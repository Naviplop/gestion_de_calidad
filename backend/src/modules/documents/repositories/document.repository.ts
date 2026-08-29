import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Document, DocumentListItem } from '../entities/document.entity';
import { DocumentClassification, DocumentConfidentiality, DocumentStatus } from '@prisma/client';

@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<Document | null> {
    const document = await this.prisma.document.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        documentTypeId: true,
        code: true,
        title: true,
        description: true,
        processId: true,
        departmentId: true,
        ownerId: true,
        responsibleId: true,
        classification: true,
        confidentiality: true,
        status: true,
        currentVersionId: true,
        issueDate: true,
        reviewDate: true,
        nextReviewDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!document) {
      return null;
    }

    return new Document(
      document.id,
      document.organizationId,
      document.documentTypeId,
      document.code,
      document.title,
      document.description,
      document.processId,
      document.departmentId,
      document.ownerId,
      document.responsibleId,
      document.classification,
      document.confidentiality,
      document.status,
      document.currentVersionId,
      document.issueDate,
      document.reviewDate,
      document.nextReviewDate,
      document.createdAt,
      document.updatedAt,
    );
  }

  async findListByOrganization(
    organizationId: string,
    page: number,
    pageSize: number,
    search?: string,
    status?: string,
    documentTypeId?: string,
    processId?: string,
    departmentId?: string,
    ownerId?: string,
    classification?: string,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<{ data: DocumentListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = { organizationId };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as DocumentStatus;
    }

    if (documentTypeId) {
      where.documentTypeId = documentTypeId;
    }

    if (processId) {
      where.processId = processId;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (classification) {
      where.classification = classification as DocumentClassification;
    }

    const orderBy: Record<string, string> = {};
    if (sortBy && ['createdAt', 'updatedAt', 'code', 'title', 'nextReviewDate'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          documentTypeId: true,
          documentType: { select: { id: true, name: true } },
          processId: true,
          departmentId: true,
          ownerId: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
          responsibleId: true,
          responsible: { select: { id: true, firstName: true, lastName: true } },
          classification: true,
          confidentiality: true,
          status: true,
          currentVersionId: true,
          currentVersion: {
            select: {
              id: true,
              versionMajor: true,
              versionMinor: true,
              versionLabel: true,
              status: true,
              createdAt: true,
            },
          },
          issueDate: true,
          reviewDate: true,
          nextReviewDate: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    const data = documents.map((d) => new DocumentListItem(
      d.id,
      d.code,
      d.title,
      d.description,
      d.documentTypeId,
      d.documentType ? { id: d.documentType.id, name: d.documentType.name } : null,
      d.processId,
      d.departmentId,
      d.ownerId,
      d.owner ? { id: d.owner.id, firstName: d.owner.firstName, lastName: d.owner.lastName } : null,
      d.responsibleId,
      d.responsible ? { id: d.responsible.id, firstName: d.responsible.firstName, lastName: d.responsible.lastName } : null,
      d.classification,
      d.confidentiality,
      d.status,
      d.currentVersionId,
      d.currentVersion ? {
        id: d.currentVersion.id,
        versionMajor: d.currentVersion.versionMajor,
        versionMinor: d.currentVersion.versionMinor,
        versionLabel: d.currentVersion.versionLabel,
        status: d.currentVersion.status,
        createdAt: d.currentVersion.createdAt,
      } : null,
      d.issueDate,
      d.reviewDate,
      d.nextReviewDate,
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

  async findDuplicate(organizationId: string, code: string, excludeId?: string): Promise<Document | null> {
    const where: Record<string, unknown> = {
      organizationId,
      code,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const document = await this.prisma.document.findFirst({ where });

    if (!document) {
      return null;
    }

    return new Document(
      document.id,
      document.organizationId,
      document.documentTypeId,
      document.code,
      document.title,
      document.description,
      document.processId,
      document.departmentId,
      document.ownerId,
      document.responsibleId,
      document.classification,
      document.confidentiality,
      document.status,
      document.currentVersionId,
      document.issueDate,
      document.reviewDate,
      document.nextReviewDate,
      document.createdAt,
      document.updatedAt,
    );
  }

  async create(organizationId: string, data: {
    code: string;
    title: string;
    description?: string | null;
    documentTypeId: string;
    processId?: string | null;
    departmentId?: string | null;
    ownerId: string;
    responsibleId: string;
    classification: DocumentClassification;
    confidentiality: DocumentConfidentiality;
    issueDate?: Date | null;
    reviewDate?: Date | null;
    nextReviewDate?: Date | null;
    createdById: string;
    updatedById: string;
  }): Promise<Document> {
    const document = await this.prisma.document.create({
      data: {
        organizationId,
        code: data.code,
        title: data.title,
        description: data.description,
        documentTypeId: data.documentTypeId,
        processId: data.processId,
        departmentId: data.departmentId,
        ownerId: data.ownerId,
        responsibleId: data.responsibleId,
        classification: data.classification,
        confidentiality: data.confidentiality,
        status: DocumentStatus.DRAFT,
        issueDate: data.issueDate,
        reviewDate: data.reviewDate,
        nextReviewDate: data.nextReviewDate,
        createdById: data.createdById,
        updatedById: data.updatedById,
      },
      select: {
        id: true,
        organizationId: true,
        documentTypeId: true,
        code: true,
        title: true,
        description: true,
        processId: true,
        departmentId: true,
        ownerId: true,
        responsibleId: true,
        classification: true,
        confidentiality: true,
        status: true,
        currentVersionId: true,
        issueDate: true,
        reviewDate: true,
        nextReviewDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new Document(
      document.id,
      document.organizationId,
      document.documentTypeId,
      document.code,
      document.title,
      document.description,
      document.processId,
      document.departmentId,
      document.ownerId,
      document.responsibleId,
      document.classification,
      document.confidentiality,
      document.status,
      document.currentVersionId,
      document.issueDate,
      document.reviewDate,
      document.nextReviewDate,
      document.createdAt,
      document.updatedAt,
    );
  }

  async update(id: string, organizationId: string, data: {
    title?: string;
    description?: string | null;
    processId?: string | null;
    departmentId?: string | null;
    ownerId?: string;
    responsibleId?: string;
    classification?: DocumentClassification;
    confidentiality?: DocumentConfidentiality;
    nextReviewDate?: Date | null;
    updatedById: string;
  }): Promise<Document> {
    const document = await this.prisma.document.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.processId !== undefined && { processId: data.processId }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
        ...(data.responsibleId !== undefined && { responsibleId: data.responsibleId }),
        ...(data.classification !== undefined && { classification: data.classification }),
        ...(data.confidentiality !== undefined && { confidentiality: data.confidentiality }),
        ...(data.nextReviewDate !== undefined && { nextReviewDate: data.nextReviewDate }),
        updatedById: data.updatedById,
      },
      select: {
        id: true,
        organizationId: true,
        documentTypeId: true,
        code: true,
        title: true,
        description: true,
        processId: true,
        departmentId: true,
        ownerId: true,
        responsibleId: true,
        classification: true,
        confidentiality: true,
        status: true,
        currentVersionId: true,
        issueDate: true,
        reviewDate: true,
        nextReviewDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (document.organizationId !== organizationId) {
      throw new NotFoundException('DocumentNotFound');
    }

    return new Document(
      document.id,
      document.organizationId,
      document.documentTypeId,
      document.code,
      document.title,
      document.description,
      document.processId,
      document.departmentId,
      document.ownerId,
      document.responsibleId,
      document.classification,
      document.confidentiality,
      document.status,
      document.currentVersionId,
      document.issueDate,
      document.reviewDate,
      document.nextReviewDate,
      document.createdAt,
      document.updatedAt,
    );
  }

  async updateStatus(id: string, organizationId: string, status: DocumentStatus, updatedById: string): Promise<Document> {
    const document = await this.prisma.document.update({
      where: { id },
      data: {
        status,
        updatedById,
      },
      select: {
        id: true,
        organizationId: true,
        documentTypeId: true,
        code: true,
        title: true,
        description: true,
        processId: true,
        departmentId: true,
        ownerId: true,
        responsibleId: true,
        classification: true,
        confidentiality: true,
        status: true,
        currentVersionId: true,
        issueDate: true,
        reviewDate: true,
        nextReviewDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (document.organizationId !== organizationId) {
      throw new NotFoundException('DocumentNotFound');
    }

    return new Document(
      document.id,
      document.organizationId,
      document.documentTypeId,
      document.code,
      document.title,
      document.description,
      document.processId,
      document.departmentId,
      document.ownerId,
      document.responsibleId,
      document.classification,
      document.confidentiality,
      document.status,
      document.currentVersionId,
      document.issueDate,
      document.reviewDate,
      document.nextReviewDate,
      document.createdAt,
      document.updatedAt,
    );
  }

  async setCurrentVersion(documentId: string, organizationId: string, versionId: string): Promise<Document> {
    const document = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        currentVersionId: versionId,
      },
      select: {
        id: true,
        organizationId: true,
        documentTypeId: true,
        code: true,
        title: true,
        description: true,
        processId: true,
        departmentId: true,
        ownerId: true,
        responsibleId: true,
        classification: true,
        confidentiality: true,
        status: true,
        currentVersionId: true,
        issueDate: true,
        reviewDate: true,
        nextReviewDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (document.organizationId !== organizationId) {
      throw new NotFoundException('DocumentNotFound');
    }

    return new Document(
      document.id,
      document.organizationId,
      document.documentTypeId,
      document.code,
      document.title,
      document.description,
      document.processId,
      document.departmentId,
      document.ownerId,
      document.responsibleId,
      document.classification,
      document.confidentiality,
      document.status,
      document.currentVersionId,
      document.issueDate,
      document.reviewDate,
      document.nextReviewDate,
      document.createdAt,
      document.updatedAt,
    );
  }
}
