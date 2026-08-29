import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './services/documents.service';
import { DocumentRepository } from './repositories/document.repository';
import { DocumentVersionRepository } from './repositories/document-version.repository';
import { DocumentReviewerRepository } from './repositories/document-reviewer.repository';
import { DocumentApprovalRepository } from './repositories/document-approval.repository';
import { DocumentDistributionRepository } from './repositories/document-distribution.repository';
import { PrismaService } from '../../database/prisma.service';
import { ConcurrencyService } from '../../common/services/concurrency.service';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DocumentStatus, ApprovalStatus } from '@prisma/client';
import { AuditLogService } from '../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../security-events/services/security-event.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepository: jest.Mocked<DocumentRepository>;
  let documentApprovalRepository: jest.Mocked<DocumentApprovalRepository>;

  const mockDocument = {
    id: 'doc-1',
    organizationId: 'org-1',
    documentTypeId: 'type-1',
    code: 'DOC-001',
    title: 'Test Document',
    description: 'Test',
    processId: null,
    departmentId: null,
    ownerId: 'user-1',
    responsibleId: 'user-2',
    classification: 'INTERNAL',
    confidentiality: 'CONFIDENTIAL',
    status: 'DRAFT' as DocumentStatus,
    currentVersionId: null,
    issueDate: null,
    reviewDate: null,
    nextReviewDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: DocumentRepository, useValue: {
          findById: jest.fn(),
          findListByOrganization: jest.fn(),
          findDuplicate: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          updateStatus: jest.fn(),
          setCurrentVersion: jest.fn(),
        }},
        { provide: DocumentVersionRepository, useValue: {
          findById: jest.fn(),
          findByDocument: jest.fn(),
          findDuplicate: jest.fn(),
          create: jest.fn(),
          updateStatus: jest.fn(),
        }},
        { provide: DocumentReviewerRepository, useValue: {
          findById: jest.fn(),
          findByDocumentVersion: jest.fn(),
          create: jest.fn(),
          updateStatus: jest.fn(),
        }},
        { provide: DocumentApprovalRepository, useValue: {
          findById: jest.fn(),
          findByDocumentVersion: jest.fn(),
          create: jest.fn(),
          updateStatus: jest.fn(),
        }},
        { provide: DocumentDistributionRepository, useValue: {
          findById: jest.fn(),
          findByDocument: jest.fn(),
          create: jest.fn(),
          findExisting: jest.fn(),
          createAcknowledgement: jest.fn(),
        }},
        { provide: PrismaService, useValue: { $transaction: jest.fn() } },
        { provide: ConcurrencyService, useValue: { validateIfMatch: jest.fn() } },
        { provide: AuditLogService, useValue: { recordEvent: jest.fn() } },
        { provide: SecurityEventService, useValue: { recordEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get(DocumentsService);
    documentRepository = module.get(DocumentRepository);
    documentApprovalRepository = module.get(DocumentApprovalRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDocument', () => {
    it('should create document when code is unique', async () => {
      documentRepository.findDuplicate.mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.create.mockResolvedValue(mockDocument as any);

      const result = await service.createDocument('org-1', 'user-1', {
        code: 'DOC-001',
        title: 'Test Document',
        documentTypeId: 'type-1',
        ownerId: 'user-1',
        responsibleId: 'user-2',
        classification: 'INTERNAL',
        confidentiality: 'CONFIDENTIAL',
      });

      expect(result).toBeDefined();
      expect(documentRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when duplicate code exists', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findDuplicate.mockResolvedValue(mockDocument as any);

      await expect(service.createDocument('org-1', 'user-1', {
        code: 'DOC-001',
        title: 'Test Document',
        documentTypeId: 'type-1',
        ownerId: 'user-1',
        responsibleId: 'user-2',
        classification: 'INTERNAL',
        confidentiality: 'CONFIDENTIAL',
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('submitDocument', () => {
    it('should submit document when status is DRAFT', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(mockDocument as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.updateStatus.mockResolvedValue(mockDocument as any);

      await service.submitDocument('org-1', 'doc-1', 'user-1');
      expect(documentRepository.updateStatus).toHaveBeenCalledWith('doc-1', 'org-1', DocumentStatus.IN_REVIEW, 'user-1');
    });

    it('should submit document when status is REJECTED', async () => {
      const rejectedDoc = { ...mockDocument, status: DocumentStatus.REJECTED };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(rejectedDoc as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.updateStatus.mockResolvedValue(rejectedDoc as any);

      await service.submitDocument('org-1', 'doc-1', 'user-1');
      expect(documentRepository.updateStatus).toHaveBeenCalledWith('doc-1', 'org-1', DocumentStatus.IN_REVIEW, 'user-1');
    });

    it('should throw BadRequestException when status is APPROVED', async () => {
      const approvedDoc = { ...mockDocument, status: DocumentStatus.APPROVED };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(approvedDoc as any);

      await expect(service.submitDocument('org-1', 'doc-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when status is CURRENT', async () => {
      const currentDoc = { ...mockDocument, status: DocumentStatus.CURRENT };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(currentDoc as any);

      await expect(service.submitDocument('org-1', 'doc-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('publishDocument', () => {
    it('should publish document when status is APPROVED', async () => {
      const approvedDoc = { ...mockDocument, status: DocumentStatus.APPROVED };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(approvedDoc as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.updateStatus.mockResolvedValue(approvedDoc as any);

      await service.publishDocument('org-1', 'doc-1', 'user-1');
      expect(documentRepository.updateStatus).toHaveBeenCalledWith('doc-1', 'org-1', DocumentStatus.PUBLISHED, 'user-1');
    });

    it('should throw BadRequestException when status is DRAFT', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(mockDocument as any);

      await expect(service.publishDocument('org-1', 'doc-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when status is PENDING_APPROVAL', async () => {
      const pendingDoc = { ...mockDocument, status: DocumentStatus.PENDING_APPROVAL };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(pendingDoc as any);

      await expect(service.publishDocument('org-1', 'doc-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('obsoleteDocument', () => {
    it('should obsolete document when status is PUBLISHED', async () => {
      const publishedDoc = { ...mockDocument, status: DocumentStatus.PUBLISHED };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(publishedDoc as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.updateStatus.mockResolvedValue(publishedDoc as any);

      await service.obsoleteDocument('org-1', 'doc-1', 'user-1');
      expect(documentRepository.updateStatus).toHaveBeenCalledWith('doc-1', 'org-1', DocumentStatus.OBSOLETE, 'user-1');
    });

    it('should obsolete document when status is CURRENT', async () => {
      const currentDoc = { ...mockDocument, status: DocumentStatus.CURRENT };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(currentDoc as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.updateStatus.mockResolvedValue(currentDoc as any);

      await service.obsoleteDocument('org-1', 'doc-1', 'user-1');
      expect(documentRepository.updateStatus).toHaveBeenCalledWith('doc-1', 'org-1', DocumentStatus.OBSOLETE, 'user-1');
    });

    it('should throw BadRequestException when status is DRAFT', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(mockDocument as any);

      await expect(service.obsoleteDocument('org-1', 'doc-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveDocument', () => {
    it('should approve document when user is approver', async () => {
      const pendingDoc = { ...mockDocument, status: DocumentStatus.PENDING_APPROVAL, currentVersionId: 'ver-1' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(pendingDoc as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.updateStatus.mockResolvedValue(pendingDoc as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentApprovalRepository.findByDocumentVersion.mockResolvedValue([{ userId: 'user-1', status: ApprovalStatus.PENDING }] as any);

      await service.approveDocument('org-1', 'doc-1', 'user-1');
      expect(documentRepository.updateStatus).toHaveBeenCalledWith('doc-1', 'org-1', DocumentStatus.APPROVED, 'user-1');
    });

    it('should throw ForbiddenException when user is not approver', async () => {
      const pendingDoc = { ...mockDocument, status: DocumentStatus.PENDING_APPROVAL, currentVersionId: 'ver-1' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(pendingDoc as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentApprovalRepository.findByDocumentVersion.mockResolvedValue([{ userId: 'user-2', status: ApprovalStatus.PENDING }] as any);

      await expect(service.approveDocument('org-1', 'doc-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('distributeDocument', () => {
    it('should throw BadRequestException when no recipients provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(mockDocument as any);

      await expect(service.distributeDocument('org-1', 'doc-1', {
        documentVersionId: 'ver-1',
      })).rejects.toThrow(BadRequestException);
    });

    it('should distribute to users', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(mockDocument as any);
      const mockPrisma = { $transaction: jest.fn() } as jest.Mocked<PrismaService>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).prisma = mockPrisma;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tx: any = {
          documentDistribution: {
            create: jest.fn().mockResolvedValue({
              id: 'dist-1',
              documentId: 'doc-1',
              documentVersionId: 'ver-1',
              organizationId: 'org-1',
              assignedToUserId: 'user-1',
              assignedToDepartmentId: null,
              assignedToRoleId: null,
              status: 'PENDING',
              createdAt: new Date(),
            }),
          },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return fn(tx);
      });

      const result = await service.distributeDocument('org-1', 'doc-1', {
        documentVersionId: 'ver-1',
        assignedToUserIds: ['user-1'],
      });

      expect(result).toHaveLength(1);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getDocument', () => {
    it('should return document when found in same tenant', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentRepository.findById.mockResolvedValue(mockDocument as any);

      const result = await service.getDocument('org-1', 'doc-1');
      expect(result).toEqual(mockDocument);
    });

    it('should throw NotFoundException when document not found', async () => {
      documentRepository.findById.mockResolvedValue(null);

      await expect(service.getDocument('org-1', 'doc-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('lifecycle transition matrix', () => {
    const transitions = [
      { from: 'DRAFT', to: 'APPROVED', action: 'approveDocument' },
      { from: 'DRAFT', to: 'CURRENT', action: 'publishDocument' },
      { from: 'CURRENT', to: 'DRAFT', action: 'submitDocument' },
      { from: 'OBSOLETE', to: 'CURRENT', action: 'publishDocument' },
      { from: 'CANCELLED', to: 'CURRENT', action: 'publishDocument' },
      { from: 'REJECTED', to: 'APPROVED', action: 'approveDocument' },
    ];

    transitions.forEach(({ from, to, action }) => {
      it(`should reject invalid transition ${from} -> ${to} via ${action}`, async () => {
        const doc = { ...mockDocument, status: from as DocumentStatus };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        documentRepository.findById.mockResolvedValue(doc as any);

        await expect(service[action]('org-1', 'doc-1', 'user-1')).rejects.toThrow(BadRequestException);
      });
    });
  });
});
