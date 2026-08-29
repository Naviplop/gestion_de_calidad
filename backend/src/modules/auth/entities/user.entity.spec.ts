import { User } from '../entities/user.entity';

describe('User entity', () => {
  const baseUser = {
    id: 'user-1',
    organizationId: 'org-1',
    email: 'user@example.com',
    passwordHash: 'hash',
    firstName: 'John',
    lastName: 'Doe',
    departmentId: null,
    mfaEnabled: false,
    mfaSecret: null,
    mfaBackupCodes: null,
    lastLoginAt: null,
    lastLoginIp: null,
    isActive: true,
    isLocked: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  it('should be available for login when active and not locked', () => {
    const user = new User(baseUser.id, baseUser.organizationId, baseUser.email, baseUser.passwordHash, baseUser.firstName, baseUser.lastName, baseUser.departmentId, baseUser.mfaEnabled, baseUser.mfaSecret, baseUser.mfaBackupCodes, baseUser.lastLoginAt, baseUser.lastLoginIp, baseUser.isActive, baseUser.isLocked, baseUser.failedLoginAttempts, baseUser.lockedUntil, baseUser.createdAt, baseUser.updatedAt, baseUser.deletedAt);
    expect(user.isAvailableForLogin).toBe(true);
  });

  it('should not be available when locked', () => {
    const user = new User(baseUser.id, baseUser.organizationId, baseUser.email, baseUser.passwordHash, baseUser.firstName, baseUser.lastName, baseUser.departmentId, baseUser.mfaEnabled, baseUser.mfaSecret, baseUser.mfaBackupCodes, baseUser.lastLoginAt, baseUser.lastLoginIp, baseUser.isActive, true, baseUser.failedLoginAttempts, new Date(Date.now() + 3600000), baseUser.createdAt, baseUser.updatedAt, baseUser.deletedAt);
    expect(user.isAvailableForLogin).toBe(false);
  });

  it('should not be available when inactive', () => {
    const user = new User(baseUser.id, baseUser.organizationId, baseUser.email, baseUser.passwordHash, baseUser.firstName, baseUser.lastName, baseUser.departmentId, baseUser.mfaEnabled, baseUser.mfaSecret, baseUser.mfaBackupCodes, baseUser.lastLoginAt, baseUser.lastLoginIp, false, baseUser.isLocked, baseUser.failedLoginAttempts, baseUser.lockedUntil, baseUser.createdAt, baseUser.updatedAt, baseUser.deletedAt);
    expect(user.isAvailableForLogin).toBe(false);
  });

  it('should not be available when deleted', () => {
    const user = new User(baseUser.id, baseUser.organizationId, baseUser.email, baseUser.passwordHash, baseUser.firstName, baseUser.lastName, baseUser.departmentId, baseUser.mfaEnabled, baseUser.mfaSecret, baseUser.mfaBackupCodes, baseUser.lastLoginAt, baseUser.lastLoginIp, baseUser.isActive, baseUser.isLocked, baseUser.failedLoginAttempts, baseUser.lockedUntil, baseUser.createdAt, baseUser.updatedAt, new Date());
    expect(user.isAvailableForLogin).toBe(false);
  });
});
