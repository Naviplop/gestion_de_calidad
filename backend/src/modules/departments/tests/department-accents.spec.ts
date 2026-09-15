import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsService } from '../services/departments.service';
import { DepartmentRepository } from '../repositories/department.repository';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { validate } from 'class-validator';

describe('DepartmentsService - Accent Support (Defect C)', () => {
  let service: DepartmentsService;

  const mockDepartmentRepository = {
    findById: jest.fn(),
    findByOrganization: jest.fn(),
    findListByOrganization: jest.fn(),
    findDuplicate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    detectCycle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: DepartmentRepository, useValue: mockDepartmentRepository },
      ],
    }).compile();

    service = module.get(DepartmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDepartment with accented names', () => {
    const accentedNames = [
      'Administración',
      'Dirección',
      'Dirección General',
      'Planeación Estratégica',
      'Producción',
      'Calidad',
      'Recursos Humanos',
      'Atención a Clientes',
      'Íñigo López',
      'Ñoño Gómez',
      'Über Müller',
    ];

    accentedNames.forEach((name) => {
      it(`should accept department name: "${name}"`, async () => {
        const dto = new CreateDepartmentDto();
        dto.name = name;
        dto.description = 'Test';

        const errors = await validate(dto);
        const nameErrors = errors.filter(e => e.property === 'name');
        expect(nameErrors.length).toBe(0);
      });
    });

    it('should create department with accented name', async () => {
      const dto = new CreateDepartmentDto();
      dto.name = 'Administración';
      dto.description = 'Dept admin';

      mockDepartmentRepository.findDuplicate.mockResolvedValue(null);
      mockDepartmentRepository.detectCycle.mockResolvedValue(false);
      const mockDept = {
        id: 'dept-1', organizationId: 'org-1', name: 'Administración',
        description: 'Dept admin', parentDepartmentId: null, isActive: true,
        createdAt: new Date(), updatedAt: new Date(),
      };
      mockDepartmentRepository.create.mockResolvedValue(mockDept);

      const result = await service.createDepartment('org-1', dto);
      expect(result.name).toBe('Administración');
    });
  });

  describe('createDepartment rejecting invalid names', () => {
    it('should reject names with special characters like @#$', async () => {
      const dto = new CreateDepartmentDto();
      dto.name = 'Dept@#$%';

      const errors = await validate(dto);
      const nameErrors = errors.filter(e => e.property === 'name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });

    it('should reject names with emojis', async () => {
      const dto = new CreateDepartmentDto();
      dto.name = 'Dept 🚀';

      const errors = await validate(dto);
      const nameErrors = errors.filter(e => e.property === 'name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });
  });
});
