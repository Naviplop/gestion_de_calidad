export class Standard {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly version: string | null,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class StandardListItem {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly version: string | null,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class StandardRequirement {
  constructor(
    public readonly id: string,
    public readonly standardId: string,
    public readonly code: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly clause: string | null,
    public readonly parentRequirementId: string | null,
    public readonly createdAt: Date,
  ) {}
}

export class StandardRequirementListItem {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly clause: string | null,
    public readonly parentRequirementId: string | null,
    public readonly createdAt: Date,
  ) {}
}
