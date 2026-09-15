import { Test, TestingModule } from '@nestjs/testing';
import { ProcessesService } from './services/processes.service';
import { ProcessRepository } from './repositories/process.repository';
import { PrismaService } from '../../database/prisma.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { Process } from './entities/process.entity';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('ProcessesService', () => {
  let service: ProcessesService;
  let processRepository: jest.Mocked<ProcessRepository>;
  let prisma: jest.Mocked<PrismaService>;

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
    processRepository = module.get(ProcessRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listProcesses', () => {
    it('should return paginated processes', async () => {
      const mockResult = {
        data: [],
        meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      };
      processRepository.findListByOrganization.mockResolvedValue(mockResult);

      const result = await service.listProcesses('org-1', 1, 25);
      expect(result).toEqual(mockResult);
      expect(processRepository.findListByOrganization).toHaveBeenCalledWith('org-1', 1, 25, undefined);
    });
  });

  describe('getProcess', () => {
    it('should return process when found in same tenant', async () => {
      const process = {
        id: 'proc-1',
        organizationId: 'org-1',
        areaId: null,
        parentProcessId: null,
        code: 'PROC-001',
        name: 'Sales',
        description: null,
        ownerId: null,
        processType: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      processRepository.findById.mockResolvedValue(process as Process);

      const result = await service.getProcess('org-1', 'proc-1');
      expect(result).toEqual(process);
      expect(processRepository.findById).toHaveBeenCalledWith('proc-1', 'org-1');
    });

    it('should throw NotFoundException when process not found', async () => {
      processRepository.findById.mockResolvedValue(null);

      await expect(service.getProcess('org-1', 'proc-999')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when process belongs to different tenant', async () => {
      processRepository.findById.mockResolvedValue(null);

      await expect(service.getProcess('org-1', 'proc-other-org')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createProcess with manual code', () => {
    it('should create process when code is unique', async () => {
      mockPrisma.process.findFirst.mockResolvedValue(null);
      mockPrisma.process.create.mockResolvedValue({
        id: 'proc-1',
        organizationId: 'org-1',
        areaId: null,
        parentProcessId: null,
        code: 'PROC-001',
        name: 'Sales',
        description: null,
        ownerId: null,
        processType: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Process);

      const result = await service.createProcess('org-1', { code: 'PROC-001', name: 'Sales' });
      expect(result).toBeDefined();
      expect(mockPrisma.process.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ code: 'PROC-001' }) }),
      );
    });

    it('should throw ConflictException when duplicate code exists', async () => {
      mockPrisma.process.findFirst.mockResolvedValue({
        id: 'proc-existing',
        organizationId: 'org-1',
        areaId: null,
        parentProcessId: null,
        code: 'PROC-001',
        name: 'Sales',
        description: null,
        ownerId: null,
        processType: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Process);

      await expect(service.createProcess('org-1', { code: 'PROC-001', name: 'Sales' })).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when parentProcessId does not exist in tenant', async () => {
      mockPrisma.process.findFirst.mockResolvedValue(null);

      await expect(service.createProcess('org-1', { code: 'PROC-002', name: 'Sub Process', parentProcessId: 'proc-parent' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('createProcess with auto code', () => {
    it('should auto-generate PR-001 when no processes exist', async () => {
      mockPrisma.process.findMany.mockResolvedValue([]);
      mockPrisma.process.create.mockResolvedValue({
        id: 'proc-1',
        organizationId: 'org-1',
        areaId: null,
        parentProcessId: null,
        code: 'PR-001',
        name: 'Gestión de Calidad',
        description: null,
        ownerId: null,
        processType: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Process);
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => fn(prisma));

      const result = await service.createProcess('org-1', { name: 'Gestión de Calidad' });
      expect(result.code).toBe('PR-001');
    });

    it('should auto-generate PR-002 when one process exists', async () => {
      mockPrisma.process.findMany.mockResolvedValue([{ code: 'PR-001' }]);
      mockPrisma.process.create.mockResolvedValue({
        id: 'proc-2',
        organizationId: 'org-1',
        areaId: null,
        parentProcessId: null,
        code: 'PR-002',
        name: 'Test',
        description: null,
        ownerId: null,
        processType: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Process);
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => fn(prisma));

      const result = await service.createProcess('org-1', { name: 'Test' });
      expect(result.code).toBe('PR-002');
    });

    it('should reject duplicate code with manual code', async () => {
      mockPrisma.process.findFirst.mockResolvedValue({ id: 'proc-1', code: 'PR-001' });

      const dto = new CreateProcessDto();
      dto.code = 'PR-001';
      dto.name = 'Duplicate';

      await expect(service.createProcess('org-1', dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateProcess', () => {
    it('should update process when found in same tenant', async () => {
      const existing = {
        id: 'proc-1',
        organizationId: 'org-1',
        areaId: null,
        parentProcessId: null,
        code: 'PROC-001',
        name: 'Sales',
        description: null,
        ownerId: null,
        processType: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      processRepository.findById.mockResolvedValue(existing as Process);
      processRepository.findDuplicate.mockResolvedValue(null);
      processRepository.update.mockResolvedValue({
        ...existing,
        name: 'Updated Sales',
      } as Process);

      const result = await service.updateProcess('org-1', 'proc-1', { name: 'Updated Sales' });
      expect(result).toBeDefined();
      expect(processRepository.update).toHaveBeenCalledWith('proc-1', 'org-1', { name: 'Updated Sales' });
    });

    it('should throw NotFoundException when process not found', async () => {
      processRepository.findById.mockResolvedValue(null);

      await expect(service.updateProcess('org-1', 'proc-999', { name: 'Updated' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new code duplicates existing', async () => {
      const existing = {
        id: 'proc-1',
        organizationId: 'org-1',
        areaId: null,
        parentProcessId: null,
        code: 'PROC-001',
        name: 'Sales',
        description: null,
        ownerId: null,
        processType: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      processRepository.findById.mockResolvedValue(existing as Process);
      processRepository.findDuplicate.mockResolvedValue({
        id: 'proc-2',
        organizationId: 'org-1',
        areaId: null,
        parentProcessId: null,
        code: 'PROC-002',
        name: 'Other',
        description: null,
        ownerId: null,
        processType: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Process);

      await expect(service.updateProcess('org-1', 'proc-1', { code: 'PROC-002' })).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when parentProcessId is self', async () => {
      const existing = {
        id: 'proc-1',
        organizationId: 'org-1',
        areaId: null,
        parentProcessId: null,
        code: 'PROC-001',
        name: 'Sales',
        description: null,
        ownerId: null,
        processType: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      processRepository.findById.mockResolvedValue(existing as Process);
      processRepository.findDuplicate.mockResolvedValue(null);

      await expect(service.updateProcess('org-1', 'proc-1', { parentProcessId: 'proc-1' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivateProcess', () => {
    it('should deactivate process when found in same tenant', async () => {
      const existing = {
        id: 'proc-1',
        organizationId: 'org-1',
        areaId: null,
        parentProcessId: null,
        code: 'PROC-001',
        name: 'Sales',
        description: null,
        ownerId: null,
        processType: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      processRepository.findById.mockResolvedValue(existing as Process);
      processRepository.deactivate.mockResolvedValue(undefined);

      await expect(service.deactivateProcess('org-1', 'proc-1')).resolves.toBeUndefined();
      expect(processRepository.deactivate).toHaveBeenCalledWith('proc-1', 'org-1');
    });

    it('should throw NotFoundException when process not found', async () => {
      processRepository.findById.mockResolvedValue(null);

      await expect(service.deactivateProcess('org-1', 'proc-999')).rejects.toThrow(NotFoundException);
    });
  });
});
