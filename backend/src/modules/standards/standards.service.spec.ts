import { Test, TestingModule } from '@nestjs/testing';
import { StandardsService } from './services/standards.service';
import { StandardRepository } from './repositories/standard.repository';
import { Standard } from './entities/standard.entity';
import { NotFoundException } from '@nestjs/common';

describe('StandardsService', () => {
  let service: StandardsService;
  let standardRepository: jest.Mocked<StandardRepository>;

  const mockStandardRepository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    findRequirements: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StandardsService,
        { provide: StandardRepository, useValue: mockStandardRepository },
      ],
    }).compile();

    service = module.get(StandardsService);
    standardRepository = module.get(StandardRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listStandards', () => {
    it('should return paginated standards', async () => {
      const mockResult = {
        data: [],
        meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      };
      standardRepository.findMany.mockResolvedValue(mockResult);

      const result = await service.listStandards(1, 25);
      expect(result).toEqual(mockResult);
      expect(standardRepository.findMany).toHaveBeenCalledWith(1, 25, undefined);
    });

    it('should pass search query to repository', async () => {
      const mockResult = {
        data: [],
        meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      };
      standardRepository.findMany.mockResolvedValue(mockResult);

      await service.listStandards(1, 25, 'ISO');
      expect(standardRepository.findMany).toHaveBeenCalledWith(1, 25, 'ISO');
    });
  });

  describe('getStandard', () => {
    it('should return standard when found', async () => {
      const standard = {
        id: 'std-1',
        code: 'ISO-9001',
        name: 'Quality Management',
        description: 'ISO 9001 standard',
        version: '2015',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      standardRepository.findById.mockResolvedValue(standard as Standard);

      const result = await service.getStandard('std-1');
      expect(result).toEqual(standard);
      expect(standardRepository.findById).toHaveBeenCalledWith('std-1');
    });

    it('should throw NotFoundException when standard not found', async () => {
      standardRepository.findById.mockResolvedValue(null);

      await expect(service.getStandard('std-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStandardRequirements', () => {
    it('should return requirements for a standard', async () => {
      const mockResult = {
        data: [],
        meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      };
      standardRepository.findRequirements.mockResolvedValue(mockResult);

      const result = await service.getStandardRequirements('std-1', 1, 25);
      expect(result).toEqual(mockResult);
      expect(standardRepository.findRequirements).toHaveBeenCalledWith('std-1', 1, 25, undefined, undefined);
    });

    it('should pass parentId and search filters', async () => {
      const mockResult = {
        data: [],
        meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      };
      standardRepository.findRequirements.mockResolvedValue(mockResult);

      await service.getStandardRequirements('std-1', 1, 25, 'parent-1', 'Context');
      expect(standardRepository.findRequirements).toHaveBeenCalledWith('std-1', 1, 25, 'parent-1', 'Context');
    });
  });
});
