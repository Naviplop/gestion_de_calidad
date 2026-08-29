import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsService } from './services/departments.service';
import { DepartmentRepository } from './repositories/department.repository';
import { Department } from './entities/department.entity';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let departmentRepository: jest.Mocked<DepartmentRepository>;

  const mockDepartmentRepository = {
    findById: jest.fn(),
    findByOrganization: jest.fn(),
    findListByOrganization: jest.fn(),
    findDuplicate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: DepartmentRepository, useValue: mockDepartmentRepository },
      ],
    }).compile();

    service = module.get(DepartmentsService);
    departmentRepository = module.get(DepartmentRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listDepartments', () => {
    it('should return paginated departments', async () => {
      const mockResult = {
        data: [],
        meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      };
      departmentRepository.findListByOrganization.mockResolvedValue(mockResult);

      const result = await service.listDepartments('org-1', 1, 25);
      expect(result).toEqual(mockResult);
      expect(departmentRepository.findListByOrganization).toHaveBeenCalledWith('org-1', 1, 25, undefined);
    });
  });

  describe('getDepartment', () => {
    it('should return department when found in same tenant', async () => {
      const dept = {
        id: 'dept-1',
        organizationId: 'org-1',
        name: 'Engineering',
        description: null,
        parentDepartmentId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      departmentRepository.findById.mockResolvedValue(dept as Department);

      const result = await service.getDepartment('org-1', 'dept-1');
      expect(result).toEqual(dept);
      expect(departmentRepository.findById).toHaveBeenCalledWith('dept-1', 'org-1');
    });

    it('should throw NotFoundException when department not found', async () => {
      departmentRepository.findById.mockResolvedValue(null);

      await expect(service.getDepartment('org-1', 'dept-999')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when department belongs to different tenant', async () => {
      departmentRepository.findById.mockResolvedValue(null);

      await expect(service.getDepartment('org-1', 'dept-other-org')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDepartment', () => {
    it('should create department when name is unique', async () => {
      departmentRepository.findDuplicate.mockResolvedValue(null);
      departmentRepository.create.mockResolvedValue({
        id: 'dept-1',
        organizationId: 'org-1',
        name: 'Engineering',
        description: null,
        parentDepartmentId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Department);

      const result = await service.createDepartment('org-1', { name: 'Engineering' });
      expect(result).toBeDefined();
      expect(departmentRepository.create).toHaveBeenCalledWith('org-1', {
        name: 'Engineering',
        description: undefined,
        parentDepartmentId: undefined,
      });
    });

    it('should throw ConflictException when duplicate name exists', async () => {
      departmentRepository.findDuplicate.mockResolvedValue({
        id: 'dept-existing',
        organizationId: 'org-1',
        name: 'Engineering',
        description: null,
        parentDepartmentId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Department);

      await expect(service.createDepartment('org-1', { name: 'Engineering' })).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when parentDepartmentId does not exist in tenant', async () => {
      departmentRepository.findDuplicate.mockResolvedValue(null);
      departmentRepository.findById.mockResolvedValue(null);

      await expect(service.createDepartment('org-1', { name: 'Engineering', parentDepartmentId: 'dept-parent' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDepartment', () => {
    it('should update department when found in same tenant', async () => {
      const existing = {
        id: 'dept-1',
        organizationId: 'org-1',
        name: 'Engineering',
        description: null,
        parentDepartmentId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      departmentRepository.findById.mockResolvedValue(existing as Department);
      departmentRepository.findDuplicate.mockResolvedValue(null);
      departmentRepository.update.mockResolvedValue({
        ...existing,
        name: 'Updated Engineering',
      } as Department);

      const result = await service.updateDepartment('org-1', 'dept-1', { name: 'Updated Engineering' });
      expect(result).toBeDefined();
      expect(departmentRepository.update).toHaveBeenCalledWith('dept-1', 'org-1', { name: 'Updated Engineering' });
    });

    it('should throw NotFoundException when department not found', async () => {
      departmentRepository.findById.mockResolvedValue(null);

      await expect(service.updateDepartment('org-1', 'dept-999', { name: 'Updated' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new name duplicates existing', async () => {
      const existing = {
        id: 'dept-1',
        organizationId: 'org-1',
        name: 'Engineering',
        description: null,
        parentDepartmentId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      departmentRepository.findById.mockResolvedValue(existing as Department);
      departmentRepository.findDuplicate.mockResolvedValue({
        id: 'dept-2',
        organizationId: 'org-1',
        name: 'Engineering',
        description: null,
        parentDepartmentId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Department);

      await expect(service.updateDepartment('org-1', 'dept-1', { name: 'Engineering Copy' })).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when parentDepartmentId is self', async () => {
      const existing = {
        id: 'dept-1',
        organizationId: 'org-1',
        name: 'Engineering',
        description: null,
        parentDepartmentId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      departmentRepository.findById.mockResolvedValue(existing as Department);
      departmentRepository.findDuplicate.mockResolvedValue(null);

      await expect(service.updateDepartment('org-1', 'dept-1', { parentDepartmentId: 'dept-1' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivateDepartment', () => {
    it('should deactivate department when found in same tenant', async () => {
      const existing = {
        id: 'dept-1',
        organizationId: 'org-1',
        name: 'Engineering',
        description: null,
        parentDepartmentId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      departmentRepository.findById.mockResolvedValue(existing as Department);
      departmentRepository.deactivate.mockResolvedValue(undefined);

      await expect(service.deactivateDepartment('org-1', 'dept-1')).resolves.toBeUndefined();
      expect(departmentRepository.deactivate).toHaveBeenCalledWith('dept-1', 'org-1');
    });

    it('should throw NotFoundException when department not found', async () => {
      departmentRepository.findById.mockResolvedValue(null);

      await expect(service.deactivateDepartment('org-1', 'dept-999')).rejects.toThrow(NotFoundException);
    });
  });
});
