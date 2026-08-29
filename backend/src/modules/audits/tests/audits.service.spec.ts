import { Test, TestingModule } from '@nestjs/testing';
import { AuditsService } from '../services/audits.service';
import { AuditProgramRepository } from '../repositories/audit-program.repository';
import { AuditRepository } from '../repositories/audit.repository';
import { AuditChecklistRepository } from '../repositories/audit-checklist.repository';
import { AuditChecklistItemRepository } from '../repositories/audit-checklist-item.repository';
import { AuditFindingRepository } from '../repositories/audit-finding.repository';
import { PrismaService } from '../../../database/prisma.service';
import { ConcurrencyService } from '../../../common/services/concurrency.service';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { AuditProgram, Audit, AuditFinding } from '../entities/audit.entity';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';

describe('AuditsService', () => {
  let service: AuditsService;
  let auditProgramRepository: jest.Mocked<AuditProgramRepository>;
  let auditRepository: jest.Mocked<AuditRepository>;
  let auditFindingRepository: jest.Mocked<AuditFindingRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditsService,
        { provide: AuditProgramRepository, useValue: {
          findById: jest.fn(),
          findListByOrganization: jest.fn(),
          findDuplicate: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        }},
        { provide: AuditRepository, useValue: {
          findById: jest.fn(),
          findListByOrganization: jest.fn(),
          findDuplicate: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        }},
        { provide: AuditChecklistRepository, useValue: {
          findById: jest.fn(),
          findByAudit: jest.fn(),
          create: jest.fn(),
        }},
        { provide: AuditChecklistItemRepository, useValue: {
          findById: jest.fn(),
          findByChecklist: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        }},
        { provide: AuditFindingRepository, useValue: {
          findById: jest.fn(),
          findByAudit: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        }},
        { provide: PrismaService, useValue: { $transaction: jest.fn() } },
        { provide: ConcurrencyService, useValue: { validateIfMatch: jest.fn() } },
        { provide: AuditLogService, useValue: { recordEvent: jest.fn() } },
        { provide: SecurityEventService, useValue: { recordEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuditsService>(AuditsService);
    auditProgramRepository = module.get(AuditProgramRepository);
    auditRepository = module.get(AuditRepository);
    auditFindingRepository = module.get(AuditFindingRepository);
  });

  describe('Audit Programs', () => {
    it('should create an audit program', async () => {
      const dto = {
        name: 'Audit Program 2024',
        description: 'Annual audit program',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-12-31'),
      };

      auditProgramRepository.findDuplicate.mockResolvedValue(null);
      auditProgramRepository.create.mockResolvedValue({
        id: 'prog-1',
        organizationId: 'org-1',
        name: dto.name,
        description: dto.description,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        responsibleId: null,
        status: 'PLANNED',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as AuditProgram);

      const result = await service.createAuditProgram('org-1', 'user-1', dto);
      expect(result.name).toBe('Audit Program 2024');
      expect(result.status).toBe('PLANNED');
    });

    it('should throw ConflictException for duplicate program name', async () => {
      auditProgramRepository.findDuplicate.mockResolvedValue({ id: 'prog-1' } as AuditProgram);

      await expect(
        service.createAuditProgram('org-1', 'user-1', {
          name: 'Audit Program 2024',
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-12-31'),
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid period', async () => {
      await expect(
        service.createAuditProgram('org-1', 'user-1', {
          name: 'Audit Program 2024',
          periodStart: new Date('2024-12-31'),
          periodEnd: new Date('2024-01-01'),
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Audits', () => {
    it('should create an audit', async () => {
      const dto = {
        auditProgramId: 'prog-1',
        code: 'AUD-001',
        title: 'Internal Audit Q1',
        plannedStart: new Date('2024-01-01'),
        plannedEnd: new Date('2024-01-31'),
      };

      auditRepository.findDuplicate.mockResolvedValue(null);
      auditRepository.create.mockResolvedValue({
        id: 'audit-1',
        organizationId: 'org-1',
        auditProgramId: dto.auditProgramId,
        processId: null,
        leadAuditorId: null,
        code: dto.code,
        title: dto.title,
        auditType: null,
        plannedStart: dto.plannedStart,
        plannedEnd: dto.plannedEnd,
        actualStart: null,
        actualEnd: null,
        status: 'PLANNED',
        scope: null,
        objective: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Audit);

      const result = await service.createAudit('org-1', 'user-1', dto);
      expect(result.code).toBe('AUD-001');
      expect(result.status).toBe('PLANNED');
    });

    it('should throw ConflictException for duplicate audit code', async () => {
      auditRepository.findDuplicate.mockResolvedValue({ id: 'audit-1' } as Audit);

      await expect(
        service.createAudit('org-1', 'user-1', {
          code: 'AUD-001',
          title: 'Internal Audit Q1',
          plannedStart: new Date('2024-01-01'),
          plannedEnd: new Date('2024-01-31'),
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Lifecycle', () => {
    it('should start a planned audit', async () => {
      auditRepository.findById.mockResolvedValue({
        id: 'audit-1',
        organizationId: 'org-1',
        auditProgramId: null,
        processId: null,
        leadAuditorId: null,
        code: 'AUD-001',
        title: 'Internal Audit Q1',
        auditType: null,
        plannedStart: null,
        plannedEnd: null,
        actualStart: null,
        actualEnd: null,
        status: 'PLANNED',
        scope: null,
        objective: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Audit);

      auditRepository.update.mockResolvedValue({
        id: 'audit-1',
        organizationId: 'org-1',
        auditProgramId: null,
        processId: null,
        leadAuditorId: null,
        code: 'AUD-001',
        title: 'Internal Audit Q1',
        auditType: null,
        plannedStart: null,
        plannedEnd: null,
        actualStart: new Date('2024-01-01'),
        actualEnd: null,
        status: 'IN_PROGRESS',
        scope: null,
        objective: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Audit);

      const result = await service.startAudit('org-1', 'audit-1', 'user-1', new Date('2024-01-01'));
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should throw BadRequestException for invalid start transition', async () => {
      auditRepository.findById.mockResolvedValue({
        id: 'audit-1',
        organizationId: 'org-1',
        status: 'COMPLETED',
      } as Audit);

      await expect(
        service.startAudit('org-1', 'audit-1', 'user-1', new Date('2024-01-01')),
      ).rejects.toThrow(BadRequestException);
    });

    it('should complete an in-progress audit', async () => {
      auditRepository.findById.mockResolvedValue({
        id: 'audit-1',
        organizationId: 'org-1',
        status: 'IN_PROGRESS',
      } as Audit);

      auditRepository.update.mockResolvedValue({
        id: 'audit-1',
        organizationId: 'org-1',
        status: 'COMPLETED',
        actualEnd: new Date('2024-01-31'),
      } as Audit);

      const result = await service.completeAudit('org-1', 'audit-1', 'user-1', new Date('2024-01-31'));
      expect(result.status).toBe('COMPLETED');
    });

    it('should cancel a planned audit', async () => {
      auditRepository.findById.mockResolvedValue({
        id: 'audit-1',
        organizationId: 'org-1',
        status: 'PLANNED',
      } as Audit);

      auditRepository.update.mockResolvedValue({
        id: 'audit-1',
        organizationId: 'org-1',
        status: 'CANCELLED',
      } as Audit);

      const result = await service.cancelAudit('org-1', 'audit-1', 'user-1', 'Budget cuts');
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw BadRequestException for invalid cancel transition', async () => {
      auditRepository.findById.mockResolvedValue({
        id: 'audit-1',
        organizationId: 'org-1',
        status: 'COMPLETED',
      } as Audit);

      await expect(
        service.cancelAudit('org-1', 'audit-1', 'user-1', 'Budget cuts'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Findings', () => {
    it('should create a finding', async () => {
      auditRepository.findById.mockResolvedValue({
        id: 'audit-1',
        organizationId: 'org-1',
      } as Audit);

      auditFindingRepository.create.mockResolvedValue({
        id: 'finding-1',
        organizationId: 'org-1',
        auditId: 'audit-1',
        checklistItemId: null,
        requirementId: null,
        findingType: 'NON_CONFORMITY',
        title: 'Finding 1',
        description: 'Description',
        evidence: null,
        severity: 'MAJOR',
        identifiedById: 'user-1',
        identifiedAt: new Date(),
        status: 'OPEN',
        createdAt: new Date(),
      } as AuditFinding);

      const result = await service.createFinding('org-1', 'audit-1', 'user-1', {
        findingType: 'NON_CONFORMITY',
        title: 'Finding 1',
        description: 'Description',
        severity: 'MAJOR',
      });

      expect(result.title).toBe('Finding 1');
      expect(result.status).toBe('OPEN');
    });
  });
});
