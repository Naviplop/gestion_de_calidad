export class UserRole {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly roleId: string,
    public readonly assignedBy: string,
    public readonly assignedAt: Date,
    public readonly expiresAt: Date | null,
  ) {}

  get isExpired(): boolean {
    if (this.expiresAt === null) return false;
    return this.expiresAt <= new Date();
  }
}
