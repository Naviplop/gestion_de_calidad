import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './services/users.service';
import { PrismaService } from '../../database/prisma.service';
import { UserRepository } from '../auth/repositories/user.repository';
import { RoleRepository } from '../auth/repositories/role.repository';
import { PermissionRepository } from '../auth/repositories/permission.repository';
import { PasswordService } from '../auth/services/password.service';
import { ConcurrencyService } from '../../common/services/concurrency.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuditLogService } from '../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../security-events/services/security-event.service';

describe('UsersService - Tenancy Security', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<UserRepository>;
  let roleRepository: jest.Mocked<RoleRepository>;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  } as unknown as jest.Mocked<PrismaService>;

  const mockUserRepository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    incrementFailedLoginAttempts: jest.fn(),
    lock: jest.fn(),
    resetFailedLoginAttempts: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockRoleRepository = {
    findById: jest.fn(),
    findByOrganization: jest.fn(),
    findByName: jest.fn(),
    findActiveByIds: jest.fn(),
    findPermissionsByRoleIds: jest.fn(),
  };

  const mockPermissionRepository = {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByResource: jest.fn(),
    findByResourceAndAction: jest.fn(),
  };

  const mockPasswordService = {
    hash: jest.fn(),
    verify: jest.fn(),
    needsRehash: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: RoleRepository, useValue: mockRoleRepository },
        { provide: PermissionRepository, useValue: mockPermissionRepository },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: ConcurrencyService, useValue: { validateIfMatch: jest.fn() } },
        { provide: AuditLogService, useValue: { recordEvent: jest.fn() } },
        { provide: SecurityEventService, useValue: { recordEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get(UsersService);
    userRepository = module.get(UserRepository);
    roleRepository = module.get(RoleRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    it('should deny cross-tenant user access', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getUser('org-a', 'user-b')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-b', organizationId: 'org-a', deletedAt: null },
        select: expect.any(Object),
      });
    });
  });

  describe('updateUser', () => {
    it('should deny cross-tenant user update', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.updateUser('org-a', 'user-b', {})).rejects.toThrow(NotFoundException);
      expect(userRepository.findById).toHaveBeenCalledWith('user-b', 'org-a');
    });
  });

  describe('activateUser', () => {
    it('should deny cross-tenant user activation', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.activateUser('org-a', 'user-b')).rejects.toThrow(NotFoundException);
      expect(userRepository.findById).toHaveBeenCalledWith('user-b', 'org-a');
    });
  });

  describe('deactivateUser', () => {
    it('should deny cross-tenant user deactivation', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.deactivateUser('org-a', 'user-b')).rejects.toThrow(NotFoundException);
      expect(userRepository.findById).toHaveBeenCalledWith('user-b', 'org-a');
    });
  });

  describe('assignRoles', () => {
    it('should deny cross-tenant role assignment', async () => {
      userRepository.findById.mockResolvedValue({
        id: 'user-b',
        organizationId: 'org-b',
        email: 'user@b.com',
        passwordHash: 'hash',
        firstName: 'B',
        lastName: 'User',
        departmentId: null,
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        lastLoginAt: null,
        lastLoginIp: null,
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      roleRepository.findByOrganization.mockResolvedValue([
        { id: 'role-b', name: 'Admin', description: null, isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ]);

      await expect(
        service.assignRoles('org-a', 'user-b', { roleIds: ['role-b'] }, 'actor-1'),
      ).rejects.toThrow(NotFoundException);
      expect(userRepository.findById).toHaveBeenCalledWith('user-b', 'org-a');
    });

    it('should deny role assignment with role from another organization', async () => {
      userRepository.findById.mockResolvedValue({
        id: 'user-a',
        organizationId: 'org-a',
        email: 'user@a.com',
        passwordHash: 'hash',
        firstName: 'A',
        lastName: 'User',
        departmentId: null,
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        lastLoginAt: null,
        lastLoginIp: null,
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      roleRepository.findByOrganization.mockResolvedValue([
        { id: 'role-a', name: 'User', description: null, isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ]);

      await expect(
        service.assignRoles('org-a', 'user-a', { roleIds: ['role-b'] }, 'actor-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow role assignment with roles from same organization', async () => {
      userRepository.findById.mockResolvedValue({
        id: 'user-a',
        organizationId: 'org-a',
        email: 'user@a.com',
        passwordHash: 'hash',
        firstName: 'A',
        lastName: 'User',
        departmentId: null,
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        lastLoginAt: null,
        lastLoginIp: null,
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      roleRepository.findByOrganization.mockResolvedValue([
        { id: 'role-a', name: 'User', description: null, isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ]);

      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.userRole.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-a',
        organizationId: 'org-a',
        email: 'user@a.com',
        passwordHash: 'hash',
        firstName: 'A',
        lastName: 'User',
        departmentId: null,
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        lastLoginAt: null,
        lastLoginIp: null,
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        roles: [],
        department: null,
      });

      await expect(
        service.assignRoles('org-a', 'user-a', { roleIds: ['role-a'] }, 'actor-1'),
      ).resolves.toBeDefined();
    });
  });

  describe('getUserPermissions', () => {
    it('should deny cross-tenant permissions access', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getUserPermissions('org-a', 'user-b')).rejects.toThrow(NotFoundException);
      expect(userRepository.findById).toHaveBeenCalledWith('user-b', 'org-a');
    });
  });
});