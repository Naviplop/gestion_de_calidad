import { Test, TestingModule } from '@nestjs/testing';
import { ProcessesService } from '../services/processes.service';
import { ProcessRepository } from '../repositories/process.repository';
import { PrismaService } from '../../../database/prisma.service';
import { ConflictException } from '@nestjs/common';
import { CreateProcessDto } from '../dto/create-process.dto';

describe('ProcessesService - Auto Code Generation (Defect D)', () => {
  let service: ProcessesService;

  const mockProcessRepository = {
    findById: jest.fn(),
    findByOrganization: jest.fn(),
    findListByOrganization: jest.fn(),
    findDuplicate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };

  const mockPrisma = {
    process: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
  } as unknown as jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessesService,
        { provide: ProcessRepository, useValue: mockProcessRepository },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ProcessesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProcess auto code', () => {
    it('should auto-generate PR-001 when no processes exist', async () => {
      mockPrisma.process.findMany.mockResolvedValue([]);
      mockPrisma.process.create.mockResolvedValue({
        id: 'proc-1', organizationId: 'org-1', areaId: null, parentProcessId: null,
        code: 'PR-001', name: 'Gestión de Calidad', description: null,
        ownerId: null, processType: null, isActive: true,
        createdAt: new Date(), updatedAt: new Date(),
      } as unknown as import('../entities/process.entity').Process);
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => fn(mockPrisma));

      const dto = new CreateProcessDto();
      dto.name = 'Gestión de Calidad';

      const result = await service.createProcess('org-1', dto);
      expect(result.code).toBe('PR-001');
    });

    it('should auto-generate PR-002 when one process exists', async () => {
      mockPrisma.process.findMany.mockResolvedValue([{ code: 'PR-001' }]);
      mockPrisma.process.create.mockResolvedValue({
        id: 'proc-2', organizationId: 'org-1', areaId: null, parentProcessId: null,
        code: 'PR-002', name: 'Test', description: null,
        ownerId: null, processType: null, isActive: true,
        createdAt: new Date(), updatedAt: new Date(),
      } as unknown as import('../entities/process.entity').Process);
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => fn(mockPrisma));

      const dto = new CreateProcessDto();
      dto.name = 'Test';

      const result = await service.createProcess('org-1', dto);
      expect(result.code).toBe('PR-002');
    });

    it('should auto-generate PR-005 when processes go up to PR-004', async () => {
      mockPrisma.process.findMany.mockResolvedValue([
        { code: 'PR-001' },
        { code: 'PR-002' },
        { code: 'PR-003' },
        { code: 'PR-004' },
      ]);
      mockPrisma.process.create.mockResolvedValue({
        id: 'proc-5', organizationId: 'org-1', areaId: null, parentProcessId: null,
        code: 'PR-005', name: 'Test', description: null,
        ownerId: null, processType: null, isActive: true,
        createdAt: new Date(), updatedAt: new Date(),
      } as unknown as import('../entities/process.entity').Process);
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => fn(mockPrisma));

      const dto = new CreateProcessDto();
      dto.name = 'Test';

      const result = await service.createProcess('org-1', dto);
      expect(result.code).toBe('PR-005');
    });

    it('should use provided code when given', async () => {
      mockPrisma.process.findFirst.mockResolvedValue(null);
      mockPrisma.process.create.mockResolvedValue({
        id: 'proc-1', organizationId: 'org-1', areaId: null, parentProcessId: null,
        code: 'CUSTOM-01', name: 'Custom', description: null,
        ownerId: null, processType: null, isActive: true,
        createdAt: new Date(), updatedAt: new Date(),
      } as unknown as import('../entities/process.entity').Process);

      const dto = new CreateProcessDto();
      dto.code = 'CUSTOM-01';
      dto.name = 'Custom Process';

      const result = await service.createProcess('org-1', dto);
      expect(result.code).toBe('CUSTOM-01');
    });

    it('should reject duplicate code within same organization', async () => {
      mockPrisma.process.findFirst.mockResolvedValue({ id: 'proc-1', code: 'PR-001' });

      const dto = new CreateProcessDto();
      dto.code = 'PR-001';
      dto.name = 'Duplicate';

      await expect(service.createProcess('org-1', dto)).rejects.toThrow(ConflictException);
    });
  });
});
