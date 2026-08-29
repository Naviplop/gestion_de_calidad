export class AuditProgram {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly responsibleId: string | null,
    public readonly status: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class AuditProgramListItem {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly responsibleId: string | null,
    public readonly responsible: { id: string; firstName: string; lastName: string } | null,
    public readonly status: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class Audit {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly auditProgramId: string | null,
    public readonly processId: string | null,
    public readonly leadAuditorId: string | null,
    public readonly code: string,
    public readonly title: string,
    public readonly auditType: string | null,
    public readonly plannedStart: Date | null,
    public readonly plannedEnd: Date | null,
    public readonly actualStart: Date | null,
    public readonly actualEnd: Date | null,
    public readonly status: string,
    public readonly scope: string | null,
    public readonly objective: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class AuditListItem {
  constructor(
    public readonly id: string,
    public readonly auditProgramId: string | null,
    public readonly processId: string | null,
    public readonly leadAuditorId: string | null,
    public readonly code: string,
    public readonly title: string,
    public readonly auditType: string | null,
    public readonly plannedStart: Date | null,
    public readonly plannedEnd: Date | null,
    public readonly actualStart: Date | null,
    public readonly actualEnd: Date | null,
    public readonly status: string,
    public readonly scope: string | null,
    public readonly objective: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class AuditChecklist {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly auditId: string,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date | null,
  ) {}
}

export class AuditChecklistItem {
  constructor(
    public readonly id: string,
    public readonly checklistId: string,
    public readonly requirementId: string | null,
    public readonly question: string,
    public readonly response: string | null,
    public readonly evidence: string | null,
    public readonly comments: string | null,
    public readonly sortOrder: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date | null,
  ) {}
}

export class AuditFinding {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly auditId: string,
    public readonly checklistItemId: string | null,
    public readonly requirementId: string | null,
    public readonly findingType: string,
    public readonly title: string,
    public readonly description: string,
    public readonly evidence: string | null,
    public readonly severity: string | null,
    public readonly identifiedById: string,
    public readonly identifiedAt: Date,
    public readonly status: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date | null,
  ) {}
}

export class AuditFindingListItem {
  constructor(
    public readonly id: string,
    public readonly auditId: string,
    public readonly checklistItemId: string | null,
    public readonly requirementId: string | null,
    public readonly findingType: string,
    public readonly title: string,
    public readonly description: string,
    public readonly evidence: string | null,
    public readonly severity: string | null,
    public readonly identifiedById: string,
    public readonly identifiedBy: { id: string; firstName: string; lastName: string } | null,
    public readonly identifiedAt: Date,
    public readonly status: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date | null,
  ) {}
}
