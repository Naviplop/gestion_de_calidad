export class OrganizationMembershipEntity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly userEmail: string,
    public readonly userName: string,
    public readonly status: string,
    public readonly roles: string[],
    public readonly joinedAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
