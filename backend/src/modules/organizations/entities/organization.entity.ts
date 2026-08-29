export class Organization {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly taxId: string | null,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly address: string | null,
    public readonly timezone: string,
    public readonly locale: string,
    public readonly logoUrl: string | null,
    public readonly primaryColor: string | null,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  get isAvailableForOperations(): boolean {
    return this.isActive;
  }
}

export class OrganizationMembership {
  constructor(
    public readonly userId: string,
    public readonly organizationId: string,
    public readonly userStatus: UserMembershipStatus,
    public readonly isActive: boolean,
  ) {}

  get canAuthenticate(): boolean {
    return this.isActive && this.userStatus === UserMembershipStatus.ACTIVE;
  }

  get isLocked(): boolean {
    return this.userStatus === UserMembershipStatus.LOCKED;
  }

  get isSuspended(): boolean {
    return this.userStatus === UserMembershipStatus.SUSPENDED;
  }
}

export enum UserMembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  LOCKED = 'LOCKED',
}
