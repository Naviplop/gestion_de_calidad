import { Test, TestingModule } from '@nestjs/testing';
import { RisksService } from '../services/risks.service';
import { RiskRepository } from '../repositories/risk.repository';
import { RiskAssessmentRepository } from '../repositories/risk-assessment.repository';
import { RiskControlRepository } from '../repositories/risk-control.repository';
import { RiskTreatmentRepository } from '../repositories/risk-treatment.repository';
import { PrismaService } from '../../../database/prisma.service';
import { ConcurrencyService } from '../../../common/services/concurrency.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Risk, RiskAssessment, RiskControl, RiskTreatment } from '../entities/risk.entity';
import { CreateRiskDto, UpdateRiskDto } from '../dto/create-risk.dto';
import { CreateRiskAssessmentDto } from '../dto/risk-assessment.dto';
import { CreateRiskControlDto } from '../dto/risk-control.dto';
import { CreateRiskTreatmentDto, UpdateRiskTreatmentDto } from '../dto/risk-treatment.dto';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';

describe('RisksService', () => {
  let service: RisksService;
  let riskRepository: jest.Mocked<RiskRepository>;
  let riskAssessmentRepository: jest.Mocked<RiskAssessmentRepository>;
  let riskControlRepository: jest.Mocked<RiskControlRepository>;
  let riskTreatmentRepository: jest.Mocked<RiskTreatmentRepository>;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RisksService,
        { provide: RiskRepository, useValue: {
          findById: jest.fn(),
          findListByOrganization: jest.fn(),
          findDuplicate: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        }},
        { provide: RiskAssessmentRepository, useValue: {
          findById: jest.fn(),
          findByRisk: jest.fn(),
          findListByRisk: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        }},
        { provide: RiskControlRepository, useValue: {
          findById: jest.fn(),
          findByRisk: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        }},
        { provide: RiskTreatmentRepository, useValue: {
          findById: jest.fn(),
          findByRisk: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        }},
        { provide: PrismaService, useValue: {
          process: { findFirst: jest.fn() },
          user: { findFirst: jest.fn() },
        } },
        { provide: ConcurrencyService, useValue: { validateIfMatch: jest.fn() } },
        { provide: AuditLogService, useValue: { recordEvent: jest.fn() } },
        { provide: SecurityEventService, useValue: { recordEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get<RisksService>(RisksService);
    riskRepository = module.get(RiskRepository);
    riskAssessmentRepository = module.get(RiskAssessmentRepository);
    riskControlRepository = module.get(RiskControlRepository);
    riskTreatmentRepository = module.get(RiskTreatmentRepository);
    prismaService = module.get(PrismaService);
  });

  describe('Risks', () => {
    it('should create a risk', async () => {
      riskRepository.findDuplicate.mockResolvedValue(null);
      (prismaService as unknown as { process: { findFirst: jest.Mock } }).process.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      (prismaService as unknown as { user: { findFirst: jest.Mock } }).user.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      riskRepository.create.mockResolvedValue({
        id: 'risk-1',
        organizationId: 'org-1',
        processId: null,
        code: 'RSK-001',
        title: 'Risk 1',
        description: 'Description',
        riskType: 'INTERNAL',
        ownerId: null,
        status: 'IDENTIFIED',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Risk);

      const dto: CreateRiskDto = {
        code: 'RSK-001',
        title: 'Risk 1',
        description: 'Description',
        riskType: 'INTERNAL',
      };

      const result = await service.createRisk('org-1', 'user-1', dto);
      expect(result.code).toBe('RSK-001');
      expect(result.status).toBe('IDENTIFIED');
    });

    it('should throw ConflictException for duplicate code', async () => {
      riskRepository.findDuplicate.mockResolvedValue({ id: 'risk-1' } as Risk);

      const dto: CreateRiskDto = {
        code: 'RSK-001',
        title: 'Risk 1',
        description: 'Description',
        riskType: 'INTERNAL',
      };

      await expect(
        service.createRisk('org-1', 'user-1', dto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when risk not found', async () => {
      riskRepository.findById.mockResolvedValue(null);

      await expect(
        service.getRisk('org-1', 'risk-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update a risk', async () => {
      riskRepository.findById.mockResolvedValue({
        id: 'risk-1',
        organizationId: 'org-1',
        code: 'RSK-001',
      } as Risk);

      riskRepository.update.mockResolvedValue({
        id: 'risk-1',
        organizationId: 'org-1',
        processId: null,
        code: 'RSK-001',
        title: 'Updated',
        description: 'Description',
        riskType: 'INTERNAL',
        ownerId: null,
        status: 'ASSESSED',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Risk);

      const dto: UpdateRiskDto = {
        title: 'Updated',
        status: 'ASSESSED',
      };

      const result = await service.updateRisk('org-1', 'risk-1', 'user-1', dto);
      expect(result.title).toBe('Updated');
      expect(result.status).toBe('ASSESSED');
    });
  });

  describe('Assessments', () => {
    it('should create an assessment', async () => {
      riskRepository.findById.mockResolvedValue({
        id: 'risk-1',
        organizationId: 'org-1',
      } as Risk);

      riskAssessmentRepository.create.mockResolvedValue({
        id: 'assess-1',
        organizationId: 'org-1',
        riskId: 'risk-1',
        probability: 'HIGH',
        impact: 'MEDIUM',
        score: '6',
        calculationData: {},
        assessedById: 'user-1',
        assessedAt: new Date(),
      } as RiskAssessment);

      const dto: CreateRiskAssessmentDto = {
        probability: 'HIGH',
        impact: 'MEDIUM',
      };

      const result = await service.createRiskAssessment('org-1', 'risk-1', 'user-1', dto);
      expect(result.probability).toBe('HIGH');
      expect(result.impact).toBe('MEDIUM');
      expect(result.score).toBe('6');
    });
  });

  describe('Controls', () => {
    it('should create a control', async () => {
      riskRepository.findById.mockResolvedValue({
        id: 'risk-1',
        organizationId: 'org-1',
      } as Risk);

      riskControlRepository.create.mockResolvedValue({
        id: 'ctrl-1',
        organizationId: 'org-1',
        riskId: 'risk-1',
        userId: 'user-1',
        description: 'Control 1',
        controlType: 'PREVENTIVE',
        effectiveness: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as RiskControl);

      const dto: CreateRiskControlDto = {
        description: 'Control 1',
        controlType: 'PREVENTIVE',
      };

      const result = await service.createRiskControl('org-1', 'risk-1', 'user-1', dto);
      expect(result.controlType).toBe('PREVENTIVE');
    });
  });

  describe('Treatments', () => {
    it('should create a treatment', async () => {
      riskRepository.findById.mockResolvedValue({
        id: 'risk-1',
        organizationId: 'org-1',
      } as Risk);

      riskTreatmentRepository.create.mockResolvedValue({
        id: 'treat-1',
        organizationId: 'org-1',
        riskId: 'risk-1',
        strategy: 'MITIGATE',
        description: 'Treatment 1',
        responsibleId: null,
        dueDate: null,
        status: 'PLANNED',
        completedAt: null,
        createdAt: new Date(),
      } as RiskTreatment);

      const dto: CreateRiskTreatmentDto = {
        strategy: 'MITIGATE',
        description: 'Treatment 1',
      };

      const result = await service.createRiskTreatment('org-1', 'risk-1', 'user-1', dto);
      expect(result.strategy).toBe('MITIGATE');
      expect(result.status).toBe('PLANNED');
    });

    it('should update a treatment', async () => {
      riskRepository.findById.mockResolvedValue({
        id: 'risk-1',
        organizationId: 'org-1',
      } as Risk);

      riskTreatmentRepository.findById.mockResolvedValue({
        id: 'treat-1',
        organizationId: 'org-1',
        riskId: 'risk-1',
        strategy: 'MITIGATE',
        description: 'Treatment 1',
        responsibleId: null,
        dueDate: null,
        status: 'PLANNED',
        completedAt: null,
        createdAt: new Date(),
      } as RiskTreatment);

      riskTreatmentRepository.update.mockResolvedValue({
        id: 'treat-1',
        organizationId: 'org-1',
        riskId: 'risk-1',
        strategy: 'MITIGATE',
        description: 'Updated',
        responsibleId: null,
        dueDate: null,
        status: 'IN_PROGRESS',
        completedAt: null,
        createdAt: new Date(),
      } as RiskTreatment);

      const dto: UpdateRiskTreatmentDto = {
        status: 'IN_PROGRESS',
      };

      const result = await service.updateRiskTreatment('org-1', 'risk-1', 'treat-1', 'user-1', dto);
      expect(result.status).toBe('IN_PROGRESS');
    });
  });
});
