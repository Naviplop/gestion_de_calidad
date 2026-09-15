import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenService } from '../services/refresh-token.service';
import { JwtTokenService } from '../services/jwt-token.service';
import { PrismaService } from '../../../database/prisma.service';

describe('RefreshTokenService - Concurrency', () => {
  let service: RefreshTokenService;

  const mockPrisma = {
    refreshToken: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const mockJwtTokenService = {
      validateAccessToken: jest.fn(),
      generateAccessToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: JwtTokenService, useValue: mockJwtTokenService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndRotateRefreshToken', () => {
    it('should rotate token on first use', async () => {
      const existingToken = {
        id: 'token-1',
        tokenHash: 'a'.repeat(64),
        userId: 'user-1',
        organizationId: 'org-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        userAgent: 'agent',
        ipAddress: '1.2.3.4',
      };

      const newToken = {
        id: 'token-2',
        userId: 'user-1',
        organizationId: 'org-1',
        tokenHash: 'b'.repeat(64),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
        userAgent: 'agent',
        ipAddress: '1.2.3.4',
      };

      mockPrisma.refreshToken.findFirst.mockResolvedValue(existingToken);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        const tx = {
          refreshToken: {
            update: jest.fn().mockResolvedValue({ ...existingToken, revokedAt: new Date() }),
            create: jest.fn().mockResolvedValue(newToken),
          },
        };
        return fn(tx);
      });

      const result = await service.validateAndRotateRefreshToken('raw-token-1');

      expect(result).toBeDefined();
      expect(result?.tokenHash).toHaveLength(64);
      expect(result?.userId).toBe('user-1');
      expect(result?.organizationId).toBe('org-1');
      expect(result?.rawToken).not.toBe('raw-token-1');
    });

    it('should detect reuse when token is already revoked', async () => {
      const existingToken = {
        id: 'token-1',
        tokenHash: 'hash-1',
        userId: 'user-1',
        organizationId: 'org-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(),
        userAgent: 'agent',
        ipAddress: '1.2.3.4',
      };

      mockPrisma.refreshToken.findFirst.mockResolvedValue(existingToken);
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.validateAndRotateRefreshToken('raw-token-1')).rejects.toThrow('REFRESH_TOKEN_REUSE');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should reject expired token', async () => {
      const existingToken = {
        id: 'token-1',
        tokenHash: 'hash-1',
        userId: 'user-1',
        organizationId: 'org-1',
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
      };

      mockPrisma.refreshToken.findFirst.mockResolvedValue(existingToken);

      const result = await service.validateAndRotateRefreshToken('raw-token-1');

      expect(result).toBeNull();
    });

    it('should reject non-existent token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      const result = await service.validateAndRotateRefreshToken('raw-token-invalid');

      expect(result).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke existing token', async () => {
      const existingToken = {
        id: 'token-1',
        tokenHash: 'hash-1',
        userId: 'user-1',
        organizationId: 'org-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      };

      mockPrisma.refreshToken.findFirst.mockResolvedValue(existingToken);
      mockPrisma.refreshToken.update.mockResolvedValue({ ...existingToken, revokedAt: new Date() });

      await service.revokeRefreshToken('raw-token-1');

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should not throw when revoking non-existent token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.revokeRefreshToken('raw-token-invalid')).resolves.toBeUndefined();
    });
  });

  describe('revokeAllRefreshTokensForUser', () => {
    it('should revoke all active tokens for user', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.revokeAllRefreshTokensForUser('user-1');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
