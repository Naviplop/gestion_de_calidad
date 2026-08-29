export class Risk {
  constructor(
    public id: string,
    public organizationId: string,
    public processId: string | null,
    public code: string,
    public title: string,
    public description: string,
    public riskType: string,
    public ownerId: string | null,
    public status: string,
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}

export class RiskListItem {
  constructor(
    public id: string,
    public processId: string | null,
    public code: string,
    public title: string,
    public description: string,
    public riskType: string,
    public ownerId: string | null,
    public owner: { id: string; firstName: string; lastName: string } | null,
    public status: string,
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}
