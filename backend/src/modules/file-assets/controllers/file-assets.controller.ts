import { Controller, Post, Body, Param, Get, UseGuards, Req, Query, UseInterceptors, UploadedFile as NestUploadedFile } from '@nestjs/common';
import { Request } from 'express';
import { FileAssetService, UploadedFile } from '../services/file-asset.service';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { AntiIdorGuard } from '../../../common/guards/anti-idor.guard';
import { RequireResourceOwnership } from '../../../common/guards/anti-idor.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { LocalFileStorageAdapter } from '../../../common/storage/local-file-storage.adapter';

interface AuthenticatedRequest extends Request {
  organizationId: string;
  userId: string;
}

function getRequestContext(req: AuthenticatedRequest) {
  return {
    ipAddress: (req.ip || req.connection?.remoteAddress || undefined) as string | undefined,
    userAgent: (req.get?.('user-agent') || undefined) as string | undefined,
    correlationId: (req.headers?.['x-correlation-id'] as string | undefined) || undefined,
  };
}

@Controller('file-assets')
@UseGuards(AuthGuard, PermissionsGuard, AntiIdorGuard)
export class FileAssetsController {
  constructor(
    private readonly fileAssetService: FileAssetService,
    private readonly configService: ConfigService,
  ) {}

  @Post('validate')
  @RequirePermission('files:upload')
  validateAndCreate(@Body() body: {
    bucketName: string;
    objectKey: string;
    originalFilename: string;
    mimeType: string;
    fileSizeBytes: number;
    sha256Hash: string;
    metadata?: Record<string, unknown>;
  }, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.fileAssetService.validateAndCreate({
      organizationId: req.organizationId,
      uploadedById: req.userId,
      storageProvider: 'S3',
      bucketName: body.bucketName,
      objectKey: body.objectKey,
      originalFilename: body.originalFilename,
      mimeType: body.mimeType,
      fileSizeBytes: BigInt(body.fileSizeBytes),
      sha256Hash: body.sha256Hash,
      metadata: body.metadata,
    }, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post('upload')
  @RequirePermission('files:upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@NestUploadedFile() file: UploadedFile, @Req() req: AuthenticatedRequest) {
    const storageRoot = this.configService.get<string>('STORAGE_ROOT', './storage');
    const adapter = new LocalFileStorageAdapter(storageRoot);
    const ctx = getRequestContext(req);
    return this.fileAssetService.upload(file, req.organizationId, req.userId, adapter, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Get(':id')
  @RequirePermission('files:read')
  @RequireResourceOwnership({ resourceType: 'fileAsset', resourceIdParam: 'id' })
  findById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.fileAssetService.findById(id, req.organizationId);
  }

  @Get(':id/download')
  @RequirePermission('files:download')
  @RequireResourceOwnership({ resourceType: 'fileAsset', resourceIdParam: 'id' })
  async download(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const storageRoot = this.configService.get<string>('STORAGE_ROOT', './storage');
    const adapter = new LocalFileStorageAdapter(storageRoot);

    return this.fileAssetService.download(id, req.organizationId, adapter);
  }

  @Get(':id/verify')
  @RequirePermission('files:read')
  @RequireResourceOwnership({ resourceType: 'fileAsset', resourceIdParam: 'id' })
  verifyIntegrity(@Param('id') id: string, @Query('hash') hash: string) {
    return this.fileAssetService.verifyIntegrity(id, hash);
  }
}
