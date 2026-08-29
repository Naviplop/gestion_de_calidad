import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { StandardsService } from '../services/standards.service';

interface AuthenticatedRequest extends Request {
  organizationId: string;
  userId: string;
}

@Controller('standards')
@UseGuards(AuthGuard, PermissionsGuard)
export class StandardsController {
  constructor(private readonly standardsService: StandardsService) {}

  @Get()
  @RequirePermission('standards:read')
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.standardsService.listStandards(
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      search,
    );
  }

  @Get(':id')
  @RequirePermission('standards:read')
  get(@Param('id') id: string) {
    return this.standardsService.getStandard(id);
  }

  @Get(':id/requirements')
  @RequirePermission('standards:read')
  getRequirements(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('parentId') parentId?: string,
    @Query('search') search?: string,
  ) {
    return this.standardsService.getStandardRequirements(
      id,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      parentId,
      search,
    );
  }
}
