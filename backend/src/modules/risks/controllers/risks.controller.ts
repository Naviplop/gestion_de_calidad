import { Controller, Get, Post, Body, Patch, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { RequireResourceOwnership } from '../../../common/guards/anti-idor.guard';
import { RisksService } from '../services/risks.service';
import { CreateRiskDto, UpdateRiskDto } from '../dto/create-risk.dto';
import { CreateRiskAssessmentDto } from '../dto/risk-assessment.dto';
import { CreateRiskControlDto } from '../dto/risk-control.dto';
import { CreateRiskTreatmentDto } from '../dto/risk-treatment.dto';
import { RiskStatus } from '@prisma/client';

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

@Controller('risks')
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Get()
  @RequirePermission('risks:read')
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: RiskStatus,
    @Query('riskType') riskType?: string,
    @Query('processId') processId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.risksService.listRisks(
      req.organizationId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      search,
      status,
      riskType,
      processId,
      ownerId,
      sortBy,
      sortOrder,
    );
  }

  @Post()
  @RequirePermission('risks:create')
  create(@Body() dto: CreateRiskDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.risksService.createRisk(req.organizationId, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':id')
  @RequirePermission('risks:read')
  @RequireResourceOwnership({ resourceType: 'risk', resourceIdParam: 'id' })
  get(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.risksService.getRisk(req.organizationId, id);
  }

  @Patch(':id')
  @RequirePermission('risks:update')
  @RequireResourceOwnership({ resourceType: 'risk', resourceIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateRiskDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.risksService.updateRisk(req.organizationId, id, req.userId, dto, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':riskId/assessments')
  @RequirePermission('risks:read')
  listAssessments(
    @Param('riskId') riskId: string,
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.risksService.listRiskAssessments(
      req.organizationId,
      riskId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
    );
  }

  @Post(':riskId/assessments')
  @RequirePermission('risks:assess')
  createAssessment(@Param('riskId') riskId: string, @Body() dto: CreateRiskAssessmentDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.risksService.createRiskAssessment(req.organizationId, riskId, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':riskId/controls')
  @RequirePermission('risks:read')
  listControls(
    @Param('riskId') riskId: string,
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.risksService.listRiskControls(
      req.organizationId,
      riskId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
    );
  }

  @Post(':riskId/controls')
  @RequirePermission('risks:create')
  createControl(@Param('riskId') riskId: string, @Body() dto: CreateRiskControlDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.risksService.createRiskControl(req.organizationId, riskId, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':riskId/treatments')
  @RequirePermission('risks:read')
  listTreatments(
    @Param('riskId') riskId: string,
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.risksService.listRiskTreatments(
      req.organizationId,
      riskId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
    );
  }

  @Post(':riskId/treatments')
  @RequirePermission('risks:createTreatments')
  createTreatment(@Param('riskId') riskId: string, @Body() dto: CreateRiskTreatmentDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.risksService.createRiskTreatment(req.organizationId, riskId, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }
}
