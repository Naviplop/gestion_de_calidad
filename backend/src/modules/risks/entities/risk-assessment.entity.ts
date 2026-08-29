export class RiskAssessment {
  constructor(
    public id: string,
    public organizationId: string,
    public riskId: string,
    public probability: string,
    public impact: string,
    public score: string | null,
    public calculationData: Record<string, unknown>,
    public assessedById: string,
    public assessedAt: Date,
  ) {}
}
