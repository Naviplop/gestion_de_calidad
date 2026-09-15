import { Controller, Get, Param, Query, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { Request } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { AntiIdorGuard } from '../../../common/guards/anti-idor.guard';
import { AuditLogListQuery } from '../dto/audit-log-list-query.dto';

interface AuthenticatedRequest extends Request {
  organizationId: string;
  userId: string;
}

@Controller('audit-logs')
@UseGuards(PermissionsGuard, AntiIdorGuard)
export class AuditLogsController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermission('audit-logs:read')
  list(@Req() req: AuthenticatedRequest, @Query() query: AuditLogListQuery) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 25;
    const safePageSize = Math.min(Math.max(pageSize, 1), 100);

    return this.auditLogService.listLogs(req.organizationId, {
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      actorId: query.actorId,
      correlationId: query.correlationId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page,
      pageSize: safePageSize,
    });
  }

  @Get('correlation/:correlationId')
  @RequirePermission('audit-logs:read')
  findByCorrelationId(@Req() req: AuthenticatedRequest, @Param('correlationId', ParseUUIDPipe) correlationId: string) {
    return this.auditLogService.findByCorrelationId(req.organizationId, correlationId);
  }
}
