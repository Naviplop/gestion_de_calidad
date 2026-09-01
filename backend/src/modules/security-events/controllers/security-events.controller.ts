import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { SecurityEventService } from '../services/security-event.service';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { AntiIdorGuard } from '../../../common/guards/anti-idor.guard';
import { SecurityEventListQuery } from '../dto/security-event-list-query.dto';

interface AuthenticatedRequest extends Request {
  organizationId: string;
  userId: string;
}

@Controller('security-events')
@UseGuards(PermissionsGuard, AntiIdorGuard)
export class SecurityEventsController {
  constructor(private readonly securityEventService: SecurityEventService) {}

  @Get()
  @RequirePermission('security-events:read')
  list(@Req() req: AuthenticatedRequest, @Query() query: SecurityEventListQuery) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 25;
    const safePageSize = Math.min(Math.max(pageSize, 1), 100);

    return this.securityEventService.listEvents(req.organizationId, {
      eventType: query.eventType,
      severity: query.severity,
      actorId: query.actorId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page,
      pageSize: safePageSize,
    });
  }
}
