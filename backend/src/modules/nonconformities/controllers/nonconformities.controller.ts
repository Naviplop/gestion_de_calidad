import { Controller, Get, Post, Body, Patch, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { RequireResourceOwnership } from '../../../common/guards/anti-idor.guard';
import { NonconformitiesService } from '../services/nonconformities.service';
import { CreateNonconformityDto, UpdateNonconformityDto } from '../dto/create-nonconformity.dto';
import { CreateRootCauseAnalysisDto, UpdateRootCauseAnalysisDto } from '../dto/create-root-cause.dto';
import { CreateCorrectiveActionDto, UpdateCorrectiveActionDto } from '../dto/create-corrective-action.dto';
import { CreateVerificationDto } from '../dto/create-verification.dto';
import { NonconformityStatus, CorrectiveActionStatus } from '@prisma/client';

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

@Controller('nonconformities')
export class NonconformitiesController {
  constructor(private readonly nonconformitiesService: NonconformitiesService) {}

  @Get()
  @RequirePermission('nonconformities:read')
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: NonconformityStatus,
    @Query('severity') severity?: string,
    @Query('auditId') auditId?: string,
    @Query('findingId') findingId?: string,
    @Query('processId') processId?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.nonconformitiesService.listNonconformities(
      req.organizationId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      search,
      status,
      severity,
      auditId,
      findingId,
      processId,
      responsibleId,
      sortBy,
      sortOrder,
    );
  }

  @Post()
  @RequirePermission('nonconformities:create')
  create(@Body() dto: CreateNonconformityDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.nonconformitiesService.createNonconformity(req.organizationId, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':id')
  @RequirePermission('nonconformities:read')
  @RequireResourceOwnership({ resourceType: 'nonconformity', resourceIdParam: 'id' })
  get(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.nonconformitiesService.getNonconformity(req.organizationId, id);
  }

  @Patch(':id')
  @RequirePermission('nonconformities:update')
  @RequireResourceOwnership({ resourceType: 'nonconformity', resourceIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateNonconformityDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.nonconformitiesService.updateNonconformity(req.organizationId, id, req.userId, dto, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/close')
  @RequirePermission('nonconformities:close')
  @RequireResourceOwnership({ resourceType: 'nonconformity', resourceIdParam: 'id' })
  close(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.nonconformitiesService.closeNonconformity(req.organizationId, id, req.userId, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':nonconformityId/root-cause')
  @RequirePermission('nonconformities:read')
  getRootCause(@Param('nonconformityId') nonconformityId: string, @Req() req: AuthenticatedRequest) {
    return this.nonconformitiesService.getRootCauseAnalysis(req.organizationId, nonconformityId);
  }

  @Post(':nonconformityId/root-cause')
  @RequirePermission('nonconformities:update')
  createRootCause(@Param('nonconformityId') nonconformityId: string, @Body() dto: CreateRootCauseAnalysisDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.nonconformitiesService.createRootCauseAnalysis(req.organizationId, nonconformityId, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Patch('root-cause/:id')
  @RequirePermission('nonconformities:update')
  @RequireResourceOwnership({ resourceType: 'rootCauseAnalysis', resourceIdParam: 'id' })
  updateRootCause(@Param('id') id: string, @Body() dto: UpdateRootCauseAnalysisDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.nonconformitiesService.updateRootCauseAnalysis(req.organizationId, id, req.userId, dto, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':nonconformityId/corrective-actions')
  @RequirePermission('nonconformities:read')
  listCorrectiveActions(
    @Param('nonconformityId') nonconformityId: string,
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: CorrectiveActionStatus,
    @Query('responsibleId') responsibleId?: string,
  ) {
    return this.nonconformitiesService.listCorrectiveActions(
      req.organizationId,
      nonconformityId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      status,
      responsibleId,
    );
  }

  @Post(':nonconformityId/corrective-actions')
  @RequirePermission('nonconformities:createActions')
  createCorrectiveAction(@Param('nonconformityId') nonconformityId: string, @Body() dto: CreateCorrectiveActionDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.nonconformitiesService.createCorrectiveAction(req.organizationId, nonconformityId, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }
}

@Controller('corrective-actions')
export class CorrectiveActionsController {
  constructor(private readonly nonconformitiesService: NonconformitiesService) {}

  @Get(':id')
  @RequirePermission('nonconformities:read')
  @RequireResourceOwnership({ resourceType: 'correctiveAction', resourceIdParam: 'id' })
  get(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.nonconformitiesService.getCorrectiveAction(req.organizationId, id);
  }

  @Patch(':id')
  @RequirePermission('nonconformities:updateActions')
  @RequireResourceOwnership({ resourceType: 'correctiveAction', resourceIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateCorrectiveActionDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.nonconformitiesService.updateCorrectiveAction(req.organizationId, id, req.userId, dto, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/complete')
  @RequirePermission('nonconformities:updateActions')
  @RequireResourceOwnership({ resourceType: 'correctiveAction', resourceIdParam: 'id' })
  complete(@Param('id') id: string, @Body() body: { completedAt: string }, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.nonconformitiesService.completeCorrectiveAction(req.organizationId, id, req.userId, new Date(body.completedAt), ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/verify')
  @RequirePermission('nonconformities:verifyActions')
  @RequireResourceOwnership({ resourceType: 'correctiveAction', resourceIdParam: 'id' })
  verify(@Param('id') id: string, @Body() dto: CreateVerificationDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.nonconformitiesService.verifyCorrectiveAction(req.organizationId, id, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }
}
