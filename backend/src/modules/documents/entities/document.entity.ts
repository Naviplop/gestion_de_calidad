export class Document {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly documentTypeId: string,
    public readonly code: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly processId: string | null,
    public readonly departmentId: string | null,
    public readonly ownerId: string,
    public readonly responsibleId: string,
    public readonly classification: string,
    public readonly confidentiality: string,
    public readonly status: string,
    public readonly currentVersionId: string | null,
    public readonly issueDate: Date | null,
    public readonly reviewDate: Date | null,
    public readonly nextReviewDate: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class DocumentListItem {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly documentTypeId: string,
    public readonly documentType: { id: string; name: string } | null,
    public readonly processId: string | null,
    public readonly departmentId: string | null,
    public readonly ownerId: string,
    public readonly owner: { id: string; firstName: string; lastName: string } | null,
    public readonly responsibleId: string,
    public readonly responsible: { id: string; firstName: string; lastName: string } | null,
    public readonly classification: string,
    public readonly confidentiality: string,
    public readonly status: string,
    public readonly currentVersionId: string | null,
    public readonly currentVersion: {
      id: string;
      versionMajor: number;
      versionMinor: number;
      versionLabel: string;
      status: string;
      createdAt: Date;
    } | null,
    public readonly issueDate: Date | null,
    public readonly reviewDate: Date | null,
    public readonly nextReviewDate: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class DocumentVersion {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly organizationId: string,
    public readonly versionMajor: number,
    public readonly versionMinor: number,
    public readonly versionLabel: string,
    public readonly fileAssetId: string,
    public readonly fileHash: string,
    public readonly changeReason: string,
    public readonly status: string,
    public readonly createdById: string,
    public readonly approvedById: string | null,
    public readonly approvedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date | null,
  ) {}
}

export class DocumentReviewer {
  constructor(
    public readonly id: string,
    public readonly documentVersionId: string,
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly status: string,
    public readonly completedAt: Date | null,
    public readonly comment: string | null,
    public readonly createdAt: Date,
  ) {}
}

export class DocumentApproval {
  constructor(
    public readonly id: string,
    public readonly documentVersionId: string,
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly status: string,
    public readonly comment: string | null,
    public readonly decidedAt: Date | null,
    public readonly createdAt: Date,
  ) {}
}

export class DocumentDistribution {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly documentVersionId: string,
    public readonly organizationId: string,
    public readonly assignedToUserId: string | null,
    public readonly assignedToDepartmentId: string | null,
    public readonly assignedToRoleId: string | null,
    public readonly status: string,
    public readonly createdAt: Date,
  ) {}
}

export class DocumentAcknowledgement {
  constructor(
    public readonly id: string,
    public readonly documentDistributionId: string,
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly ipAddress: string | null,
    public readonly userAgent: string | null,
    public readonly acknowledgedAt: Date,
  ) {}
}
