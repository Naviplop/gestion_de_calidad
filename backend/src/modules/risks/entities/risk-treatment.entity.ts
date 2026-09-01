export class RiskTreatment {
  constructor(
    public id: string,
    public organizationId: string,
    public riskId: string,
    public strategy: string,
    public description: string,
    public responsibleId: string | null,
    public dueDate: Date | null,
    public status: string,
    public completedAt: Date | null,
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}
