import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(organizationId: string, email: string): Promise<User | null> {
    const where: Record<string, unknown> = {
      email: { equals: email.toLowerCase() },
      deletedAt: null,
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const user = await this.prisma.user.findFirst({ where });

    if (!user) return null;

    return this.mapToEntity(user);
  }

  async findById(id: string, organizationId: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!user) return null;

    return this.mapToEntity(user);
  }

  async incrementFailedLoginAttempts(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
    });
  }

  async lock(id: string, until: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        isLocked: true,
        lockedUntil: until,
        failedLoginAttempts: 5,
      },
    });
  }

  async resetFailedLoginAttempts(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
      },
    });
  }

  async updateLastLogin(id: string, ip: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });
  }

  private mapToEntity(user: {
    id: string;
    organizationId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    departmentId: string | null;
    mfaEnabled: boolean;
    mfaSecret: string | null;
    mfaBackupCodes: unknown;
    lastLoginAt: Date | null;
    lastLoginIp: string | null;
    isActive: boolean;
    isLocked: boolean;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): User {
    return new User(
      user.id,
      user.organizationId,
      user.email,
      user.passwordHash,
      user.firstName,
      user.lastName,
      user.departmentId,
      user.mfaEnabled,
      user.mfaSecret,
      user.mfaBackupCodes,
      user.lastLoginAt,
      user.lastLoginIp,
      user.isActive,
      user.isLocked,
      user.failedLoginAttempts,
      user.lockedUntil,
      user.createdAt,
      user.updatedAt,
      user.deletedAt,
    );
  }
}
