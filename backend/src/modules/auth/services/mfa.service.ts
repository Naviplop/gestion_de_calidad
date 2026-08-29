import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PasswordService } from './password.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';
import { randomUUID, createHash } from 'crypto';
import * as speakeasy from 'speakeasy';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  async setupMfa(userId: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.mfaEnabled) {
      throw new ConflictException('MFA_ALREADY_ENABLED');
    }

    const secret = speakeasy.generateSecret({
      name: `QMS Platform:${user.email}`,
      issuer: 'QMS Platform',
    });

    const base32 = secret.base32 as string;
    const provisioningUri = secret.otpauth_url as string;

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: base32 },
    });

    return {
      secret: base32,
      provisioningUri,
    };
  }

  async verifyMfaSetup(userId: string, organizationId: string, code: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.mfaEnabled) {
      throw new ConflictException('MFA_ALREADY_ENABLED');
    }

    if (!user.mfaSecret) {
      throw new BadRequestException('MFA_SETUP_NOT_STARTED');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      await this.securityEventService.recordEvent({
        organizationId,
        actorId: userId,
        eventType: 'MFA_FAILURE',
        severity: 'medium',
        description: 'Invalid MFA code during setup',
        metadata: { phase: 'setup' },
      });
      throw new BadRequestException('MFA_CODE_INVALID');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    await this.securityEventService.recordEvent({
      organizationId,
      actorId: userId,
      eventType: 'MFA_ENABLED',
      severity: 'low',
      description: 'MFA enabled successfully',
    });

    return { enabled: true };
  }

  async disableMfa(userId: string, organizationId: string, currentPassword: string, mfaCode?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, passwordHash: true, mfaEnabled: true, mfaSecret: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA_NOT_ENABLED');
    }

    const isCurrentPasswordValid = await this.passwordService.verify(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      await this.securityEventService.recordEvent({
        organizationId,
        actorId: userId,
        eventType: 'MFA_FAILURE',
        severity: 'high',
        description: 'Invalid current password during MFA disable',
        metadata: { phase: 'disable' },
      });
      throw new BadRequestException('INVALID_CREDENTIALS');
    }

    if (user.mfaEnabled && !mfaCode) {
      throw new BadRequestException('MFA_CODE_REQUIRED');
    }

    if (user.mfaSecret && mfaCode) {
      const isValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaCode,
        window: 1,
      });

      if (!isValid) {
        await this.securityEventService.recordEvent({
          organizationId,
          actorId: userId,
          eventType: 'MFA_FAILURE',
          severity: 'high',
          description: 'Invalid MFA code during disable',
          metadata: { phase: 'disable' },
        });
        throw new BadRequestException('MFA_CODE_INVALID');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    await this.prisma.mfaRecoveryCode.deleteMany({ where: { userId } });
    await this.prisma.mfaSession.deleteMany({ where: { userId } });

    await this.securityEventService.recordEvent({
      organizationId,
      actorId: userId,
      eventType: 'MFA_DISABLED',
      severity: 'low',
      description: 'MFA disabled successfully',
    });

    return { disabled: true };
  }

  async getMfaStatus(userId: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, mfaEnabled: true, mfaSecret: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const recoveryCodesCount = await this.prisma.mfaRecoveryCode.count({
      where: { userId, usedAt: null },
    });

    return {
      enabled: user.mfaEnabled,
      recoveryCodesCount,
    };
  }

  async generateRecoveryCodes(userId: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, mfaEnabled: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA_NOT_ENABLED');
    }

    await this.prisma.mfaRecoveryCode.deleteMany({ where: { userId } });

    const codes: string[] = [];
    const hashedCodes: { codeHash: string }[] = [];

    for (let i = 0; i < 10; i++) {
      const rawCode = createHash('sha256').update(randomUUID() + Date.now() + i).digest('hex').slice(0, 8);
      codes.push(rawCode);
      const codeHash = await this.passwordService.hash(rawCode);
      hashedCodes.push({ codeHash });
    }

    await this.prisma.mfaRecoveryCode.createMany({
      data: hashedCodes.map((c) => ({ ...c, userId })),
    });

    await this.securityEventService.recordEvent({
      organizationId,
      actorId: userId,
      eventType: 'MFA_RECOVERY_CODES_REGENERATED',
      severity: 'low',
      description: 'MFA recovery codes regenerated',
      metadata: { codesCount: codes.length },
    });

    return { codes };
  }

  async verifyRecoveryCode(userId: string, code: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, organizationId: true, mfaEnabled: true },
    });

    if (!user || !user.mfaEnabled) {
      return false;
    }

    const recoveryCodes = await this.prisma.mfaRecoveryCode.findMany({
      where: { userId, usedAt: null },
    });

    for (const rc of recoveryCodes) {
      const isValid = await this.passwordService.verify(code, rc.codeHash);
      if (isValid) {
        await this.prisma.mfaRecoveryCode.update({
          where: { id: rc.id },
          data: { usedAt: new Date() },
        });

        await this.securityEventService.recordEvent({
          organizationId: user.organizationId,
          actorId: userId,
          eventType: 'MFA_RECOVERY_CODE_USED',
          severity: 'medium',
          description: 'MFA recovery code used',
        });

        return true;
      }
    }

    return false;
  }

  validateTotp(code: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
  }
}
