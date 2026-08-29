import { Controller, Get, Post, Delete, Body, UseGuards, Request, Param } from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { TenantContextGuard } from '../../../common/guards/tenant-context.guard';
import { AntiIdorGuard } from '../../../common/guards/anti-idor.guard';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { RequireResourceOwnership } from '../../../common/guards/anti-idor.guard';
import { OrganizationMembershipService } from '../services/organization-membership.service';
import { AddMemberDto } from '../dto/add-member.dto';

interface AuthenticatedRequest {
  organizationId: string;
  userId: string;
}

@Controller('organization/members')
@UseGuards(AuthGuard, TenantContextGuard, AntiIdorGuard)
export class OrganizationMembershipController {
  constructor(private readonly membershipService: OrganizationMembershipService) {}

  @Get()
  @RequirePermission('organization:read')
  list(@Request() req: AuthenticatedRequest) {
    return this.membershipService.listMembers(req.organizationId);
  }

  @Post(':userId')
  @RequirePermission('users:manage')
  @RequireResourceOwnership({ resourceType: 'user', resourceIdParam: 'userId' })
  add(
    @Param('userId') userId: string,
    @Body() dto: AddMemberDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.membershipService.addMember(req.organizationId, userId, dto.roleIds, req.userId);
  }

  @Delete(':userId')
  @RequirePermission('users:manage')
  @RequireResourceOwnership({ resourceType: 'user', resourceIdParam: 'userId' })
  remove(@Param('userId') userId: string, @Request() req: AuthenticatedRequest) {
    return this.membershipService.removeMember(req.organizationId, userId, req.userId);
  }
}
