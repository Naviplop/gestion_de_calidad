import { Test, TestingModule } from '@nestjs/testing';
import { AntiIdorGuard, RESOURCE_OWNERSHIP_KEY } from './anti-idor.guard';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { SecurityEventService } from '../../modules/security-events/services/security-event.service';

describe('AntiIdorGuard', () => {
  let guard: AntiIdorGuard;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
  } as unknown as jest.Mocked<PrismaService>;

  const mockSecurityEventService = {
    recordEvent: jest.fn().mockResolvedValue({ id: 'event-1' } as { id: string }),
  } as unknown as jest.Mocked<SecurityEventService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntiIdorGuard,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SecurityEventService, useValue: mockSecurityEventService },
      ],
    }).compile();

    guard = module.get(AntiIdorGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('without metadata', () => {
    it('should allow access when no ownership metadata is defined', async () => {
      const context = createMockContext(undefined, { userId: 'user-1', organizationId: 'org-1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('user ownership', () => {
    it('should allow access when user belongs to actor organization', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ organizationId: 'org-1' } as { organizationId: string });

      const metadata = { resourceType: 'user' as const, resourceIdParam: 'id' };
      const context = createMockContext(metadata, { userId: 'user-1', organizationId: 'org-1' }, { id: 'user-2' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        select: { organizationId: true },
      });
    });

    it('should deny access when user belongs to different organization', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ organizationId: 'org-b' } as { organizationId: string });

      const metadata = { resourceType: 'user' as const, resourceIdParam: 'id' };
      const context = createMockContext(metadata, { userId: 'user-1', organizationId: 'org-a' }, { id: 'user-2' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny access when user does not exist', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const metadata = { resourceType: 'user' as const, resourceIdParam: 'id' };
      const context = createMockContext(metadata, { userId: 'user-1', organizationId: 'org-a' }, { id: 'user-2' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('role ownership', () => {
    it('should allow access when role belongs to actor organization', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue({ organizationId: 'org-1' } as { organizationId: string });

      const metadata = { resourceType: 'role' as const, resourceIdParam: 'roleId' };
      const context = createMockContext(metadata, { userId: 'user-1', organizationId: 'org-1' }, { roleId: 'role-1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockPrismaService.role.findFirst).toHaveBeenCalledWith({
        where: { id: 'role-1' },
        select: { organizationId: true },
      });
    });

    it('should deny access when role belongs to different organization', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue({ organizationId: 'org-b' } as { organizationId: string });

      const metadata = { resourceType: 'role' as const, resourceIdParam: 'roleId' };
      const context = createMockContext(metadata, { userId: 'user-1', organizationId: 'org-a' }, { roleId: 'role-1' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('organization ownership', () => {
    it('should allow access when resource matches actor organization', async () => {
      const metadata = { resourceType: 'organization' as const, resourceIdParam: 'id' };
      const context = createMockContext(metadata, { userId: 'user-1', organizationId: 'org-1' }, { id: 'org-1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access when resource does not match actor organization', async () => {
      const metadata = { resourceType: 'organization' as const, resourceIdParam: 'id' };
      const context = createMockContext(metadata, { userId: 'user-1', organizationId: 'org-a' }, { id: 'org-b' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('missing context', () => {
    it('should deny access when organizationContext is missing', async () => {
      const metadata = { resourceType: 'user' as const, resourceIdParam: 'id' };
      const context = createMockContext(metadata, {}, { id: 'user-1' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny access when resourceId is missing', async () => {
      const metadata = { resourceType: 'user' as const, resourceIdParam: 'id' };
      const context = createMockContext(metadata, { userId: 'user-1', organizationId: 'org-1' }, {});
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});

function createMockContext(
  metadata: { resourceType: 'user' | 'role' | 'organization'; resourceIdParam: string } | undefined,
  user: { userId?: string; organizationId?: string },
  params: Record<string, string> = {},
) {
  const handler = jest.fn();
  if (metadata) {
    Reflect.defineMetadata(RESOURCE_OWNERSHIP_KEY, metadata, handler);
  }

  return {
    switchToHttp: () => ({
      getRequest: () => ({
        organizationContext: user.organizationId ? { organizationId: user.organizationId } : undefined,
        userId: user.userId,
        params,
      }),
    }),
    getHandler: () => handler,
  };
}