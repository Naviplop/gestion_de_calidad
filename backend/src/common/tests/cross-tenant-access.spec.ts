import { Test, TestingModule } from '@nestjs/testing';
import { AntiIdorGuard } from '../guards/anti-idor.guard';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityEventService } from '../../modules/security-events/services/security-event.service';

describe('Cross-Tenant Access Tests', () => {
  let guard: AntiIdorGuard;

  const mockPrismaService = {
    user: { findFirst: jest.fn() },
    role: { findFirst: jest.fn() },
    organization: { findFirst: jest.fn() },
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
  } as unknown as jest.Mocked<PrismaService>;

  const mockReflector = {
    get: jest.fn(),
  } as unknown as jest.Mocked<Reflector>;

  const mockSecurityEventService = {
    recordEvent: jest.fn().mockResolvedValue({ id: 'event-1' } as { id: string }),
  } as unknown as jest.Mocked<SecurityEventService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntiIdorGuard,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: Reflector, useValue: mockReflector },
        { provide: SecurityEventService, useValue: mockSecurityEventService },
      ],
    }).compile();

    guard = module.get(AntiIdorGuard);
    jest.clearAllMocks();
  });

  describe('Document cross-tenant access', () => {
    it('should allow access to own tenant document', async () => {
      mockPrismaService.document.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      mockReflector.get.mockReturnValue({ resourceType: 'document', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'doc-1' }, { userId: 'user-1', organizationId: 'org-1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant document', async () => {
      mockPrismaService.document.findFirst.mockResolvedValue({ organizationId: 'org-b' });
      mockReflector.get.mockReturnValue({ resourceType: 'document', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'doc-1' }, { userId: 'user-1', organizationId: 'org-a' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny access when document does not exist', async () => {
      mockPrismaService.document.findFirst.mockResolvedValue(null);
      mockReflector.get.mockReturnValue({ resourceType: 'document', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'doc-nonexistent' }, { userId: 'user-1', organizationId: 'org-a' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DocumentVersion cross-tenant access', () => {
    it('should allow access to own tenant document version', async () => {
      mockPrismaService.documentVersion.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      mockReflector.get.mockReturnValue({ resourceType: 'documentVersion', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'ver-1' }, { userId: 'user-1', organizationId: 'org-1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant document version', async () => {
      mockPrismaService.documentVersion.findFirst.mockResolvedValue({ organizationId: 'org-b' });
      mockReflector.get.mockReturnValue({ resourceType: 'documentVersion', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'ver-1' }, { userId: 'user-1', organizationId: 'org-a' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Audit cross-tenant access', () => {
    it('should allow access to own tenant audit program', async () => {
      mockPrismaService.auditProgram.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      mockReflector.get.mockReturnValue({ resourceType: 'auditProgram', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'prog-1' }, { userId: 'user-1', organizationId: 'org-1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant audit program', async () => {
      mockPrismaService.auditProgram.findFirst.mockResolvedValue({ organizationId: 'org-b' });
      mockReflector.get.mockReturnValue({ resourceType: 'auditProgram', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'prog-1' }, { userId: 'user-1', organizationId: 'org-a' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access to own tenant audit', async () => {
      mockPrismaService.audit.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      mockReflector.get.mockReturnValue({ resourceType: 'audit', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'audit-1' }, { userId: 'user-1', organizationId: 'org-1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant audit', async () => {
      mockPrismaService.audit.findFirst.mockResolvedValue({ organizationId: 'org-b' });
      mockReflector.get.mockReturnValue({ resourceType: 'audit', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'audit-1' }, { userId: 'user-1', organizationId: 'org-a' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access to own tenant audit finding', async () => {
      mockPrismaService.auditFinding.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      mockReflector.get.mockReturnValue({ resourceType: 'auditFinding', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'finding-1' }, { userId: 'user-1', organizationId: 'org-1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant audit finding', async () => {
      mockPrismaService.auditFinding.findFirst.mockResolvedValue({ organizationId: 'org-b' });
      mockReflector.get.mockReturnValue({ resourceType: 'auditFinding', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'finding-1' }, { userId: 'user-1', organizationId: 'org-a' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Nonconformity cross-tenant access', () => {
    it('should allow access to own tenant nonconformity', async () => {
      mockPrismaService.nonconformity.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      mockReflector.get.mockReturnValue({ resourceType: 'nonconformity', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'nc-1' }, { userId: 'user-1', organizationId: 'org-1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant nonconformity', async () => {
      mockPrismaService.nonconformity.findFirst.mockResolvedValue({ organizationId: 'org-b' });
      mockReflector.get.mockReturnValue({ resourceType: 'nonconformity', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'nc-1' }, { userId: 'user-1', organizationId: 'org-a' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access to own tenant corrective action', async () => {
      mockPrismaService.correctiveAction.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      mockReflector.get.mockReturnValue({ resourceType: 'correctiveAction', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'ca-1' }, { userId: 'user-1', organizationId: 'org-1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant corrective action', async () => {
      mockPrismaService.correctiveAction.findFirst.mockResolvedValue({ organizationId: 'org-b' });
      mockReflector.get.mockReturnValue({ resourceType: 'correctiveAction', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'ca-1' }, { userId: 'user-1', organizationId: 'org-a' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Risk cross-tenant access', () => {
    it('should allow access to own tenant risk', async () => {
      mockPrismaService.risk.findFirst.mockResolvedValue({ organizationId: 'org-1' });
      mockReflector.get.mockReturnValue({ resourceType: 'risk', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'risk-1' }, { userId: 'user-1', organizationId: 'org-1' });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant risk', async () => {
      mockPrismaService.risk.findFirst.mockResolvedValue({ organizationId: 'org-b' });
      mockReflector.get.mockReturnValue({ resourceType: 'risk', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'risk-1' }, { userId: 'user-1', organizationId: 'org-a' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Tampered ID scenarios', () => {
    it('should deny access when resource ID is tampered but belongs to another tenant', async () => {
      mockPrismaService.document.findFirst.mockResolvedValue({ organizationId: 'org-b' });
      mockReflector.get.mockReturnValue({ resourceType: 'document', resourceIdParam: 'id' });

      const context = createMockContext({ id: 'tampered-doc-id' }, { userId: 'user-1', organizationId: 'org-a' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny access when resource ID is valid format but resource does not exist', async () => {
      mockPrismaService.document.findFirst.mockResolvedValue(null);
      mockReflector.get.mockReturnValue({ resourceType: 'document', resourceIdParam: 'id' });

      const context = createMockContext({ id: '00000000-0000-0000-0000-000000000000' }, { userId: 'user-1', organizationId: 'org-a' });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});

function createMockContext(
  params: Record<string, string>,
  user: { userId?: string; organizationId?: string },
) {
  const handler = jest.fn();

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
