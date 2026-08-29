import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { DashboardService } from '../services/dashboard.service';

interface AuthenticatedRequest extends Request {
  organizationId: string;
  userId: string;
}

@Controller('dashboard')
@UseGuards(AuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermission('documents:read')
  getSummary(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getSummary(req.organizationId);
  }
}
