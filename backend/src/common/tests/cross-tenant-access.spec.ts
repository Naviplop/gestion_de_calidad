import { Test, TestingModule } from '@nestjs/testing';
import { AntiIdorGuard } from '../guards/anti-idor.guard';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityEventService } from '../../modules/security-events/services/security-event.service';

const USER_ID = '6a93f5f0-1d07-42cd-a3e7-d700df1e7146';
const ORG_A = '86fe4fab-31df-4722-ab3f-ac6ac63d6be8';
const ORG_B = '86fe4fab-31df-4722-ab3f-ac6ac63d6be9';
const DOC_ID = 'e6b35929-e599-4b58-bc19-55e4e35ab701';
const DOC_VERSION_ID = 'e6b35929-e599-4b58-bc19-55e4e35ab702';
const AUDIT_PROGRAM_ID = 'e6b35929-e599-4b58-bc19-55e4e35ab703';
const AUDIT_ID = 'e6b35929-e599-4b58-bc19-55e4e35ab704';
const AUDIT_FINDING_ID = 'e6b35929-e599-4b58-bc19-55e4e35ab705';
const NC_ID = 'e6b35929-e599-4b58-bc19-55e4e35ab706';
const CA_ID = 'e6b35929-e599-4b58-bc19-55e4e35ab707';
const RISK_ID = 'e6b35929-e599-4b58-bc19-55e4e35ab708';
const TAMPERED_ID = 'not-a-valid-uuid';

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
      mockPrismaService.document.findFirst.mockResolvedValue({ organizationId: ORG_A });
      mockReflector.get.mockReturnValue({ resourceType: 'document', resourceIdParam: 'id' });

      const context = createMockContext({ id: DOC_ID }, { userId: USER_ID, organizationId: ORG_A });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant document', async () => {
      mockPrismaService.document.findFirst.mockResolvedValue({ organizationId: ORG_B });
      mockReflector.get.mockReturnValue({ resourceType: 'document', resourceIdParam: 'id' });

      const context = createMockContext({ id: DOC_ID }, { userId: USER_ID, organizationId: ORG_A });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny access when document does not exist', async () => {
      mockPrismaService.document.findFirst.mockResolvedValue(null);
      mockReflector.get.mockReturnValue({ resourceType: 'document', resourceIdParam: 'id' });

      const context = createMockContext({ id: DOC_ID }, { userId: USER_ID, organizationId: ORG_A });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DocumentVersion cross-tenant access', () => {
    it('should allow access to own tenant document version', async () => {
      mockPrismaService.documentVersion.findFirst.mockResolvedValue({ organizationId: ORG_A });
      mockReflector.get.mockReturnValue({ resourceType: 'documentVersion', resourceIdParam: 'id' });

      const context = createMockContext({ id: DOC_VERSION_ID }, { userId: USER_ID, organizationId: ORG_A });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant document version', async () => {
      mockPrismaService.documentVersion.findFirst.mockResolvedValue({ organizationId: ORG_B });
      mockReflector.get.mockReturnValue({ resourceType: 'documentVersion', resourceIdParam: 'id' });

      const context = createMockContext({ id: DOC_VERSION_ID }, { userId: USER_ID, organizationId: ORG_A });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Audit cross-tenant access', () => {
    it('should allow access to own tenant audit program', async () => {
      mockPrismaService.auditProgram.findFirst.mockResolvedValue({ organizationId: ORG_A });
      mockReflector.get.mockReturnValue({ resourceType: 'auditProgram', resourceIdParam: 'id' });

      const context = createMockContext({ id: AUDIT_PROGRAM_ID }, { userId: USER_ID, organizationId: ORG_A });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant audit program', async () => {
      mockPrismaService.auditProgram.findFirst.mockResolvedValue({ organizationId: ORG_B });
      mockReflector.get.mockReturnValue({ resourceType: 'auditProgram', resourceIdParam: 'id' });

      const context = createMockContext({ id: AUDIT_PROGRAM_ID }, { userId: USER_ID, organizationId: ORG_A });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access to own tenant audit', async () => {
      mockPrismaService.audit.findFirst.mockResolvedValue({ organizationId: ORG_A });
      mockReflector.get.mockReturnValue({ resourceType: 'audit', resourceIdParam: 'id' });

      const context = createMockContext({ id: AUDIT_ID }, { userId: USER_ID, organizationId: ORG_A });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant audit', async () => {
      mockPrismaService.audit.findFirst.mockResolvedValue({ organizationId: ORG_B });
      mockReflector.get.mockReturnValue({ resourceType: 'audit', resourceIdParam: 'id' });

      const context = createMockContext({ id: AUDIT_ID }, { userId: USER_ID, organizationId: ORG_A });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access to own tenant audit finding', async () => {
      mockPrismaService.auditFinding.findFirst.mockResolvedValue({ organizationId: ORG_A });
      mockReflector.get.mockReturnValue({ resourceType: 'auditFinding', resourceIdParam: 'id' });

      const context = createMockContext({ id: AUDIT_FINDING_ID }, { userId: USER_ID, organizationId: ORG_A });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant audit finding', async () => {
      mockPrismaService.auditFinding.findFirst.mockResolvedValue({ organizationId: ORG_B });
      mockReflector.get.mockReturnValue({ resourceType: 'auditFinding', resourceIdParam: 'id' });

      const context = createMockContext({ id: AUDIT_FINDING_ID }, { userId: USER_ID, organizationId: ORG_A });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Nonconformity cross-tenant access', () => {
    it('should allow access to own tenant nonconformity', async () => {
      mockPrismaService.nonconformity.findFirst.mockResolvedValue({ organizationId: ORG_A });
      mockReflector.get.mockReturnValue({ resourceType: 'nonconformity', resourceIdParam: 'id' });

      const context = createMockContext({ id: NC_ID }, { userId: USER_ID, organizationId: ORG_A });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant nonconformity', async () => {
      mockPrismaService.nonconformity.findFirst.mockResolvedValue({ organizationId: ORG_B });
      mockReflector.get.mockReturnValue({ resourceType: 'nonconformity', resourceIdParam: 'id' });

      const context = createMockContext({ id: NC_ID }, { userId: USER_ID, organizationId: ORG_A });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access to own tenant corrective action', async () => {
      mockPrismaService.correctiveAction.findFirst.mockResolvedValue({ organizationId: ORG_A });
      mockReflector.get.mockReturnValue({ resourceType: 'correctiveAction', resourceIdParam: 'id' });

      const context = createMockContext({ id: CA_ID }, { userId: USER_ID, organizationId: ORG_A });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant corrective action', async () => {
      mockPrismaService.correctiveAction.findFirst.mockResolvedValue({ organizationId: ORG_B });
      mockReflector.get.mockReturnValue({ resourceType: 'correctiveAction', resourceIdParam: 'id' });

      const context = createMockContext({ id: CA_ID }, { userId: USER_ID, organizationId: ORG_A });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Risk cross-tenant access', () => {
    it('should allow access to own tenant risk', async () => {
      mockPrismaService.risk.findFirst.mockResolvedValue({ organizationId: ORG_A });
      mockReflector.get.mockReturnValue({ resourceType: 'risk', resourceIdParam: 'id' });

      const context = createMockContext({ id: RISK_ID }, { userId: USER_ID, organizationId: ORG_A });
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny access to other tenant risk', async () => {
      mockPrismaService.risk.findFirst.mockResolvedValue({ organizationId: ORG_B });
      mockReflector.get.mockReturnValue({ resourceType: 'risk', resourceIdParam: 'id' });

      const context = createMockContext({ id: RISK_ID }, { userId: USER_ID, organizationId: ORG_A });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Tampered ID scenarios', () => {
    it('should deny access when resource ID has invalid format', async () => {
      mockPrismaService.document.findFirst.mockResolvedValue({ organizationId: ORG_B });
      mockReflector.get.mockReturnValue({ resourceType: 'document', resourceIdParam: 'id' });

      const context = createMockContext({ id: TAMPERED_ID }, { userId: USER_ID, organizationId: ORG_A });
      await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
    });

    it('should deny access when resource ID is valid format but resource does not exist', async () => {
      mockPrismaService.document.findFirst.mockResolvedValue(null);
      mockReflector.get.mockReturnValue({ resourceType: 'document', resourceIdParam: 'id' });

      const context = createMockContext({ id: '00000000-0000-0000-0000-000000000000' }, { userId: USER_ID, organizationId: ORG_A });
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
