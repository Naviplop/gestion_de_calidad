import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TenantIsolationOptions {
  organizationIdField?: string;
  organizationIdSource?: 'body' | 'params' | 'query';
}

@Injectable()
export class TenantIsolationInterceptor implements NestInterceptor {
  constructor(private readonly options: TenantIsolationOptions = {}) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((response: unknown) => {
        const request = context.switchToHttp().getRequest<{ organizationContext?: { organizationId: string } }>();
        const currentOrganizationId = request.organizationContext?.organizationId;

        if (!currentOrganizationId || !response) {
          return response;
        }

        if (Array.isArray(response)) {
          const filtered = response.filter((item: unknown) => {
            if (!item || typeof item !== 'object') return false;
            const itemOrgId = this.extractOrganizationId(item as Record<string, unknown>);
            return Boolean(itemOrgId && itemOrgId === currentOrganizationId);
          });
          return filtered;
        }

        if (typeof response === 'object' && response !== null) {
          const itemOrgId = this.extractOrganizationId(response as Record<string, unknown>);
          if (itemOrgId && itemOrgId !== currentOrganizationId) {
            throw new ForbiddenException('Forbidden');
          }
        }

        return response;
      }),
    );
  }

  private extractOrganizationId(item: Record<string, unknown>): string | null {
    const field = this.options.organizationIdField || 'organizationId';
    
    if (field in item) {
      return item[field] as string;
    }

    return null;
  }
}
