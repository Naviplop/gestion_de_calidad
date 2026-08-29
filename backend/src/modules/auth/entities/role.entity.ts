export class Role {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly isSystem: boolean,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
