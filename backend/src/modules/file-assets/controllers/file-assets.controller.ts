import { Controller, Post, Body, Param, Get, UseGuards, Req, Query, UseInterceptors, Res, UploadedFile as NestUploadedFile } from '@nestjs/common';
import { Request, Response } from 'express';
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
  async download(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const storageRoot = this.configService.get<string>('STORAGE_ROOT', './storage');
    const adapter = new LocalFileStorageAdapter(storageRoot);

    const { stream, metadata } = await this.fileAssetService.download(id, req.organizationId, adapter);
    if (res.headersSent) return;
    res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(metadata.originalFilename)}"`);
    res.setHeader('Content-Length', metadata.sizeBytes.toString());
    res.setHeader('Cache-Control', 'private, no-store');

    try {
      for await (const chunk of stream) {
        if (!res.write(Buffer.from(chunk))) {
          await new Promise<void>((resolve) => res.once('drain', resolve));
        }
      }
      res.end();
    } catch {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy();
      }
    }
  }

  @Get(':id/preview')
  @RequirePermission('files:read')
  @RequireResourceOwnership({ resourceType: 'fileAsset', resourceIdParam: 'id' })
  async preview(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const storageRoot = this.configService.get<string>('STORAGE_ROOT', './storage');
    const adapter = new LocalFileStorageAdapter(storageRoot);

    const { stream, metadata } = await this.fileAssetService.download(id, req.organizationId, adapter);
    if (res.headersSent) return;
    res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(metadata.originalFilename)}"`);
    res.setHeader('Content-Length', metadata.sizeBytes.toString());
    res.setHeader('Cache-Control', 'private, max-age=300');

    try {
      for await (const chunk of stream) {
        if (!res.write(Buffer.from(chunk))) {
          await new Promise<void>((resolve) => res.once('drain', resolve));
        }
      }
      res.end();
    } catch {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy();
      }
    }
  }

  @Get(':id/verify')
  @RequirePermission('files:read')
  @RequireResourceOwnership({ resourceType: 'fileAsset', resourceIdParam: 'id' })
  verifyIntegrity(@Param('id') id: string, @Query('hash') hash: string, @Req() req: AuthenticatedRequest) {
    return this.fileAssetService.verifyIntegrity(id, hash, req.organizationId);
  }
}
