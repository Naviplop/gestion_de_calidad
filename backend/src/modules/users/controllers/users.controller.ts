import { Controller, Get, Post, Body, Patch, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { RequireResourceOwnership } from '../../../common/guards/anti-idor.guard';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AssignRolesDto } from '../dto/assign-roles.dto';

interface AuthenticatedRequest extends Request {
  organizationId: string;
  userId: string;
}

function getRequestContext(req: AuthenticatedRequest) {
  return {
    ipAddress: (req.ip || req.connection.remoteAddress || undefined) as string | undefined,
    userAgent: (req.get('user-agent') || undefined) as string | undefined,
    correlationId: (req.headers['x-correlation-id'] as string | undefined) || undefined,
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('users:read')
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.listUsers(
      req.organizationId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      search,
      roleId,
      departmentId,
      isActive !== undefined ? isActive === 'true' : undefined,
    );
  }

  @Post()
  @RequirePermission('users:create')
  create(@Body() dto: CreateUserDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.usersService.createUser(req.organizationId, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':id')
  @RequirePermission('users:read')
  @RequireResourceOwnership({ resourceType: 'user', resourceIdParam: 'id' })
  get(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.usersService.getUser(req.organizationId, id);
  }

  @Patch(':id')
  @RequirePermission('users:update')
  @RequireResourceOwnership({ resourceType: 'user', resourceIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.usersService.updateUser(req.organizationId, id, req.userId, dto, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/activate')
  @RequirePermission('users:activate')
  @RequireResourceOwnership({ resourceType: 'user', resourceIdParam: 'id' })
  activate(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.usersService.activateUser(req.organizationId, id, req.userId, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/deactivate')
  @RequirePermission('users:deactivate')
  @RequireResourceOwnership({ resourceType: 'user', resourceIdParam: 'id' })
  deactivate(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.usersService.deactivateUser(req.organizationId, id, req.userId, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/roles')
  @RequirePermission('users:assignRoles')
  @RequireResourceOwnership({ resourceType: 'user', resourceIdParam: 'id' })
  assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.usersService.assignRoles(req.organizationId, id, dto, req.userId, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':id/permissions')
  @RequirePermission('users:read')
  @RequireResourceOwnership({ resourceType: 'user', resourceIdParam: 'id' })
  permissions(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.usersService.getUserPermissions(req.organizationId, id);
  }
}
