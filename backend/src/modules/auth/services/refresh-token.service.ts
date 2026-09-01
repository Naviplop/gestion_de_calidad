import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { JwtTokenService } from './jwt-token.service';

interface RefreshTokenInfo {
  tokenHash: string;
  userId: string;
  organizationId: string;
  expiresAt: Date;
  rawToken: string;
}

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly TOKEN_LENGTH = 64;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async createRefreshToken(userId: string, organizationId: string, ipAddress?: string, userAgent?: string): Promise<{ token: string; expiresAt: Date }> {
    const rawToken = this.generateSecureToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        organizationId,
        tokenHash,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    this.logger.log('Refresh token created', {
      userId,
      organizationId,
      expiresAt: expiresAt.toISOString(),
    });

    return { token: rawToken, expiresAt };
  }

  async validateAndRotateRefreshToken(rawToken: string): Promise<RefreshTokenInfo | null> {
    const tokenHash = this.hashToken(rawToken);

    const existingToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (!existingToken) {
      this.logger.warn('Invalid refresh token attempt', { tokenHash });
      return null;
    }

    if (existingToken.revokedAt) {
      await this.handleReuseDetection(existingToken);
      return null;
    }

    if (existingToken.expiresAt < new Date()) {
      this.logger.warn('Expired refresh token attempt', { tokenHash });
      return null;
    }

    return {
      tokenHash: existingToken.tokenHash,
      userId: existingToken.userId,
      organizationId: existingToken.organizationId,
      expiresAt: existingToken.expiresAt,
      rawToken,
    };
  }

  async validateRefreshToken(rawToken: string): Promise<RefreshTokenInfo | null> {
    const tokenHash = this.hashToken(rawToken);

    const existingToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!existingToken) {
      this.logger.warn('Invalid refresh token attempt', { tokenHash });
      return null;
    }

    return {
      tokenHash: existingToken.tokenHash,
      userId: existingToken.userId,
      organizationId: existingToken.organizationId,
      expiresAt: existingToken.expiresAt,
      rawToken,
    };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);

    const existingToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (!existingToken) {
      return;
    }

    await this.prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revokedAt: new Date() },
    });

    this.logger.log('Refresh token revoked', {
      userId: existingToken.userId,
      tokenId: existingToken.id,
    });
  }

  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log('All refresh tokens revoked for user', { userId });
  }

  private async handleReuseDetection(existingToken: { id: string; userId: string }): Promise<void> {
    this.logger.error('Refresh token reuse detected', {
      tokenId: existingToken.id,
      userId: existingToken.userId,
    });

    await this.revokeAllRefreshTokensForUser(existingToken.userId);

    throw new ConflictException('REFRESH_TOKEN_REUSE');
  }

  private generateSecureToken(): string {
    return randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

