import { Test, TestingModule } from '@nestjs/testing';
import { JwtTokenService } from '../services/jwt-token.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../guards/auth.guard';
import { AntiIdorGuard } from '../../../common/guards/anti-idor.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { PrismaService } from '../../../database/prisma.service';
import { Reflector } from '@nestjs/core';
import { SecurityEventService } from '../../../modules/security-events/services/security-event.service';

describe('Security Guards', () => {
  describe('AuthGuard', () => {
    let authGuard: AuthGuard;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthGuard,
          {
            provide: JwtTokenService,
            useValue: {
              validateAccessToken: jest.fn(),
            },
          },
          {
            provide: RefreshTokenService,
            useValue: {
              validateAndRotateRefreshToken: jest.fn(),
            },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(),
            },
          },
        ],
      }).compile();

      authGuard = module.get(AuthGuard);
    });

    it('should allow access with valid token', async () => {
      const jwtTokenService = (authGuard as unknown as { jwtTokenService: { validateAccessToken: jest.Mock } }).jwtTokenService;
      jwtTokenService.validateAccessToken.mockResolvedValue({ sub: 'user-1', org: 'org-1' });

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer valid-token' },
            cookies: {},
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as Parameters<typeof authGuard.canActivate>[0];

      const result = await authGuard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException without token', async () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
            cookies: {},
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as Parameters<typeof authGuard.canActivate>[0];

      await expect(authGuard.canActivate(mockContext)).rejects.toThrow('Unauthorized');
    });
  });

  describe('AntiIdorGuard', () => {
    let antiIdorGuard: AntiIdorGuard;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AntiIdorGuard,
          {
            provide: PrismaService,
            useValue: {
              user: { findFirst: jest.fn() },
              role: { findFirst: jest.fn() },
              department: { findFirst: jest.fn() },
              process: { findFirst: jest.fn() },
              document: { findFirst: jest.fn() },
              documentVersion: { findFirst: jest.fn() },
              documentDistribution: { findFirst: jest.fn() },
              auditProgram: { findFirst: jest.fn() },
              audit: { findFirst: jest.fn() },
              auditChecklist: { findFirst: jest.fn() },
              auditChecklistItem: { findFirst: jest.fn() },
              auditFinding: { findFirst: jest.fn() },
              nonconformity: { findFirst: jest.fn() },
              correctiveAction: { findFirst: jest.fn() },
              rootCauseAnalysis: { findFirst: jest.fn() },
              risk: { findFirst: jest.fn() },
              riskAssessment: { findFirst: jest.fn() },
              riskControl: { findFirst: jest.fn() },
              riskTreatment: { findFirst: jest.fn() },
            },
          },
          {
            provide: SecurityEventService,
            useValue: {
              recordEvent: jest.fn().mockResolvedValue({ id: 'event-1' } as { id: string }),
            },
          },
        ],
      }).compile();

      antiIdorGuard = module.get(AntiIdorGuard);
    });

    it('should allow access when user belongs to organization', async () => {
      const prisma = (antiIdorGuard as unknown as { prisma: { user: { findFirst: jest.Mock } } }).prisma;
      prisma.user.findFirst.mockResolvedValue({ organizationId: 'org-1' });

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { sub: 'user-1', org: 'org-1' },
            params: { id: 'resource-1' },
          }),
        }),
        getHandler: () => ({
          [Symbol('metadata')]: { resourceType: 'user', resourceIdParam: 'id' },
        }),
        getClass: () => ({}),
      } as unknown as Parameters<typeof antiIdorGuard.canActivate>[0];

      const result = await antiIdorGuard.canActivate(mockContext);
      expect(result).toBe(true);
    });
  });

  describe('PermissionsGuard', () => {
    let permissionsGuard: PermissionsGuard;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PermissionsGuard,
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn(),
            },
          },
          {
            provide: PrismaService,
            useValue: {
              userRole: { findMany: jest.fn() },
            },
          },
          {
            provide: SecurityEventService,
            useValue: {
              recordEvent: jest.fn(),
            },
          },
        ],
      }).compile();

      permissionsGuard = module.get(PermissionsGuard);
    });

    it('should allow access when user has required permission', async () => {
      const reflector = (permissionsGuard as unknown as { reflector: { getAllAndOverride: jest.Mock } }).reflector;
      reflector.getAllAndOverride.mockReturnValue(['documents:read']);

      const prisma = (permissionsGuard as unknown as { prisma: { userRole: { findMany: jest.Mock } } }).prisma;
      prisma.userRole.findMany.mockResolvedValue([
        {
          role: { isActive: true, permissions: [{ permission: { resource: 'documents', action: 'read' } }] },
        },
      ]);

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { sub: 'user-1', org: 'org-1' },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as Parameters<typeof permissionsGuard.canActivate>[0];

      const result = await permissionsGuard.canActivate(mockContext);
      expect(result).toBe(true);
    });
  });
});