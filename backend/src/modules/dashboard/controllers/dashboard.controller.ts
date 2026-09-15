import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { DashboardService } from '../services/dashboard.service';

interface AuthenticatedRequest extends Request {
  organizationId: string;
  userId: string;
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermission('dashboard:read')
  getSummary(@Req() req: AuthenticatedRequest) {
    return this.dashboardService.getSummary(req.organizationId);
  }
}
