import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AntiIdorGuard } from '../../../common/guards/anti-idor.guard';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { RequireResourceOwnership } from '../../../common/guards/anti-idor.guard';
import { DocumentsService } from '../services/documents.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { CreateDocumentVersionDto } from '../dto/create-document-version.dto';
import { ReviewStatus } from '@prisma/client';

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

@Controller('documents')
@UseGuards(AuthGuard, PermissionsGuard, AntiIdorGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @RequirePermission('documents:read')
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('documentTypeId') documentTypeId?: string,
    @Query('processId') processId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('classification') classification?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.documentsService.listDocuments(
      req.organizationId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      search,
      status,
      documentTypeId,
      processId,
      departmentId,
      ownerId,
      classification,
      sortBy,
      sortOrder,
    );
  }

  @Post()
  @RequirePermission('documents:create')
  create(@Body() dto: CreateDocumentDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.documentsService.createDocument(req.organizationId, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':id')
  @RequirePermission('documents:read')
  @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
  get(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.documentsService.getDocument(req.organizationId, id);
  }

  @Patch(':id')
  @RequirePermission('documents:update')
  @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.documentsService.updateDocument(req.organizationId, id, req.userId, dto, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

   @Post(':id/submit')
   @RequirePermission('documents:submit')
   @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
   submit(@Param('id') id: string, @Body() body: { changeReason?: string }, @Req() req: AuthenticatedRequest) {
     const ctx = getRequestContext(req);
     const ifMatch = req.headers['if-match'] as string | undefined;
     return this.documentsService.submitDocument(req.organizationId, id, req.userId, body.changeReason, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
   }

   @Post(':id/submit-for-approval')
   @RequirePermission('documents:approve')
   @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
   submitForApproval(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
     const ctx = getRequestContext(req);
     const ifMatch = req.headers['if-match'] as string | undefined;
     return this.documentsService.submitForApprovalDocument(req.organizationId, id, req.userId, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
   }

  @Post(':id/approve')
  @RequirePermission('documents:approve')
  @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
  approve(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.documentsService.approveDocument(req.organizationId, id, req.userId, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/reject')
  @RequirePermission('documents:approve')
  @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
  reject(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.documentsService.rejectDocument(req.organizationId, id, req.userId, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/publish')
  @RequirePermission('documents:publish')
  @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
  publish(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.documentsService.publishDocument(req.organizationId, id, req.userId, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/obsolete')
  @RequirePermission('documents:obsolete')
  @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
  obsolete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.documentsService.obsoleteDocument(req.organizationId, id, req.userId, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/cancel')
  @RequirePermission('documents:cancel')
  @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
  cancel(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    const ifMatch = req.headers['if-match'] as string | undefined;
    return this.documentsService.cancelDocument(req.organizationId, id, req.userId, ifMatch, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post(':id/versions')
  @RequirePermission('documents:createVersion')
  @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
  createVersion(@Param('id') id: string, @Body() dto: CreateDocumentVersionDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.documentsService.createDocumentVersion(req.organizationId, id, req.userId, dto, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':id/versions')
  @RequirePermission('documents:read')
  @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
  listVersions(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.documentsService.getDocumentVersions(req.organizationId, id, parseInt(page || '1', 10), parseInt(pageSize || '25', 10));
  }

  @Post('versions/:versionId/submit-for-review')
  @RequirePermission('documents:submit')
  @RequireResourceOwnership({ resourceType: 'documentVersion', resourceIdParam: 'versionId' })
  submitForReview(@Param('versionId') versionId: string, @Req() req: AuthenticatedRequest) {
    return this.documentsService.submitVersionForReview(req.organizationId, versionId);
  }

  @Post('versions/:versionId/approve')
  @RequirePermission('documents:approve')
  @RequireResourceOwnership({ resourceType: 'documentVersion', resourceIdParam: 'versionId' })
  approveVersion(@Param('versionId') versionId: string, @Req() req: AuthenticatedRequest) {
    return this.documentsService.approveVersion(req.organizationId, versionId, req.userId);
  }

  @Post('versions/:versionId/reject')
  @RequirePermission('documents:approve')
  @RequireResourceOwnership({ resourceType: 'documentVersion', resourceIdParam: 'versionId' })
  rejectVersion(@Param('versionId') versionId: string, @Req() req: AuthenticatedRequest) {
    return this.documentsService.rejectVersion(req.organizationId, versionId);
  }

  @Post('versions/:versionId/publish')
  @RequirePermission('documents:publish')
  @RequireResourceOwnership({ resourceType: 'documentVersion', resourceIdParam: 'versionId' })
  publishVersion(@Param('versionId') versionId: string, @Req() req: AuthenticatedRequest) {
    return this.documentsService.publishVersion(req.organizationId, versionId, '');
  }

  @Get('versions/:versionId')
  @RequirePermission('documents:read')
  @RequireResourceOwnership({ resourceType: 'documentVersion', resourceIdParam: 'versionId' })
  getVersion(@Param('versionId') versionId: string, @Req() req: AuthenticatedRequest) {
    return this.documentsService.getDocumentVersion(req.organizationId, versionId);
  }

  @Post('versions/:versionId/review')
  @RequirePermission('documents:review')
  @RequireResourceOwnership({ resourceType: 'documentVersion', resourceIdParam: 'versionId' })
  reviewVersion(@Param('versionId') versionId: string, @Body() body: { status: string; comment?: string }, @Req() req: AuthenticatedRequest) {
    return this.documentsService.reviewVersion(req.organizationId, versionId, req.userId, body.status as ReviewStatus, body.comment);
  }

  @Post(':id/distribute')
  @RequirePermission('documents:distribute')
  @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
  distribute(@Param('id') id: string, @Body() body: { documentVersionId: string; assignedToUserIds?: string[]; assignedToDepartmentIds?: string[]; assignedToRoleIds?: string[]; message?: string }, @Req() req: AuthenticatedRequest) {
    return this.documentsService.distributeDocument(req.organizationId, id, body);
  }

  @Get(':id/distributions')
  @RequirePermission('documents:read')
  @RequireResourceOwnership({ resourceType: 'document', resourceIdParam: 'id' })
  listDistributions(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.documentsService.getDocumentDistributions(req.organizationId, id);
  }

  @Post('distributions/:distributionId/acknowledge')
  @RequirePermission('documents:acknowledge')
  @RequireResourceOwnership({ resourceType: 'documentDistribution', resourceIdParam: 'distributionId' })
  acknowledge(@Param('distributionId') distributionId: string, @Body() body: { ipAddress?: string; userAgent?: string }, @Req() req: AuthenticatedRequest) {
    return this.documentsService.acknowledgeDistribution(req.organizationId, distributionId, req.userId, body.ipAddress, body.userAgent);
  }
}
