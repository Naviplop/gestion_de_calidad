export class Nonconformity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly auditId: string | null,
    public readonly findingId: string | null,
    public readonly processId: string | null,
    public readonly code: string,
    public readonly title: string,
    public readonly description: string,
    public readonly severity: string,
    public readonly detectedAt: Date,
    public readonly responsibleId: string | null,
    public readonly status: string,
    public readonly closedAt: Date | null,
    public readonly closedById: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class NonconformityListItem {
  constructor(
    public readonly id: string,
    public readonly auditId: string | null,
    public readonly findingId: string | null,
    public readonly processId: string | null,
    public readonly code: string,
    public readonly title: string,
    public readonly description: string,
    public readonly severity: string,
    public readonly detectedAt: Date,
    public readonly responsibleId: string | null,
    public readonly responsible: { id: string; firstName: string; lastName: string } | null,
    public readonly status: string,
    public readonly closedAt: Date | null,
    public readonly closedBy: { id: string; firstName: string; lastName: string } | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class RootCauseAnalysis {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly nonconformityId: string,
    public readonly methodology: string,
    public readonly analysisData: Record<string, unknown>,
    public readonly conclusion: string | null,
    public readonly createdById: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class CorrectiveAction {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly nonconformityId: string,
    public readonly code: string,
    public readonly description: string,
    public readonly responsibleId: string,
    public readonly dueDate: Date | null,
    public readonly completedAt: Date | null,
    public readonly status: string,
    public readonly effectivenessRequired: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class CorrectiveActionListItem {
  constructor(
    public readonly id: string,
    public readonly nonconformityId: string,
    public readonly code: string,
    public readonly description: string,
    public readonly responsibleId: string,
    public readonly responsible: { id: string; firstName: string; lastName: string } | null,
    public readonly dueDate: Date | null,
    public readonly completedAt: Date | null,
    public readonly status: string,
    public readonly effectivenessRequired: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class CorrectiveActionVerification {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly correctiveActionId: string,
    public readonly verifierId: string,
    public readonly effectivenessStatus: string,
    public readonly evidence: string | null,
    public readonly comments: string | null,
    public readonly verifiedAt: Date,
  ) {}
}
