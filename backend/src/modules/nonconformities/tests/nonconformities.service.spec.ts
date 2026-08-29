import { Test, TestingModule } from '@nestjs/testing';
import { NonconformitiesService } from '../services/nonconformities.service';
import { NonconformityRepository } from '../repositories/nonconformity.repository';
import { RootCauseAnalysisRepository } from '../repositories/root-cause.repository';
import { CorrectiveActionRepository } from '../repositories/corrective-action.repository';
import { CorrectiveActionVerificationRepository } from '../repositories/corrective-action-verification.repository';
import { PrismaService } from '../../../database/prisma.service';
import { ConcurrencyService } from '../../../common/services/concurrency.service';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { Nonconformity, RootCauseAnalysis, CorrectiveAction, CorrectiveActionVerification } from '../entities/nonconformity.entity';
import { CreateNonconformityDto } from '../dto/create-nonconformity.dto';
import { CreateVerificationDto } from '../dto/create-verification.dto';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';

describe('NonconformitiesService', () => {
  let service: NonconformitiesService;
  let nonconformityRepository: jest.Mocked<NonconformityRepository>;
  let rootCauseAnalysisRepository: jest.Mocked<RootCauseAnalysisRepository>;
  let correctiveActionRepository: jest.Mocked<CorrectiveActionRepository>;
  let verificationRepository: jest.Mocked<CorrectiveActionVerificationRepository>;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NonconformitiesService,
        { provide: NonconformityRepository, useValue: {
          findById: jest.fn(),
          findListByOrganization: jest.fn(),
          findDuplicate: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        }},
        { provide: RootCauseAnalysisRepository, useValue: {
          findById: jest.fn(),
          findByNonconformity: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        }},
        { provide: CorrectiveActionRepository, useValue: {
          findById: jest.fn(),
          findByNonconformity: jest.fn(),
          findDuplicate: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        }},
        { provide: CorrectiveActionVerificationRepository, useValue: {
          findById: jest.fn(),
          create: jest.fn(),
        }},
        { provide: PrismaService, useValue: {
          auditFinding: { findFirst: jest.fn() },
          audit: { findFirst: jest.fn() },
          correctiveAction: { findMany: jest.fn(), count: jest.fn() },
          correctiveActionVerification: { findFirst: jest.fn() },
        } },
        { provide: ConcurrencyService, useValue: { validateIfMatch: jest.fn() } },
        { provide: AuditLogService, useValue: { recordEvent: jest.fn() } },
        { provide: SecurityEventService, useValue: { recordEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get<NonconformitiesService>(NonconformitiesService);
    nonconformityRepository = module.get(NonconformityRepository);
    rootCauseAnalysisRepository = module.get(RootCauseAnalysisRepository);
    correctiveActionRepository = module.get(CorrectiveActionRepository);
    verificationRepository = module.get(CorrectiveActionVerificationRepository);
    prismaService = module.get(PrismaService);
  });

  describe('Nonconformities', () => {
    it('should create a nonconformity', async () => {
      nonconformityRepository.findDuplicate.mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prismaService as any).auditFinding.findFirst.mockResolvedValue(null);
      nonconformityRepository.create.mockResolvedValue({
        id: 'nc-1',
        organizationId: 'org-1',
        auditId: null,
        findingId: null,
        processId: null,
        code: 'NC-001',
        title: 'Nonconformity 1',
        description: 'Description',
        severity: 'MAJOR',
        detectedAt: new Date('2024-01-01'),
        responsibleId: null,
        status: 'OPEN',
        closedAt: null,
        closedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Nonconformity);

      const dto: CreateNonconformityDto = {
        code: 'NC-001',
        title: 'Nonconformity 1',
        description: 'Description',
        severity: 'MAJOR',
        detectedAt: new Date('2024-01-01'),
      };

      const result = await service.createNonconformity('org-1', 'user-1', dto);
      expect(result.code).toBe('NC-001');
      expect(result.status).toBe('OPEN');
    });

    it('should throw ConflictException for duplicate code', async () => {
      nonconformityRepository.findDuplicate.mockResolvedValue({ id: 'nc-1' } as Nonconformity);

      const dto: CreateNonconformityDto = {
        code: 'NC-001',
        title: 'Nonconformity 1',
        description: 'Description',
        severity: 'MAJOR',
        detectedAt: new Date('2024-01-01'),
      };

      await expect(
        service.createNonconformity('org-1', 'user-1', dto),
      ).rejects.toThrow(ConflictException);
    });

    it('should close a nonconformity', async () => {
      nonconformityRepository.findById.mockResolvedValue({
        id: 'nc-1',
        organizationId: 'org-1',
        status: 'OPEN',
      } as Nonconformity);

      rootCauseAnalysisRepository.findByNonconformity.mockResolvedValue({
        id: 'rca-1',
        nonconformityId: 'nc-1',
      } as RootCauseAnalysis);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prismaService as any).correctiveAction.findMany.mockResolvedValue([]);
      nonconformityRepository.update.mockResolvedValue({
        id: 'nc-1',
        organizationId: 'org-1',
        status: 'CLOSED',
        closedAt: new Date(),
        closedById: 'user-1',
      } as Nonconformity);

      const result = await service.closeNonconformity('org-1', 'nc-1', 'user-1');
      expect(result.status).toBe('CLOSED');
    });

    it('should throw BadRequestException when closing without root cause', async () => {
      nonconformityRepository.findById.mockResolvedValue({
        id: 'nc-1',
        organizationId: 'org-1',
        status: 'OPEN',
      } as Nonconformity);

      rootCauseAnalysisRepository.findByNonconformity.mockResolvedValue(null);

      await expect(
        service.closeNonconformity('org-1', 'nc-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Corrective Actions', () => {
    it('should create a corrective action', async () => {
      nonconformityRepository.findById.mockResolvedValue({
        id: 'nc-1',
        organizationId: 'org-1',
      } as Nonconformity);

      correctiveActionRepository.findDuplicate.mockResolvedValue(null);
      correctiveActionRepository.create.mockResolvedValue({
        id: 'ca-1',
        organizationId: 'org-1',
        nonconformityId: 'nc-1',
        code: 'CA-001',
        description: 'Action 1',
        responsibleId: 'user-1',
        dueDate: new Date('2024-02-01'),
        completedAt: null,
        status: 'OPEN',
        effectivenessRequired: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CorrectiveAction);

      const dto: CreateCADto = {
        code: 'CA-001',
        description: 'Action 1',
        responsibleId: 'user-1',
        dueDate: new Date('2024-02-01'),
      };

      const result = await service.createCorrectiveAction('org-1', 'nc-1', 'user-1', dto);
      expect(result.code).toBe('CA-001');
      expect(result.status).toBe('OPEN');
    });

    it('should complete a corrective action', async () => {
      correctiveActionRepository.findById.mockResolvedValue({
        id: 'ca-1',
        organizationId: 'org-1',
        nonconformityId: 'nc-1',
        status: 'OPEN',
      } as CorrectiveAction);

      correctiveActionRepository.update.mockResolvedValue({
        id: 'ca-1',
        organizationId: 'org-1',
        nonconformityId: 'nc-1',
        status: 'COMPLETED',
        completedAt: new Date('2024-01-15'),
      } as CorrectiveAction);

      const result = await service.completeCorrectiveAction('org-1', 'ca-1', 'user-1', new Date('2024-01-15'));
      expect(result.status).toBe('COMPLETED');
    });

    it('should verify a corrective action', async () => {
      correctiveActionRepository.findById.mockResolvedValue({
        id: 'ca-1',
        organizationId: 'org-1',
        nonconformityId: 'nc-1',
      } as CorrectiveAction);

      nonconformityRepository.findById.mockResolvedValue({
        id: 'nc-1',
        organizationId: 'org-1',
      } as Nonconformity);

      verificationRepository.create.mockResolvedValue({
        id: 'ver-1',
        organizationId: 'org-1',
        correctiveActionId: 'ca-1',
        verifierId: 'user-1',
        effectivenessStatus: 'EFFECTIVE',
        evidence: null,
        comments: null,
        verifiedAt: new Date(),
      } as CorrectiveActionVerification);

      const dto: CreateVerificationDto = {
        effectivenessStatus: 'EFFECTIVE',
      };

      const result = await service.verifyCorrectiveAction('org-1', 'ca-1', 'user-1', dto);
      expect(result.effectivenessStatus).toBe('EFFECTIVE');
    });
  });
});
