import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { TenantContextGuard } from '../../../common/guards/tenant-context.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { AntiIdorGuard } from '../../../common/guards/anti-idor.guard';
import { OrganizationsService } from '../services/organizations.service';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

interface AuthenticatedRequest extends Request {
  organizationId: string;
  userId: string;
  ip?: string | undefined;
  connection?: { remoteAddress?: string | undefined } | undefined;
  get(name: string): string | undefined;
  headers: Headers & Record<string, string | string[] | undefined>;
  organizationContext?: {
    organizationId: string;
    userId: string;
    membership: {
      userId: string;
      organizationId: string;
      userStatus: string;
      isActive: boolean;
    };
  };
}

function getRequestContext(req: AuthenticatedRequest) {
  return {
    ipAddress: (req.ip || req.connection?.remoteAddress || undefined) as string | undefined,
    userAgent: (req.get('user-agent') || undefined) as string | undefined,
    correlationId: (req.headers['x-correlation-id'] as string | undefined) || undefined,
  };
}

@Controller('organization')
@UseGuards(AuthGuard, TenantContextGuard, PermissionsGuard, AntiIdorGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @RequirePermission('organization:read')
  get(@Request() req: AuthenticatedRequest) {
    return this.organizationsService.getOrganization(req.organizationId);
  }

  @Patch()
  @RequirePermission('organization:update')
  update(@Body() dto: UpdateOrganizationDto, @Request() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.organizationsService.updateOrganization(req.organizationId, dto, req.userId, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get('settings')
  @RequirePermission('organization:read')
  listSettings(@Request() req: AuthenticatedRequest) {
    return this.organizationsService.listSettings(req.organizationId);
  }

  @Patch('settings')
  @RequirePermission('organization:updateSettings')
  updateSettings(@Body() data: Record<string, unknown>, @Request() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.organizationsService.updateSettings(req.organizationId, data, req.userId, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }
}
