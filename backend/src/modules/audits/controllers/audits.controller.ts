import { Controller, Get, Post, Body, Patch, Param, Query, Req, ParseUUIDPipe } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { RequireResourceOwnership } from '../../../common/guards/anti-idor.guard';
import { AuditsService } from '../services/audits.service';
import { CreateAuditProgramDto, UpdateAuditProgramDto } from '../dto/create-audit-program.dto';
import { CreateAuditDto, UpdateAuditDto } from '../dto/create-audit.dto';
import { CreateAuditChecklistDto, CreateAuditChecklistItemDto, UpdateAuditChecklistItemDto } from '../dto/audit-checklist.dto';
import { CreateAuditFindingDto, UpdateAuditFindingDto } from '../dto/audit-finding.dto';
import { AuditStatus } from '@prisma/client';

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

@Controller('audits')
export class AuditProgramsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  @RequirePermission('audits:read')
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('responsibleId') responsibleId?: string,
  ) {
    return this.auditsService.listAuditPrograms(
      req.organizationId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      search,
      status,
      responsibleId,
    );
  }

  @Post()
  @RequirePermission('audits:create')
  create(@Body() dto: CreateAuditProgramDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.auditsService.createAuditProgram(req.organizationId, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':id')
  @RequirePermission('audits:read')
  @RequireResourceOwnership({ resourceType: 'auditProgram', resourceIdParam: 'id' })
  get(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.auditsService.getAuditProgram(req.organizationId, id);
  }

  @Patch(':id')
  @RequirePermission('audits:update')
  @RequireResourceOwnership({ resourceType: 'auditProgram', resourceIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateAuditProgramDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.auditsService.updateAuditProgram(req.organizationId, id, req.userId, dto, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }
}

@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  @RequirePermission('audits:read')
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: AuditStatus,
    @Query('auditProgramId') auditProgramId?: string,
    @Query('processId') processId?: string,
    @Query('leadAuditorId') leadAuditorId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.auditsService.listAudits(
      req.organizationId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      search,
      status,
      auditProgramId,
      processId,
      leadAuditorId,
      sortBy,
      sortOrder,
    );
  }

  @Post()
  @RequirePermission('audits:create')
  create(@Body() dto: CreateAuditDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.auditsService.createAudit(req.organizationId, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':id')
  @RequirePermission('audits:read')
  @RequireResourceOwnership({ resourceType: 'audit', resourceIdParam: 'id' })
  get(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.auditsService.getAudit(req.organizationId, id);
  }

  @Patch(':id')
  @RequirePermission('audits:update')
  @RequireResourceOwnership({ resourceType: 'audit', resourceIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateAuditDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.auditsService.updateAudit(req.organizationId, id, req.userId, dto, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/start')
  @RequirePermission('audits:start')
  @RequireResourceOwnership({ resourceType: 'audit', resourceIdParam: 'id' })
  start(@Param('id') id: string, @Body() body: { actualStart: string }, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.auditsService.startAudit(req.organizationId, id, req.userId, new Date(body.actualStart), ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/complete')
  @RequirePermission('audits:complete')
  @RequireResourceOwnership({ resourceType: 'audit', resourceIdParam: 'id' })
  complete(@Param('id') id: string, @Body() body: { actualEnd: string }, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.auditsService.completeAudit(req.organizationId, id, req.userId, new Date(body.actualEnd), ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/cancel')
  @RequirePermission('audits:cancel')
  @RequireResourceOwnership({ resourceType: 'audit', resourceIdParam: 'id' })
  cancel(@Param('id') id: string, @Body() body: { reason?: string }, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.auditsService.cancelAudit(req.organizationId, id, req.userId, body.reason, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }
}

@Controller('audits/:auditId/checklists')
export class AuditChecklistsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  @RequirePermission('audits:read')
  list(@Param('auditId', ParseUUIDPipe) auditId: string, @Req() req: AuthenticatedRequest) {
    return this.auditsService.listChecklists(req.organizationId, auditId);
  }

  @Post()
  @RequirePermission('audits:update')
  create(@Param('auditId', ParseUUIDPipe) auditId: string, @Body() dto: CreateAuditChecklistDto, @Req() req: AuthenticatedRequest) {
    return this.auditsService.createChecklist(req.organizationId, auditId, req.userId, dto);
  }
}

@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get(':id')
  @RequirePermission('audits:read')
  @RequireResourceOwnership({ resourceType: 'auditChecklist', resourceIdParam: 'id' })
  get(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.auditsService.getChecklist(req.organizationId, id);
  }

  @Post(':id/items')
  @RequirePermission('audits:update')
  @RequireResourceOwnership({ resourceType: 'auditChecklist', resourceIdParam: 'id' })
  createItem(@Param('id') id: string, @Body() dto: CreateAuditChecklistItemDto, @Req() req: AuthenticatedRequest) {
    return this.auditsService.createChecklistItem(req.organizationId, id, req.userId, dto);
  }

  @Patch('items/:id')
  @RequirePermission('audits:update')
  @RequireResourceOwnership({ resourceType: 'auditChecklistItem', resourceIdParam: 'id' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateAuditChecklistItemDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.auditsService.updateChecklistItem(req.organizationId, id, req.userId, dto, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }
}

@Controller('audits/:auditId/findings')
export class AuditFindingsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  @RequirePermission('audits:read')
  list(
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('findingType') findingType?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('requirementId') requirementId?: string,
  ) {
    return this.auditsService.listFindings(
      req.organizationId,
      auditId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      findingType,
      severity,
      status,
      requirementId,
    );
  }

  @Post()
  @RequirePermission('audits:createFindings')
  create(@Param('auditId', ParseUUIDPipe) auditId: string, @Body() dto: CreateAuditFindingDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.auditsService.createFinding(req.organizationId, auditId, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }
}

@Controller('findings')
export class FindingsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Patch(':id')
  @RequirePermission('audits:updateFindings')
  @RequireResourceOwnership({ resourceType: 'auditFinding', resourceIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateAuditFindingDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.auditsService.updateFinding(req.organizationId, id, req.userId, dto, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }
}
