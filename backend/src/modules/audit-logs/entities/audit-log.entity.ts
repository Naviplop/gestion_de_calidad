export class AuditLog {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly actorId: string | null,
    public readonly action: string,
    public readonly entityType: string,
    public readonly entityId: string | null,
    public readonly payload: Record<string, unknown>,
    public readonly ipAddress: string | null,
    public readonly userAgent: string | null,
    public readonly correlationId: string,
    public readonly previousHash: string | null,
    public readonly eventHash: string,
    public readonly createdAt: Date,
  ) {}
}
