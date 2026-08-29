import { Controller, Patch, Param, Body, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AntiIdorGuard } from '../../../common/guards/anti-idor.guard';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { RequireResourceOwnership } from '../../../common/guards/anti-idor.guard';
import { RisksService } from '../services/risks.service';
import { UpdateRiskTreatmentDto } from '../dto/risk-treatment.dto';

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

@Controller('risk-treatments')
@UseGuards(AuthGuard, PermissionsGuard, AntiIdorGuard)
export class RiskTreatmentsController {
  constructor(private readonly risksService: RisksService) {}

  @Patch(':id')
  @RequirePermission('risks:updateTreatments')
  @RequireResourceOwnership({ resourceType: 'riskTreatment', resourceIdParam: 'id' })
  async update(@Param('id') id: string, @Body() dto: UpdateRiskTreatmentDto, @Req() req: AuthenticatedRequest) {
    const treatment = await this.risksService.findTreatmentById(req.organizationId, id);
    if (!treatment) {
      throw new NotFoundException('RiskTreatmentNotFound');
    }
    const ctx = getRequestContext(req);
    return this.risksService.updateRiskTreatment(req.organizationId, treatment.riskId, id, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }
}
