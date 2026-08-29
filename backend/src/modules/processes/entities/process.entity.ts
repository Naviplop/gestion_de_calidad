export class Process {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly areaId: string | null,
    public readonly parentProcessId: string | null,
    public readonly code: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly ownerId: string | null,
    public readonly processType: string | null,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class ProcessListItem {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly areaId: string | null,
    public readonly areaName: string | null,
    public readonly parentProcessId: string | null,
    public readonly parentProcessName: string | null,
    public readonly ownerId: string | null,
    public readonly ownerName: string | null,
    public readonly processType: string | null,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
