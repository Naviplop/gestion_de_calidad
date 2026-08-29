import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthenticationService } from './authentication.service';
import { JwtTokenService } from './jwt-token.service';
import { RefreshTokenService } from './refresh-token.service';
import { PasswordService } from './password.service';
import { PasswordPolicyService } from './password-policy.service';
import { PrismaService } from '../../../database/prisma.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';
import { MfaService } from './mfa.service';

describe('AuthService - Password Operations', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let passwordService: jest.Mocked<PasswordService>;
  let passwordPolicyService: jest.Mocked<PasswordPolicyService>;
  let refreshTokenService: jest.Mocked<RefreshTokenService>;
  let securityEventService: jest.Mocked<SecurityEventService>;

  const mockUser = {
    id: 'user-1',
    organizationId: 'org-1',
    email: 'user@example.com',
    passwordHash: 'current-hash',
    isActive: true,
  } as const;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      organization: {
        findFirst: jest.fn(),
      },
      userRole: {
        findMany: jest.fn(),
      },
      passwordResetToken: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    passwordService = {
      verify: jest.fn(),
      hash: jest.fn(),
      needsRehash: jest.fn(),
    } as unknown as jest.Mocked<PasswordService>;

    passwordPolicyService = {
      validate: jest.fn(),
    } as unknown as jest.Mocked<PasswordPolicyService>;

    refreshTokenService = {
      revokeAllRefreshTokensForUser: jest.fn(),
    } as unknown as jest.Mocked<RefreshTokenService>;

    securityEventService = {
      recordEvent: jest.fn().mockResolvedValue({ id: 'event-1' } as { id: string }),
    } as unknown as jest.Mocked<SecurityEventService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthenticationService, useValue: { validateCredentials: jest.fn() } },
        { provide: JwtTokenService, useValue: { generateAccessToken: jest.fn().mockResolvedValue('token') } },
        { provide: RefreshTokenService, useValue: refreshTokenService },
        { provide: PasswordService, useValue: passwordService },
        { provide: PasswordPolicyService, useValue: passwordPolicyService },
        { provide: PrismaService, useValue: prisma },
        { provide: SecurityEventService, useValue: securityEventService },
        { provide: MfaService, useValue: {} },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      passwordService.verify.mockResolvedValue(true);
      passwordPolicyService.validate.mockResolvedValue({ valid: true, errors: [] });
      passwordService.hash.mockResolvedValue('new-hash');
      prisma.user.update.mockResolvedValue({ ...mockUser, passwordHash: 'new-hash' });

      const result = await service.changePassword('user-1', 'currentPassword', 'NewPass123!');

      expect(result).toEqual({ changed: true });
      expect(passwordService.verify).toHaveBeenCalledWith('currentPassword', 'current-hash');
      expect(passwordService.hash).toHaveBeenCalledWith('NewPass123!');
      expect(refreshTokenService.revokeAllRefreshTokensForUser).toHaveBeenCalledWith('user-1');
      expect(securityEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'PASSWORD_CHANGED' }),
      );
    });

    it('should reject invalid current password', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      passwordService.verify.mockResolvedValue(false);

      await expect(service.changePassword('user-1', 'wrong', 'NewPass123!')).rejects.toThrow('INVALID_CREDENTIALS');
      expect(securityEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'PASSWORD_CHANGE_FAILED' }),
      );
    });

    it('should reject weak new password', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      passwordService.verify.mockResolvedValue(true);
      passwordPolicyService.validate.mockResolvedValue({ valid: false, errors: ['Too short'] });

      await expect(service.changePassword('user-1', 'current', 'weak')).rejects.toThrow('Password does not meet policy requirements');
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.changePassword('user-1', 'current', 'NewPass123!')).rejects.toThrow('User not found');
    });
  });

  describe('requestPasswordReset', () => {
    it('should create reset token for active user', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.passwordResetToken.create.mockResolvedValue({ id: 'reset-1' });

      const result = await service.requestPasswordReset('user@example.com');

      expect(result).toEqual({ message: 'If the account exists, reset instructions will be sent.' });
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
      expect(securityEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'PASSWORD_RESET_REQUESTED' }),
      );
    });

    it('should return generic message for nonexistent email', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.requestPasswordReset('unknown@example.com');

      expect(result).toEqual({ message: 'If the account exists, reset instructions will be sent.' });
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(securityEventService.recordEvent).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const resetToken = {
        id: 'reset-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        user: { ...mockUser, organizationId: 'org-1' },
      };
      prisma.passwordResetToken.findFirst.mockResolvedValue(resetToken);
      passwordPolicyService.validate.mockResolvedValue({ valid: true, errors: [] });
      passwordService.hash.mockResolvedValue('new-hash');
      prisma.user.update.mockResolvedValue({ ...mockUser, passwordHash: 'new-hash' });
      prisma.passwordResetToken.update.mockResolvedValue({ ...resetToken, usedAt: new Date() });

      const result = await service.resetPassword('token', 'NewPass123!');

      expect(result).toEqual({ reset: true });
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'reset-1' }, data: { usedAt: expect.any(Date) } }),
      );
      expect(refreshTokenService.revokeAllRefreshTokensForUser).toHaveBeenCalledWith('user-1');
      expect(securityEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'PASSWORD_RESET' }),
      );
    });

    it('should reject expired or invalid token', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword('invalid', 'NewPass123!')).rejects.toThrow('INVALID_TOKEN');
      expect(securityEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'PASSWORD_RESET_FAILED' }),
      );
    });

    it('should reject weak new password', async () => {
      const resetToken = {
        id: 'reset-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        user: mockUser,
      };
      prisma.passwordResetToken.findFirst.mockResolvedValue(resetToken);
      passwordPolicyService.validate.mockResolvedValue({ valid: false, errors: ['Too short'] });

      await expect(service.resetPassword('token', 'weak')).rejects.toThrow('Password does not meet policy requirements');
    });
  });
});
