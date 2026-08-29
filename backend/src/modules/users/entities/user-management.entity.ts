export class UserListItem {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly departmentId: string | null,
    public readonly departmentName: string | null,
    public readonly isActive: boolean,
    public readonly mfaEnabled: boolean,
    public readonly lastLoginAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class UserDetail extends UserListItem {
  constructor(
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    departmentId: string | null,
    departmentName: string | null,
    isActive: boolean,
    mfaEnabled: boolean,
    lastLoginAt: Date | null,
    createdAt: Date,
    updatedAt: Date,
    public readonly roles: Array<{ id: string; name: string; permissions: Array<{ resource: string; action: string }> }>,
  ) {
    super(id, email, firstName, lastName, departmentId, departmentName, isActive, mfaEnabled, lastLoginAt, createdAt, updatedAt);
  }
}

export class UserPermissions {
  constructor(public readonly permissions: Array<{ resource: string; action: string; description?: string }>) {}
}
