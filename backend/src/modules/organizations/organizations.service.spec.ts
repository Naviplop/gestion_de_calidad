import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './services/organizations.service';
import { OrganizationRepository } from './repositories/organization.repository';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AuditLogService } from '../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../security-events/services/security-event.service';

describe('OrganizationsService - Tenancy Security', () => {
  let service: OrganizationsService;
  let organizationRepository: jest.Mocked<OrganizationRepository>;

  const mockOrganizationRepository = {
    findById: jest.fn(),
    findByTaxId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };

  const mockPrisma = {
    user: {
      count: jest.fn(),
    },
  } as unknown as jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: OrganizationRepository, useValue: mockOrganizationRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: { recordEvent: jest.fn() } },
        { provide: SecurityEventService, useValue: { recordEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get(OrganizationsService);
    organizationRepository = module.get(OrganizationRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateOrganization', () => {
    it('should call repository.update with matching organizationId', async () => {
      const org = {
        id: 'org-a',
        name: 'Org A',
        taxId: null,
        email: null,
        phone: null,
        address: null,
        timezone: 'UTC',
        locale: 'es',
        logoUrl: null,
        primaryColor: null,
        isActive: true,
        isAvailableForOperations: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      organizationRepository.findById.mockResolvedValue(org);
      organizationRepository.update.mockResolvedValue(org);

      await expect(service.updateOrganization('org-a', { name: 'Updated' })).resolves.toBeDefined();
      expect(organizationRepository.update).toHaveBeenCalledWith('org-a', 'org-a', { name: 'Updated' });
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(service.updateOrganization('org-a', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
      expect(organizationRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivateOrganization', () => {
    it('should call repository.deactivate with matching organizationId when no active users', async () => {
      const org = {
        id: 'org-a',
        name: 'Org A',
        taxId: null,
        email: null,
        phone: null,
        address: null,
        timezone: 'UTC',
        locale: 'es',
        logoUrl: null,
        primaryColor: null,
        isActive: true,
        isAvailableForOperations: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      organizationRepository.findById.mockResolvedValue(org);
      mockPrisma.user.count.mockResolvedValue(0);

      await expect(service.deactivateOrganization('org-a')).resolves.toBeUndefined();
      expect(organizationRepository.deactivate).toHaveBeenCalledWith('org-a', 'org-a');
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(service.deactivateOrganization('org-a')).rejects.toThrow(NotFoundException);
      expect(organizationRepository.deactivate).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when organization has active users', async () => {
      const org = {
        id: 'org-a',
        name: 'Org A',
        taxId: null,
        email: null,
        phone: null,
        address: null,
        timezone: 'UTC',
        locale: 'es',
        logoUrl: null,
        primaryColor: null,
        isActive: true,
        isAvailableForOperations: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      organizationRepository.findById.mockResolvedValue(org);
      mockPrisma.user.count.mockResolvedValue(2);

      await expect(service.deactivateOrganization('org-a')).rejects.toThrow(ConflictException);
      expect(organizationRepository.deactivate).not.toHaveBeenCalled();
    });
  });
});
