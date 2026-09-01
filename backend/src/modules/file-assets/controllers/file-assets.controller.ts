import { Controller, Post, Body, Param, Get, UseGuards, Req, Query, UseInterceptors, UploadedFile as NestUploadedFile } from '@nestjs/common';
import { Request } from 'express';
import { FileAssetService, UploadedFile } from '../services/file-asset.service';
import { RequirePermission } from '../../auth/decorators/auth.decorators';
import { RequireResourceOwnership } from '../../../common/guards/anti-idor.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { LocalFileStorageAdapter } from '../../../common/storage/local-file-storage.adapter';
import { MAX_FILE_SIZE_BYTES } from '../../../common/constants/file-constants';
import { ValidateFileAssetDto } from '../dto/validate-file-asset.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

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
@UseGuards(ThrottlerGuard)
export class FileAssetsController {
  constructor(
    private readonly fileAssetService: FileAssetService,
    private readonly configService: ConfigService,
  ) {}

  @Post('validate')
  @RequirePermission('files:upload')
  validateAndCreate(@Body() dto: ValidateFileAssetDto, @Req() req: AuthenticatedRequest) {
    const ctx = getRequestContext(req);
    return this.fileAssetService.validateAndCreate({
      organizationId: req.organizationId,
      uploadedById: req.userId,
      storageProvider: 'S3',
      bucketName: dto.bucketName,
      objectKey: dto.objectKey,
      originalFilename: dto.originalFilename,
      mimeType: dto.mimeType,
      fileSizeBytes: BigInt(0),
      sha256Hash: dto.sha256Hash,
      metadata: dto.metadata,
    }, ctx.ipAddress, ctx.userAgent, ctx.correlationId);
  }

  @Post('upload')
  @RequirePermission('files:upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
    },
  }))
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
  verifyIntegrity(@Param('id') id: string, @Query('hash') hash: string, @Req() req: AuthenticatedRequest) {
    return this.fileAssetService.verifyIntegrity(id, hash, req.organizationId);
  }
}
