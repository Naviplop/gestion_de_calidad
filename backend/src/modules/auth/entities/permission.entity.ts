export class Permission {
  constructor(
    public readonly id: string,
    public readonly resource: string,
    public readonly action: string,
    public readonly description: string | null,
    public readonly createdAt: Date,
  ) {}

  get fullKey(): string {
    return `${this.resource}:${this.action}`;
  }
}
