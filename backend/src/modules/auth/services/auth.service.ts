import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID, randomBytes } from 'crypto';
import { AuthenticationService } from './authentication.service';
import { JwtTokenService } from './jwt-token.service';
import { RefreshTokenService } from './refresh-token.service';
import { PasswordService } from '../services/password.service';
import { PasswordPolicyService } from '../services/password-policy.service';
import { PrismaService } from '../../../database/prisma.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';
import { MfaService } from './mfa.service';

export interface JwtPayload {
  sub: string;
  org: string;
  roles: string[];
  permissionsHash: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly passwordService: PasswordService,
    private readonly passwordPolicyService: PasswordPolicyService,
    private readonly prisma: PrismaService,
    private readonly securityEventService: SecurityEventService,
    private readonly mfaService: MfaService,
  ) {}

  async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<{ accessToken: string; expiresIn: number; tokenType: string; sessionId: string; user: { id: string; email: string; firstName: string; lastName: string; mfaEnabled: boolean; tenant: { organizationId: string; name: string }; roles: Array<{ id: string; name: string }> }; refreshToken: string } | { mfaRequired: true; sessionId: string; message: string }> {
    const user = await this.authenticationService.validateCredentials(email, password, ipAddress);
    if (!user) {
      await this.securityEventService.recordEvent({
        organizationId: '',
        actorId: null,
        eventType: 'LOGIN_FAILED',
        severity: 'medium',
        description: 'Failed login attempt',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      throw new BadRequestException('INVALID_CREDENTIALS');
    }

    if (user.mfaEnabled) {
      const sessionId = randomUUID();
      const mfaSession = await this.prisma.mfaSession.create({
        data: {
          userId: user.id,
          sessionId,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      await this.securityEventService.recordEvent({
        organizationId: user.organizationId,
        actorId: user.id,
        eventType: 'MFA_CHALLENGE_CREATED',
        severity: 'low',
        description: 'MFA challenge created for login',
        metadata: { sessionId: mfaSession.sessionId },
      });

      return {
        mfaRequired: true,
        sessionId: mfaSession.sessionId,
        message: 'MFA verification required',
      };
    }

    return this.issueTokens(user, ipAddress, userAgent);
  }

  async verifyMfa(sessionId: string, mfaCode: string, ipAddress?: string, userAgent?: string): Promise<{ accessToken: string; expiresIn: number; tokenType: string; sessionId: string; refreshToken: string }> {
    const session = await this.prisma.mfaSession.findFirst({
      where: { sessionId, verified: false, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!session) {
      await this.securityEventService.recordEvent({
        organizationId: '',
        actorId: null,
        eventType: 'MFA_FAILURE',
        severity: 'medium',
        description: 'Invalid or expired MFA session',
        metadata: { sessionId },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      throw new BadRequestException('MFA_SESSION_INVALID');
    }

    const user = session.user;
    let isValid = false;

    if (user.mfaSecret) {
      isValid = await this.mfaService.validateTotp(mfaCode, user.mfaSecret);
    }

    if (!isValid) {
      isValid = await this.mfaService.verifyRecoveryCode(user.id, mfaCode);
    }

    if (!isValid) {
      await this.securityEventService.recordEvent({
        organizationId: user.organizationId,
        actorId: user.id,
        eventType: 'MFA_FAILURE',
        severity: 'high',
        description: 'Invalid MFA code provided',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        metadata: { sessionId: session.sessionId },
      });
      throw new BadRequestException('MFA_CODE_INVALID');
    }

    await this.prisma.mfaSession.update({
      where: { id: session.id },
      data: { verified: true },
    });

    await this.securityEventService.recordEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      eventType: 'MFA_SUCCESS',
      severity: 'low',
      description: 'MFA verification successful',
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      metadata: { sessionId: session.sessionId },
    });

    const tokens = await this.issueTokens(user, ipAddress, userAgent);
    const result = {
      ...tokens,
      sessionId: randomUUID(),
    };
    return result;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, organizationId: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidCurrent = await this.passwordService.verify(currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      await this.securityEventService.recordEvent({
        organizationId: user.organizationId,
        actorId: userId,
        eventType: 'PASSWORD_CHANGE_FAILED',
        severity: 'medium',
        description: 'Invalid current password during password change',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      throw new BadRequestException('INVALID_CREDENTIALS');
    }

    const policyResult = await this.passwordPolicyService.validate(newPassword);
    if (!policyResult.valid) {
      throw new BadRequestException({ message: 'Password does not meet policy requirements', errors: policyResult.errors });
    }

    const newPasswordHash = await this.passwordService.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
    await this.refreshTokenService.revokeAllRefreshTokensForUser(userId);

    await this.securityEventService.recordEvent({
      organizationId: user.organizationId,
      actorId: userId,
      eventType: 'PASSWORD_CHANGED',
      severity: 'low',
      description: 'Password changed successfully',
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    return { changed: true };
  }

  async requestPasswordReset(email: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true, organizationId: true, isActive: true },
    });

    if (user && user.isActive) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          tokenHash,
          expiresAt,
        },
      });

      await this.securityEventService.recordEvent({
        organizationId: user.organizationId,
        actorId: user.id,
        eventType: 'PASSWORD_RESET_REQUESTED',
        severity: 'low',
        description: 'Password reset requested',
        metadata: { expiresAt: expiresAt.toISOString() },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
    }

    return { message: 'If the account exists, reset instructions will be sent.' };
  }

  async resetPassword(token: string, newPassword: string, ipAddress?: string, userAgent?: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, organizationId: true, isActive: true } } },
    });

    if (!resetToken || !resetToken.user || !resetToken.user.isActive) {
      await this.securityEventService.recordEvent({
        organizationId: '',
        actorId: null,
        eventType: 'PASSWORD_RESET_FAILED',
        severity: 'medium',
        description: 'Invalid or expired password reset token',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      throw new BadRequestException('INVALID_TOKEN');
    }

    const policyResult = await this.passwordPolicyService.validate(newPassword);
    if (!policyResult.valid) {
      throw new BadRequestException({ message: 'Password does not meet policy requirements', errors: policyResult.errors });
    }

    const newPasswordHash = await this.passwordService.hash(newPassword);

    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: newPasswordHash },
    });
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, id: { not: resetToken.id }, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.refreshTokenService.revokeAllRefreshTokensForUser(resetToken.userId);

    await this.securityEventService.recordEvent({
      organizationId: resetToken.user.organizationId,
      actorId: resetToken.userId,
      eventType: 'PASSWORD_RESET',
      severity: 'low',
      description: 'Password reset successfully',
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    return { reset: true };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<{ accessToken: string; expiresIn: number; tokenType: string; refreshToken: string }> {
    const tokenInfo = await this.refreshTokenService.validateAndRotateRefreshToken(refreshToken);
    if (!tokenInfo) {
      await this.securityEventService.recordEvent({
        organizationId: '',
        actorId: null,
        eventType: 'INVALID_TOKEN',
        severity: 'medium',
        description: 'Invalid refresh token provided',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      throw new BadRequestException('InvalidToken');
    }

    const accessToken = await this.jwtTokenService.generateAccessToken({
      sub: tokenInfo.userId,
      org: tokenInfo.organizationId,
      roles: [],
      permissionsHash: '',
    });

    await this.securityEventService.recordEvent({
      organizationId: tokenInfo.organizationId,
      actorId: tokenInfo.userId,
      eventType: 'TOKEN_REFRESH',
      severity: 'low',
      description: 'Access token refreshed successfully',
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    return {
      accessToken,
      expiresIn: 900,
      tokenType: 'Bearer',
      refreshToken: tokenInfo.rawToken,
    };
  }

  async logout(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const existingToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      select: { userId: true, organizationId: true },
    });

    await this.refreshTokenService.revokeRefreshToken(refreshToken);

    if (existingToken) {
      await this.securityEventService.recordEvent({
        organizationId: existingToken.organizationId,
        actorId: existingToken.userId,
        eventType: 'LOGOUT',
        severity: 'low',
        description: 'User logged out successfully',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
    }
  }

  async logoutAll(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { organizationId: true },
    });

    await this.refreshTokenService.revokeAllRefreshTokensForUser(userId);

    if (user) {
      await this.securityEventService.recordEvent({
        organizationId: user.organizationId,
        actorId: userId,
        eventType: 'LOGOUT_ALL',
        severity: 'medium',
        description: 'All user sessions revoked',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
    }
  }

  async validatePasswordPolicy(password: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.passwordPolicyService.validate(password);
  }

  async getMe(userId: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        mfaEnabled: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
      select: { name: true, logoUrl: true },
    });

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { select: { id: true, name: true } } },
    });

    const roles = userRoles
      .filter((ur) => ur.role !== null)
      .map((ur) => ({ id: ur.role.id, name: ur.role.name }));

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      mfaEnabled: user.mfaEnabled,
      tenant: {
        organizationId,
        name: organization?.name ?? '',
        logoUrl: organization?.logoUrl ?? null,
      },
      roles,
    };
  }

  private async issueTokens(user: { id: string; organizationId: string; firstName: string; lastName: string; email: string }, ipAddress?: string, userAgent?: string) {
    const accessToken = await this.jwtTokenService.generateAccessToken({
      sub: user.id,
      org: user.organizationId,
      roles: [],
      permissionsHash: '',
    });

    const { token: rawRefreshToken } = await this.refreshTokenService.createRefreshToken(
      user.id,
      user.organizationId,
      ipAddress,
      userAgent,
    );

    const organization = await this.prisma.organization.findFirst({
      where: { id: user.organizationId },
      select: { name: true, logoUrl: true },
    });

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: { select: { id: true, name: true } } },
    });

    const roles = userRoles
      .filter((ur) => ur.role !== null)
      .map((ur) => ({ id: ur.role.id, name: ur.role.name }));

    await this.securityEventService.recordEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      eventType: 'LOGIN_SUCCESS',
      severity: 'low',
      description: 'User logged in successfully',
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      metadata: { userId: user.id, email: user.email },
    });

    return {
      accessToken,
      expiresIn: 900,
      tokenType: 'Bearer',
      sessionId: randomUUID(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mfaEnabled: false,
        tenant: {
          organizationId: user.organizationId,
          name: organization?.name ?? '',
          logoUrl: organization?.logoUrl ?? null,
        },
        roles,
      },
      refreshToken: rawRefreshToken,
    };
  }
}
