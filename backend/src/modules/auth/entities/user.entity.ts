export class User {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly departmentId: string | null,
    public readonly mfaEnabled: boolean,
    public readonly mfaSecret: string | null,
    public readonly mfaBackupCodes: unknown,
    public readonly lastLoginAt: Date | null,
    public readonly lastLoginIp: string | null,
    public readonly isActive: boolean,
    public readonly isLocked: boolean,
    public readonly failedLoginAttempts: number,
    public readonly lockedUntil: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt: Date | null,
  ) {}

  get isAccountLocked(): boolean {
    if (!this.isLocked) return false;
    if (this.lockedUntil === null) return true;
    return this.lockedUntil > new Date();
  }

  get isAvailableForLogin(): boolean {
    if (this.deletedAt !== null) return false;
    if (!this.isActive) return false;
    if (this.isAccountLocked) return false;
    return true;
  }
}

export interface JwtPayload {
  sub: string;
  org: string;
  roles: string[];
  permissionsHash: string;
}
