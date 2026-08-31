import { Test, TestingModule } from '@nestjs/testing';
import { DocumentRepository } from '../../modules/documents/repositories/document.repository';
import { ProcessRepository } from '../../modules/processes/repositories/process.repository';
import { AuditRepository } from '../../modules/audits/repositories/audit.repository';
import { AuditProgramRepository } from '../../modules/audits/repositories/audit-program.repository';
import { NonconformityRepository } from '../../modules/nonconformities/repositories/nonconformity.repository';
import { CorrectiveActionRepository } from '../../modules/nonconformities/repositories/corrective-action.repository';
import { RiskRepository } from '../../modules/risks/repositories/risk.repository';
import { RiskTreatmentRepository } from '../../modules/risks/repositories/risk-treatment.repository';
import { PrismaService } from '../../database/prisma.service';

describe('Cross-Tenant Update Protection (Repository-level)', () => {
  const mockPrismaService = {
    document: { findFirstOrThrow: jest.fn(), update: jest.fn() },
    process: { findFirstOrThrow: jest.fn(), update: jest.fn() },
    audit: { findFirstOrThrow: jest.fn(), update: jest.fn() },
    auditProgram: { findFirstOrThrow: jest.fn(), update: jest.fn() },
    nonconformity: { findFirstOrThrow: jest.fn(), update: jest.fn() },
    correctiveAction: { findFirstOrThrow: jest.fn(), update: jest.fn() },
    risk: { findFirstOrThrow: jest.fn(), update: jest.fn() },
    riskTreatment: { findFirstOrThrow: jest.fn(), update: jest.fn() },
  } as unknown as jest.Mocked<PrismaService>;

  let documentRepo: DocumentRepository;
  let processRepo: ProcessRepository;
  let auditRepo: AuditRepository;
  let auditProgramRepo: AuditProgramRepository;
  let nonconformityRepo: NonconformityRepository;
  let correctiveActionRepo: CorrectiveActionRepository;
  let riskRepo: RiskRepository;
  let riskTreatmentRepo: RiskTreatmentRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentRepository,
        ProcessRepository,
        AuditRepository,
        AuditProgramRepository,
        NonconformityRepository,
        CorrectiveActionRepository,
        RiskRepository,
        RiskTreatmentRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    documentRepo = module.get(DocumentRepository);
    processRepo = module.get(ProcessRepository);
    auditRepo = module.get(AuditRepository);
    auditProgramRepo = module.get(AuditProgramRepository);
    nonconformityRepo = module.get(NonconformityRepository);
    correctiveActionRepo = module.get(CorrectiveActionRepository);
    riskRepo = module.get(RiskRepository);
    riskTreatmentRepo = module.get(RiskTreatmentRepository);
  });

  describe('DocumentRepository.update', () => {
    it('should throw before update when document belongs to another tenant', async () => {
      mockPrismaService.document.findFirstOrThrow.mockRejectedValueOnce(new Error('NotFound'));

      await expect(documentRepo.update('doc-1', 'org-a', { updatedById: 'user-1' })).rejects.toThrow();
      expect(mockPrismaService.document.update).not.toHaveBeenCalled();
    });

    it('should proceed with update when document belongs to same tenant', async () => {
      mockPrismaService.document.findFirstOrThrow.mockResolvedValueOnce({ id: 'doc-1', organizationId: 'org-1' });
      mockPrismaService.document.update.mockResolvedValueOnce({
        id: 'doc-1', organizationId: 'org-1', documentTypeId: 'dt-1', code: 'DOC-001',
        title: 'Test', description: null, processId: null, departmentId: null,
        ownerId: null, responsibleId: null, classification: 'OPERATIONAL',
        confidentiality: 'PUBLIC', status: 'DRAFT', currentVersionId: null,
        issueDate: null, reviewDate: null, nextReviewDate: null,
        createdAt: new Date(), updatedAt: new Date(),
      });

      await documentRepo.update('doc-1', 'org-1', { updatedById: 'user-1' });
      expect(mockPrismaService.document.update).toHaveBeenCalled();
    });
  });

  describe('ProcessRepository.update', () => {
    it('should throw before update when process belongs to another tenant', async () => {
      mockPrismaService.process.findFirstOrThrow.mockRejectedValueOnce(new Error('NotFound'));

      await expect(processRepo.update('proc-1', 'org-a', { code: 'NEW', name: 'New', updatedById: 'user-1' })).rejects.toThrow();
      expect(mockPrismaService.process.update).not.toHaveBeenCalled();
    });
  });

  describe('AuditRepository.update', () => {
    it('should throw before update when audit belongs to another tenant', async () => {
      mockPrismaService.audit.findFirstOrThrow.mockRejectedValueOnce(new Error('NotFound'));

      await expect(auditRepo.update('audit-1', 'org-a', { status: 'COMPLETED' })).rejects.toThrow();
      expect(mockPrismaService.audit.update).not.toHaveBeenCalled();
    });
  });

  describe('AuditProgramRepository.update', () => {
    it('should throw before update when audit program belongs to another tenant', async () => {
      mockPrismaService.auditProgram.findFirstOrThrow.mockRejectedValueOnce(new Error('NotFound'));

      await expect(auditProgramRepo.update('prog-1', 'org-a', { name: 'New Name' })).rejects.toThrow();
      expect(mockPrismaService.auditProgram.update).not.toHaveBeenCalled();
    });
  });

  describe('NonconformityRepository.update', () => {
    it('should throw before update when nonconformity belongs to another tenant', async () => {
      mockPrismaService.nonconformity.findFirstOrThrow.mockRejectedValueOnce(new Error('NotFound'));

      await expect(nonconformityRepo.update('nc-1', 'org-a', { status: 'CLOSED' })).rejects.toThrow();
      expect(mockPrismaService.nonconformity.update).not.toHaveBeenCalled();
    });
  });

  describe('CorrectiveActionRepository.update', () => {
    it('should throw before update when corrective action belongs to another tenant', async () => {
      mockPrismaService.correctiveAction.findFirstOrThrow.mockRejectedValueOnce(new Error('NotFound'));

      await expect(correctiveActionRepo.update('ca-1', 'org-a', { status: 'COMPLETED' })).rejects.toThrow();
      expect(mockPrismaService.correctiveAction.update).not.toHaveBeenCalled();
    });
  });

  describe('RiskRepository.update', () => {
    it('should throw before update when risk belongs to another tenant', async () => {
      mockPrismaService.risk.findFirstOrThrow.mockRejectedValueOnce(new Error('NotFound'));

      await expect(riskRepo.update('risk-1', 'org-a', { status: 'CLOSED' })).rejects.toThrow();
      expect(mockPrismaService.risk.update).not.toHaveBeenCalled();
    });
  });

  describe('RiskTreatmentRepository.update', () => {
    it('should throw before update when risk treatment belongs to another tenant', async () => {
      mockPrismaService.riskTreatment.findFirstOrThrow.mockRejectedValueOnce(new Error('NotFound'));

      await expect(riskTreatmentRepo.update('treatment-1', 'org-a', { status: 'COMPLETED' })).rejects.toThrow();
      expect(mockPrismaService.riskTreatment.update).not.toHaveBeenCalled();
    });
  });
});
