import { Test, TestingModule } from '@nestjs/testing';
import { MfaService } from './mfa.service';
import { PrismaService } from '../../../database/prisma.service';
import { PasswordService } from './password.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(() => ({ base32: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', otpauth_url: 'otpauth://totp/QMS%20Platform:user@example.com?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=QMS%20Platform' })),
  totp: {
    verify: jest.fn(() => true),
  },
}));

describe('MfaService', () => {
  let service: MfaService;
  let prisma: jest.Mocked<PrismaService>;
  let passwordService: jest.Mocked<PasswordService>;
  let securityEventService: jest.Mocked<SecurityEventService>;

  const mockUser = {
    id: 'user-1',
    organizationId: 'org-1',
    email: 'user@example.com',
    mfaEnabled: false,
    mfaSecret: null,
    passwordHash: 'hash',
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      mfaRecoveryCode: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      mfaSession: {
        findFirst: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    passwordService = {
      verify: jest.fn(),
      hash: jest.fn(),
      needsRehash: jest.fn(),
    } as unknown as jest.Mocked<PasswordService>;

    securityEventService = {
      recordEvent: jest.fn().mockResolvedValue({ id: 'event-1' } as { id: string }),
    } as unknown as jest.Mocked<SecurityEventService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: PrismaService, useValue: prisma },
        { provide: PasswordService, useValue: passwordService },
        { provide: SecurityEventService, useValue: securityEventService },
      ],
    }).compile();

    service = module.get(MfaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setupMfa', () => {
    it('should generate secret and provisioning URI', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.setupMfa('user-1', 'org-1');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('provisioningUri');
      expect(result.provisioningUri).toContain('QMS%20Platform');
      expect(result.provisioningUri).toContain('user@example.com');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { mfaSecret: result.secret },
      });
    });

    it('should throw ConflictException if MFA already enabled', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      await expect(service.setupMfa('user-1', 'org-1')).rejects.toThrow('MFA_ALREADY_ENABLED');
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.setupMfa('user-1', 'org-1')).rejects.toThrow('User not found');
    });
  });

  describe('verifyMfaSetup', () => {
    it('should enable MFA with valid code', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, mfaSecret: secret, mfaEnabled: false });
      prisma.user.update.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      const result = await service.verifyMfaSetup('user-1', 'org-1', '123456');

      expect(result).toEqual({ enabled: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { mfaEnabled: true },
      });
      expect(securityEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MFA_ENABLED' }),
      );
    });

    it('should throw BadRequestException if setup not started', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, mfaSecret: null });

      await expect(service.verifyMfaSetup('user-1', 'org-1', '123456')).rejects.toThrow('MFA_SETUP_NOT_STARTED');
    });

    it('should throw ConflictException if MFA already enabled', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, mfaEnabled: true, mfaSecret: 'secret' });

      await expect(service.verifyMfaSetup('user-1', 'org-1', '123456')).rejects.toThrow('MFA_ALREADY_ENABLED');
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA with valid password and MFA code', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, mfaEnabled: true, mfaSecret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' });
      passwordService.verify.mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({ ...mockUser, mfaEnabled: false });

      const result = await service.disableMfa('user-1', 'org-1', 'currentPassword', '123456');

      expect(result).toEqual({ disabled: true });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ mfaEnabled: false, mfaSecret: null }),
        }),
      );
      expect(prisma.mfaRecoveryCode.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(prisma.mfaSession.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });

    it('should require MFA code if MFA is enabled', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, mfaEnabled: true, mfaSecret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' });
      passwordService.verify.mockResolvedValue(true);

      await expect(service.disableMfa('user-1', 'org-1', 'currentPassword')).rejects.toThrow('MFA_CODE_REQUIRED');
    });

    it('should throw BadRequestException if MFA not enabled', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(service.disableMfa('user-1', 'org-1', 'currentPassword', '123456')).rejects.toThrow('MFA_NOT_ENABLED');
    });
  });

  describe('generateRecoveryCodes', () => {
    it('should generate 10 recovery codes', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, mfaEnabled: true });
      passwordService.hash.mockResolvedValue('hashed-code');
      prisma.mfaRecoveryCode.createMany.mockResolvedValue({ count: 10 });

      const result = await service.generateRecoveryCodes('user-1', 'org-1');

      expect(result.codes).toHaveLength(10);
      expect(prisma.mfaRecoveryCode.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(prisma.mfaRecoveryCode.createMany).toHaveBeenCalled();
      expect(passwordService.hash).toHaveBeenCalledTimes(10);
      expect(securityEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MFA_RECOVERY_CODES_REGENERATED' }),
      );
    });

    it('should throw BadRequestException if MFA not enabled', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(service.generateRecoveryCodes('user-1', 'org-1')).rejects.toThrow('MFA_NOT_ENABLED');
    });
  });

  describe('verifyRecoveryCode', () => {
    it('should return true for valid recovery code', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, mfaEnabled: true });
      prisma.mfaRecoveryCode.findMany.mockResolvedValue([
        { id: 'rc-1', codeHash: 'hashed-code', usedAt: null },
      ]);
      passwordService.verify.mockResolvedValue(true);
      prisma.mfaRecoveryCode.update.mockResolvedValue({ id: 'rc-1', usedAt: new Date() });

      const result = await service.verifyRecoveryCode('user-1', 'code-123');

      expect(result).toBe(true);
      expect(prisma.mfaRecoveryCode.update).toHaveBeenCalledWith({
        where: { id: 'rc-1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(securityEventService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'MFA_RECOVERY_CODE_USED' }),
      );
    });

    it('should return false for invalid recovery code', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, mfaEnabled: true });
      prisma.mfaRecoveryCode.findMany.mockResolvedValue([]);

      const result = await service.verifyRecoveryCode('user-1', 'invalid-code');

      expect(result).toBe(false);
      expect(securityEventService.recordEvent).not.toHaveBeenCalled();
    });
  });

  describe('getMfaStatus', () => {
    it('should return MFA status', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, mfaEnabled: true });
      prisma.mfaRecoveryCode.count.mockResolvedValue(5);

      const result = await service.getMfaStatus('user-1', 'org-1');

      expect(result).toEqual({ enabled: true, recoveryCodesCount: 5 });
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getMfaStatus('user-1', 'org-1')).rejects.toThrow('User not found');
    });
  });
});
