import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface OrganizationContext {
  organizationId: string;
  userId: string;
  membership: OrganizationMembership;
}

export class OrganizationMembership {
  constructor(
    public readonly userId: string,
    public readonly organizationId: string,
    public readonly userStatus: string,
    public readonly isActive: boolean,
  ) {}

  get canAuthenticate(): boolean {
    return this.isActive && this.userStatus === 'ACTIVE';
  }
}

export const CurrentOrganization = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OrganizationContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.organizationContext;
  },
);

export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.organizationContext?.userId;
  },
);

export const CurrentMembership = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OrganizationMembership => {
    const request = ctx.switchToHttp().getRequest();
    return request.organizationContext?.membership;
  },
);
