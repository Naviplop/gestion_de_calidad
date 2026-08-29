export class RiskControl {
  constructor(
    public id: string,
    public organizationId: string,
    public riskId: string,
    public userId: string,
    public description: string,
    public controlType: string,
    public effectiveness: string | null,
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}
