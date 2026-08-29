import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { UserRepository } from '../repositories/user.repository';
import { PasswordService } from '../services/password.service';
import { PasswordPolicyService } from '../services/password-policy.service';
import { User } from '../entities/user.entity';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let passwordPolicyService: jest.Mocked<PasswordPolicyService>;

  const baseUser = new User(
    'user-1',
    'org-1',
    'user@example.com',
    'hash',
    'John',
    'Doe',
    null,
    false,
    null,
    null,
    null,
    null,
    true,
    false,
    0,
    null,
    new Date(),
    new Date(),
    null,
  );

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      incrementFailedLoginAttempts: jest.fn(async () =>
        Promise.resolve(
          new User(
            baseUser.id,
            baseUser.organizationId,
            baseUser.email,
            baseUser.passwordHash,
            baseUser.firstName,
            baseUser.lastName,
            baseUser.departmentId,
            baseUser.mfaEnabled,
            baseUser.mfaSecret,
            baseUser.mfaBackupCodes,
            baseUser.lastLoginAt,
            baseUser.lastLoginIp,
            baseUser.isActive,
            baseUser.isLocked,
            1,
            baseUser.lockedUntil,
            baseUser.createdAt,
            baseUser.updatedAt,
            baseUser.deletedAt,
          ),
        ),
      ),
      lock: jest.fn(),
      resetFailedLoginAttempts: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    const mockPasswordService = {
      verify: jest.fn(),
      hash: jest.fn(),
      needsRehash: jest.fn(),
    };

    const mockPasswordPolicyService = {
      validate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: PasswordPolicyService, useValue: mockPasswordPolicyService },
      ],
    }).compile();

    service = module.get(AuthenticationService);
    userRepository = module.get(UserRepository);
    passwordService = module.get(PasswordService);
    passwordPolicyService = module.get(PasswordPolicyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCredentials', () => {
    it('should return user when credentials are valid', async () => {
      userRepository.findByEmail.mockResolvedValue(baseUser);
      passwordService.verify.mockResolvedValue(true);

      const result = await service.validateCredentials('user@example.com', 'password');

      expect(result).toEqual(baseUser);
      expect(userRepository.resetFailedLoginAttempts).toHaveBeenCalledWith(baseUser.id);
      expect(userRepository.updateLastLogin).toHaveBeenCalledWith(baseUser.id, null);
    });

    it('should return null when user does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const result = await service.validateCredentials('unknown@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when account is inactive', async () => {
      const inactiveUser = new User(
        baseUser.id,
        baseUser.organizationId,
        baseUser.email,
        baseUser.passwordHash,
        baseUser.firstName,
        baseUser.lastName,
        baseUser.departmentId,
        baseUser.mfaEnabled,
        baseUser.mfaSecret,
        baseUser.mfaBackupCodes,
        baseUser.lastLoginAt,
        baseUser.lastLoginIp,
        false,
        baseUser.isLocked,
        baseUser.failedLoginAttempts,
        baseUser.lockedUntil,
        baseUser.createdAt,
        baseUser.updatedAt,
        baseUser.deletedAt,
      );

      userRepository.findByEmail.mockResolvedValue(inactiveUser);

      const result = await service.validateCredentials('user@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when account is locked', async () => {
      const lockedUser = new User(
        baseUser.id,
        baseUser.organizationId,
        baseUser.email,
        baseUser.passwordHash,
        baseUser.firstName,
        baseUser.lastName,
        baseUser.departmentId,
        baseUser.mfaEnabled,
        baseUser.mfaSecret,
        baseUser.mfaBackupCodes,
        baseUser.lastLoginAt,
        baseUser.lastLoginIp,
        baseUser.isActive,
        true,
        baseUser.failedLoginAttempts,
        new Date(Date.now() + 3600000),
        baseUser.createdAt,
        baseUser.updatedAt,
        baseUser.deletedAt,
      );

      userRepository.findByEmail.mockResolvedValue(lockedUser);

      const result = await service.validateCredentials('user@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null and lock account after 5 failed attempts', async () => {
      userRepository.findByEmail.mockResolvedValue(baseUser);
      passwordService.verify.mockResolvedValue(false);

      let attemptCount = 0;
      userRepository.incrementFailedLoginAttempts.mockImplementation(async () => {
        attemptCount++;
      });

      userRepository.findById.mockImplementation(async (_id: string, _organizationId: string) => {
        return new User(
          baseUser.id,
          baseUser.organizationId,
          baseUser.email,
          baseUser.passwordHash,
          baseUser.firstName,
          baseUser.lastName,
          baseUser.departmentId,
          baseUser.mfaEnabled,
          baseUser.mfaSecret,
          baseUser.mfaBackupCodes,
          baseUser.lastLoginAt,
          baseUser.lastLoginIp,
          baseUser.isActive,
          baseUser.isLocked,
          attemptCount,
          baseUser.lockedUntil,
          baseUser.createdAt,
          baseUser.updatedAt,
          baseUser.deletedAt,
        );
      });

      for (let i = 0; i < 5; i++) {
        const result = await service.validateCredentials('user@example.com', 'wrong-password');
        expect(result).toBeNull();
      }

      expect(userRepository.incrementFailedLoginAttempts).toHaveBeenCalledTimes(5);
      expect(userRepository.lock).toHaveBeenCalledWith(
        baseUser.id,
        expect.any(Date),
      );
    });

    it('should return null when password is incorrect but not lock on first attempt', async () => {
      userRepository.findByEmail.mockResolvedValue(baseUser);
      passwordService.verify.mockResolvedValue(false);

      const result = await service.validateCredentials('user@example.com', 'wrong-password');

      expect(result).toBeNull();
      expect(userRepository.incrementFailedLoginAttempts).toHaveBeenCalledWith(baseUser.id);
      expect(userRepository.lock).not.toHaveBeenCalled();
    });
  });

  describe('validatePasswordPolicy', () => {
    it('should return policy validation result', async () => {
      passwordPolicyService.validate.mockReturnValue({ valid: true, errors: [] });

      const result = await service.validatePasswordPolicy('ValidPass123!');

      expect(result).toEqual({ valid: true, errors: [] });
      expect(passwordPolicyService.validate).toHaveBeenCalledWith('ValidPass123!');
    });
  });
});
