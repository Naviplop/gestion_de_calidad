export class SecurityEvent {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly actorId: string | null,
    public readonly eventType: string,
    public readonly severity: 'low' | 'medium' | 'high' | 'critical',
    public readonly description: string,
    public readonly metadata: Record<string, unknown>,
    public readonly ipAddress: string | null,
    public readonly userAgent: string | null,
    public readonly correlationId: string,
    public readonly previousHash: string | null,
    public readonly eventHash: string,
    public readonly createdAt: Date,
  ) {}
}
