import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from '../services/documents.service';
import { DocumentRepository } from '../repositories/document.repository';
import { DocumentVersionRepository } from '../repositories/document-version.repository';
import { DocumentReviewerRepository } from '../repositories/document-reviewer.repository';
import { DocumentApprovalRepository } from '../repositories/document-approval.repository';
import { DocumentDistributionRepository } from '../repositories/document-distribution.repository';
import { PrismaService } from '../../../database/prisma.service';
import { ConcurrencyService } from '../../../common/services/concurrency.service';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { validate } from 'class-validator';

describe('DocumentsService - Document Creation (Defect A)', () => {
  let service: DocumentsService;
  let documentRepository: jest.Mocked<DocumentRepository>;

  const mockDocumentRepository = {
    findById: jest.fn(),
    findDuplicate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    findListByOrganization: jest.fn(),
    setCurrentVersion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: DocumentRepository, useValue: mockDocumentRepository },
        { provide: DocumentVersionRepository, useValue: {
          findDuplicate: jest.fn(),
          create: jest.fn(),
          findByDocument: jest.fn(),
          findById: jest.fn(),
        }},
        { provide: DocumentReviewerRepository, useValue: {
          updateStatus: jest.fn(),
          findByDocument: jest.fn(),
        }},
        { provide: DocumentApprovalRepository, useValue: {
          findByDocumentVersion: jest.fn(),
        }},
        { provide: DocumentDistributionRepository, useValue: {
          findByDocument: jest.fn(),
          findById: jest.fn(),
          findExisting: jest.fn(),
          createAcknowledgement: jest.fn(),
          createMany: jest.fn(),
        }},
        { provide: PrismaService, useValue: { $queryRaw: jest.fn(), $transaction: jest.fn() } },
        { provide: ConcurrencyService, useValue: { validateIfMatch: jest.fn() } },
        { provide: AuditLogService, useValue: { recordEvent: jest.fn() } },
        { provide: SecurityEventService, useValue: { recordEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get(DocumentsService);
    documentRepository = module.get(DocumentRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDocument', () => {
    it('should create document with valid UUID documentTypeId', async () => {
      const dto = new CreateDocumentDto();
      dto.code = 'DOC-001';
      dto.title = 'Test Document';
      dto.documentTypeId = '123e4567-e89b-12d3-a456-426614174000';
      dto.ownerId = '123e4567-e89b-12d3-a456-426614174000';
      dto.responsibleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.classification = 'INTERNAL';
      dto.confidentiality = 'INTERNAL';

      documentRepository.findDuplicate.mockResolvedValue(null);
      documentRepository.create.mockResolvedValue({
        id: 'doc-1', organizationId: 'org-1', documentTypeId: '123e4567-e89b-12d3-a456-426614174000',
        code: 'DOC-001', title: 'Test Document', description: null,
        processId: null, departmentId: null, ownerId: '123e4567-e89b-12d3-a456-426614174000',
        responsibleId: '123e4567-e89b-12d3-a456-426614174000', classification: 'INTERNAL',
        confidentiality: 'INTERNAL', status: 'DRAFT', currentVersionId: null,
        issueDate: null, reviewDate: null, nextReviewDate: null,
        createdAt: new Date(), updatedAt: new Date(),
      } as unknown as import('../entities/document.entity').Document);

      const result = await service.createDocument('org-1', 'user-1', dto);
      expect(result).toBeDefined();
      expect(result.documentTypeId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should reject invalid UUID for documentTypeId via DTO validation', async () => {
      const dto = new CreateDocumentDto();
      dto.code = 'DOC-001';
      dto.title = 'Test';
      dto.documentTypeId = 'not-a-uuid';
      dto.ownerId = '123e4567-e89b-12d3-a456-426614174000';
      dto.responsibleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.classification = 'INTERNAL';
      dto.confidentiality = 'CONFIDENTIAL';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'documentTypeId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });

    it('should reject empty documentTypeId via DTO validation', async () => {
      const dto = new CreateDocumentDto();
      dto.code = 'DOC-001';
      dto.title = 'Test';
      dto.documentTypeId = '';
      dto.ownerId = '123e4567-e89b-12d3-a456-426614174000';
      dto.responsibleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.classification = 'INTERNAL';
      dto.confidentiality = 'CONFIDENTIAL';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'documentTypeId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });

    it('should reject short invalid UUID for documentTypeId', async () => {
      const dto = new CreateDocumentDto();
      dto.code = 'DOC-001';
      dto.title = 'Test';
      dto.documentTypeId = '1234';
      dto.ownerId = '123e4567-e89b-12d3-a456-426614174000';
      dto.responsibleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.classification = 'INTERNAL';
      dto.confidentiality = 'CONFIDENTIAL';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'documentTypeId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });

    it('should reject missing documentTypeId via DTO validation', async () => {
      const dto = new CreateDocumentDto();
      dto.code = 'DOC-001';
      dto.title = 'Test';
      dto.ownerId = '123e4567-e89b-12d3-a456-426614174000';
      dto.responsibleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.classification = 'INTERNAL';
      dto.confidentiality = 'CONFIDENTIAL';

      const errors = await validate(dto);
      const uuidErrors = errors.filter(e => e.property === 'documentTypeId');
      expect(uuidErrors.length).toBeGreaterThan(0);
    });
  });
});
