import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DocumentRepository } from '../repositories/document.repository';
import { DocumentVersionRepository } from '../repositories/document-version.repository';
import { DocumentReviewerRepository } from '../repositories/document-reviewer.repository';
import { DocumentApprovalRepository } from '../repositories/document-approval.repository';
import { DocumentDistributionRepository } from '../repositories/document-distribution.repository';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { CreateDocumentVersionDto } from '../dto/create-document-version.dto';
import { Document, DocumentListItem, DocumentVersion, DocumentDistribution, DocumentAcknowledgement } from '../entities/document.entity';
import { DocumentStatus, ReviewStatus, DocumentClassification, DocumentConfidentiality } from '@prisma/client';
import { ConcurrencyService } from '../../../common/services/concurrency.service';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly documentVersionRepository: DocumentVersionRepository,
    private readonly documentReviewerRepository: DocumentReviewerRepository,
    private readonly documentApprovalRepository: DocumentApprovalRepository,
    private readonly documentDistributionRepository: DocumentDistributionRepository,
    private readonly prisma: PrismaService,
    private readonly concurrencyService: ConcurrencyService,
    private readonly auditLogService: AuditLogService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  private async recordAuditEvent(params: {
    organizationId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
    correlationId?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.recordEvent({
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        payload: params.payload,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        correlationId: params.correlationId,
      });
    } catch {
      // Audit logging failure must not break business operations
    }
  }

  private async recordSecurityEvent(params: {
    organizationId: string;
    actorId: string;
    eventType: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
    correlationId?: string;
  }): Promise<void> {
    try {
      await this.securityEventService.recordEvent({
        organizationId: params.organizationId,
        actorId: params.actorId,
        eventType: params.eventType,
        severity: params.severity,
        description: params.description,
        metadata: params.metadata,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        correlationId: params.correlationId,
      });
    } catch {
      // Audit logging failure must not break business operations
    }
  }

  async listDocuments(organizationId: string, page: number, pageSize: number, search?: string, status?: string, documentTypeId?: string, processId?: string, departmentId?: string, ownerId?: string, classification?: string, sortBy?: string, sortOrder?: string): Promise<{ data: DocumentListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    return this.documentRepository.findListByOrganization(
      organizationId,
      page,
      pageSize,
      search,
      status,
      documentTypeId,
      processId,
      departmentId,
      ownerId,
      classification,
      sortBy,
      sortOrder,
    );
  }

  async getDocument(organizationId: string, id: string): Promise<Document> {
    const document = await this.documentRepository.findById(id, organizationId);
    if (!document) {
      throw new NotFoundException('DocumentNotFound');
    }
    return document;
  }

  async createDocument(organizationId: string, userId: string, dto: CreateDocumentDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Document> {
    const duplicate = await this.documentRepository.findDuplicate(organizationId, dto.code);
    if (duplicate) {
      throw new ConflictException('DuplicateDocumentCode');
    }

    const document = await this.documentRepository.create(organizationId, {
      code: dto.code,
      title: dto.title,
      description: dto.description,
      documentTypeId: dto.documentTypeId,
      processId: dto.processId,
      departmentId: dto.departmentId,
      ownerId: dto.ownerId,
      responsibleId: dto.responsibleId,
      classification: dto.classification as DocumentClassification,
      confidentiality: dto.confidentiality as DocumentConfidentiality,
      issueDate: dto.issueDate,
      reviewDate: dto.reviewDate,
      nextReviewDate: dto.nextReviewDate,
      createdById: userId,
      updatedById: userId,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'DOCUMENT_CREATED',
      entityType: 'Document',
      entityId: document.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return document;
  }

  async updateDocument(organizationId: string, id: string, userId: string, dto: UpdateDocumentDto, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<Document> {
    const existing = await this.documentRepository.findById(id, organizationId);
    if (!existing) {
      throw new NotFoundException('DocumentNotFound');
    }

    this.concurrencyService.validateIfMatch(existing, ifMatch);

    const document = await this.documentRepository.update(id, organizationId, {
      title: dto.title,
      description: dto.description,
      processId: dto.processId,
      departmentId: dto.departmentId,
      ownerId: dto.ownerId,
      responsibleId: dto.responsibleId,
      classification: dto.classification as DocumentClassification,
      confidentiality: dto.confidentiality as DocumentConfidentiality,
      nextReviewDate: dto.nextReviewDate,
      updatedById: userId,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'DOCUMENT_UPDATED',
      entityType: 'Document',
      entityId: document.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return document;
  }

  async submitDocument(organizationId: string, id: string, userId: string, _changeReason?: string, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<void> {
    const document = await this.documentRepository.findById(id, organizationId);
    if (!document) {
      throw new NotFoundException('DocumentNotFound');
    }

    this.concurrencyService.validateIfMatch(document, ifMatch);

    if (document.status !== DocumentStatus.DRAFT && document.status !== DocumentStatus.REJECTED) {
      throw new BadRequestException('InvalidStatusTransition');
    }

    await this.documentRepository.updateStatus(id, organizationId, DocumentStatus.IN_REVIEW, userId);

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'DOCUMENT_SUBMITTED',
      entityType: 'Document',
      entityId: document.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });
  }

  async approveDocument(organizationId: string, id: string, userId: string, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<void> {
    const document = await this.documentRepository.findById(id, organizationId);
    if (!document) {
      throw new NotFoundException('DocumentNotFound');
    }

    this.concurrencyService.validateIfMatch(document, ifMatch);

    if (document.status !== DocumentStatus.PENDING_APPROVAL) {
      throw new BadRequestException('InvalidStatusTransition');
    }

    const approvals = await this.documentApprovalRepository.findByDocumentVersion(document.currentVersionId!, organizationId);
    const userApproval = approvals.find((a) => a.userId === userId);
    if (!userApproval) {
      throw new ForbiddenException('UserNotApprover');
    }

    await this.documentRepository.updateStatus(id, organizationId, DocumentStatus.APPROVED, userId);

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'DOCUMENT_APPROVED',
      entityType: 'Document',
      entityId: document.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });
  }

  async rejectDocument(organizationId: string, id: string, userId: string, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<void> {
    const document = await this.documentRepository.findById(id, organizationId);
    if (!document) {
      throw new NotFoundException('DocumentNotFound');
    }

    this.concurrencyService.validateIfMatch(document, ifMatch);

    if (document.status !== DocumentStatus.PENDING_APPROVAL) {
      throw new BadRequestException('InvalidStatusTransition');
    }

    const approvals = await this.documentApprovalRepository.findByDocumentVersion(document.currentVersionId!, organizationId);
    const userApproval = approvals.find((a) => a.userId === userId);
    if (!userApproval) {
      throw new ForbiddenException('UserNotApprover');
    }

    await this.documentRepository.updateStatus(id, organizationId, DocumentStatus.REJECTED, userId);

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'DOCUMENT_REJECTED',
      entityType: 'Document',
      entityId: document.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });
  }

  async publishDocument(organizationId: string, id: string, userId: string, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<void> {
    const document = await this.documentRepository.findById(id, organizationId);
    if (!document) {
      throw new NotFoundException('DocumentNotFound');
    }

    this.concurrencyService.validateIfMatch(document, ifMatch);

    if (document.status !== DocumentStatus.APPROVED) {
      throw new BadRequestException('InvalidStatusTransition');
    }

    await this.documentRepository.updateStatus(id, organizationId, DocumentStatus.PUBLISHED, userId);

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'DOCUMENT_PUBLISHED',
      entityType: 'Document',
      entityId: document.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });
  }

  async obsoleteDocument(organizationId: string, id: string, userId: string, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<void> {
    const document = await this.documentRepository.findById(id, organizationId);
    if (!document) {
      throw new NotFoundException('DocumentNotFound');
    }

    this.concurrencyService.validateIfMatch(document, ifMatch);

    if (document.status !== DocumentStatus.PUBLISHED && document.status !== DocumentStatus.CURRENT) {
      throw new BadRequestException('InvalidStatusTransition');
    }

    await this.documentRepository.updateStatus(id, organizationId, DocumentStatus.OBSOLETE, userId);

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'DOCUMENT_OBSOLETED',
      entityType: 'Document',
      entityId: document.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });
  }

  async cancelDocument(organizationId: string, id: string, userId: string, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<void> {
    const document = await this.documentRepository.findById(id, organizationId);
    if (!document) {
      throw new NotFoundException('DocumentNotFound');
    }

    this.concurrencyService.validateIfMatch(document, ifMatch);

    if (document.status !== DocumentStatus.DRAFT && document.status !== DocumentStatus.IN_REVIEW) {
      throw new BadRequestException('InvalidStatusTransition');
    }

    await this.documentRepository.updateStatus(id, organizationId, DocumentStatus.CANCELLED, userId);

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'DOCUMENT_CANCELLED',
      entityType: 'Document',
      entityId: document.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });
  }

  async createDocumentVersion(organizationId: string, documentId: string, userId: string, dto: CreateDocumentVersionDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<DocumentVersion> {
    const document = await this.documentRepository.findById(documentId, organizationId);
    if (!document) {
      throw new NotFoundException('DocumentNotFound');
    }

    const duplicate = await this.documentVersionRepository.findDuplicate(documentId, dto.versionMajor, dto.versionMinor);
    if (duplicate) {
      throw new ConflictException('DuplicateVersion');
    }

    if (dto.versionMajor < 1 || dto.versionMinor < 0) {
      throw new BadRequestException('InvalidVersionNumber');
    }

    const version = await this.documentVersionRepository.create(organizationId, {
      documentId,
      versionMajor: dto.versionMajor,
      versionMinor: dto.versionMinor,
      versionLabel: dto.versionLabel || `${dto.versionMajor}.${dto.versionMinor}`,
      fileAssetId: dto.fileAssetId,
      fileHash: dto.fileHash,
      changeReason: dto.changeReason,
      createdById: userId,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId: userId,
      action: 'DOCUMENT_VERSION_CREATED',
      entityType: 'DocumentVersion',
      entityId: version.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return version;
  }

  async getDocumentVersions(organizationId: string, documentId: string, page: number, pageSize: number): Promise<{ data: DocumentVersion[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const document = await this.documentRepository.findById(documentId, organizationId);
    if (!document) {
      throw new NotFoundException('DocumentNotFound');
    }

    return this.documentVersionRepository.findByDocument(documentId, organizationId, page, pageSize);
  }

  async getDocumentVersion(organizationId: string, versionId: string): Promise<DocumentVersion> {
    const version = await this.documentVersionRepository.findById(versionId, organizationId);
    if (!version) {
      throw new NotFoundException('DocumentVersionNotFound');
    }
    return version;
  }

  async submitVersionForReview(organizationId: string, versionId: string): Promise<void> {
    const version = await this.documentVersionRepository.findById(versionId, organizationId);
    if (!version) {
      throw new NotFoundException('DocumentVersionNotFound');
    }

    if (version.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('InvalidStatusTransition');
    }

    await this.documentVersionRepository.updateStatus(versionId, organizationId, DocumentStatus.IN_REVIEW);
  }

  async reviewVersion(organizationId: string, versionId: string, userId: string, status: ReviewStatus, comment?: string): Promise<void> {
    const version = await this.documentVersionRepository.findById(versionId, organizationId);
    if (!version) {
      throw new NotFoundException('DocumentVersionNotFound');
    }

    await this.documentReviewerRepository.updateStatus(versionId, organizationId, status, comment);
  }

  async approveVersion(organizationId: string, versionId: string, userId: string): Promise<void> {
    const version = await this.documentVersionRepository.findById(versionId, organizationId);
    if (!version) {
      throw new NotFoundException('DocumentVersionNotFound');
    }

    if (version.status !== DocumentStatus.PENDING_APPROVAL) {
      throw new BadRequestException('InvalidStatusTransition');
    }

    await this.documentVersionRepository.updateStatus(versionId, organizationId, DocumentStatus.APPROVED, userId);
  }

  async rejectVersion(organizationId: string, versionId: string): Promise<void> {
    const version = await this.documentVersionRepository.findById(versionId, organizationId);
    if (!version) {
      throw new NotFoundException('DocumentVersionNotFound');
    }

    if (version.status !== DocumentStatus.PENDING_APPROVAL) {
      throw new BadRequestException('InvalidStatusTransition');
    }

    await this.documentVersionRepository.updateStatus(versionId, organizationId, DocumentStatus.REJECTED);
  }

  async publishVersion(organizationId: string, versionId: string, documentId: string): Promise<void> {
    const version = await this.documentVersionRepository.findById(versionId, organizationId);
    if (!version) {
      throw new NotFoundException('DocumentVersionNotFound');
    }

    if (version.status !== DocumentStatus.APPROVED) {
      throw new BadRequestException('InvalidStatusTransition');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.prisma.$transaction(async (tx: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tx.documentVersion.update({
        where: { id: versionId },
        data: { status: DocumentStatus.PUBLISHED },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tx.document.update({
        where: { id: documentId },
        data: { currentVersionId: versionId },
      });
    });
  }

  async distributeDocument(organizationId: string, documentId: string, data: {
    documentVersionId: string;
    assignedToUserIds?: string[];
    assignedToDepartmentIds?: string[];
    assignedToRoleIds?: string[];
    message?: string;
  }): Promise<DocumentDistribution[]> {
    const document = await this.documentRepository.findById(documentId, organizationId);
    if (!document) {
      throw new NotFoundException('DocumentNotFound');
    }

    const recipientCount = (data.assignedToUserIds?.length || 0) + (data.assignedToDepartmentIds?.length || 0) + (data.assignedToRoleIds?.length || 0);
    if (recipientCount === 0) {
      throw new BadRequestException('InvalidDistribution');
    }

    const distributions: DocumentDistribution[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.prisma.$transaction(async (tx: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (data.assignedToUserIds && data.assignedToUserIds.length > 0) {
        for (const userId of data.assignedToUserIds) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const distribution = await tx.documentDistribution.create({
            data: {
              organizationId,
              documentId,
              documentVersionId: data.documentVersionId,
              assignedToUserId: userId,
              status: 'PENDING',
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
          distributions.push(new DocumentDistribution(
            distribution.id,
            distribution.documentId,
            distribution.documentVersionId,
            distribution.organizationId,
            distribution.assignedToUserId,
            distribution.assignedToDepartmentId,
            distribution.assignedToRoleId,
            distribution.status,
            distribution.createdAt,
          ));
        }
      }

      if (data.assignedToDepartmentIds && data.assignedToDepartmentIds.length > 0) {
        for (const departmentId of data.assignedToDepartmentIds) {
          const distribution = await tx.documentDistribution.create({
            data: {
              organizationId,
              documentId,
              documentVersionId: data.documentVersionId,
              assignedToDepartmentId: departmentId,
              status: 'PENDING',
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
          distributions.push(new DocumentDistribution(
            distribution.id,
            distribution.documentId,
            distribution.documentVersionId,
            distribution.organizationId,
            distribution.assignedToUserId,
            distribution.assignedToDepartmentId,
            distribution.assignedToRoleId,
            distribution.status,
            distribution.createdAt,
          ));
        }
      }

      if (data.assignedToRoleIds && data.assignedToRoleIds.length > 0) {
        for (const roleId of data.assignedToRoleIds) {
          const distribution = await tx.documentDistribution.create({
            data: {
              organizationId,
              documentId,
              documentVersionId: data.documentVersionId,
              assignedToRoleId: roleId,
              status: 'PENDING',
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
          distributions.push(new DocumentDistribution(
            distribution.id,
            distribution.documentId,
            distribution.documentVersionId,
            distribution.organizationId,
            distribution.assignedToUserId,
            distribution.assignedToDepartmentId,
            distribution.assignedToRoleId,
            distribution.status,
            distribution.createdAt,
          ));
        }
      }
    });

    return distributions;
  }

  async getDocumentDistributions(organizationId: string, documentId: string): Promise<DocumentDistribution[]> {
    const document = await this.documentRepository.findById(documentId, organizationId);
    if (!document) {
      throw new NotFoundException('DocumentNotFound');
    }

    return this.documentDistributionRepository.findByDocument(documentId, organizationId);
  }

  async acknowledgeDistribution(organizationId: string, distributionId: string, userId: string, ipAddress?: string, userAgent?: string): Promise<DocumentAcknowledgement> {
    const distribution = await this.documentDistributionRepository.findById(distributionId, organizationId);
    if (!distribution) {
      throw new NotFoundException('DocumentDistributionNotFound');
    }

    const existing = await this.documentDistributionRepository.findExisting(distributionId, organizationId, userId);
    if (existing) {
      throw new ConflictException('AlreadyAcknowledged');
    }

    return this.documentDistributionRepository.createAcknowledgement(organizationId, {
      documentDistributionId: distributionId,
      userId,
      ipAddress,
      userAgent,
    });
  }
}
