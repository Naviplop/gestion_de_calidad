import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { StorageProvider, Prisma } from '@prisma/client';
import { LocalFileStorageAdapter } from '../../../common/storage/local-file-storage.adapter';
import { StoragePath } from '../../../common/storage/file-storage.service';
import { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '../../../common/constants/file-constants';
import { calculateChecksum } from '../../../common/utils/checksum.util';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';

export interface FileAssetMetadata {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: bigint;
  sha256Hash: string;
  storageProvider: StorageProvider;
  objectKey: string;
  createdAt: Date;
}

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class FileAssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  private async recordAuditEvent(params: {
    organizationId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
    correlationId?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.recordEvent({
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        payload: params.payload,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        correlationId: params.correlationId,
      });
    } catch {
      // Audit logging failure must not break business operations
    }
  }

  async validateAndCreate(data: {
    organizationId: string;
    uploadedById: string;
    storageProvider: StorageProvider;
    bucketName: string;
    objectKey: string;
    originalFilename: string;
    mimeType: string;
    fileSizeBytes: bigint;
    sha256Hash: string;
    metadata?: Record<string, unknown>;
  }, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<{ id: string; sha256Hash: string }> {
    const existing = await this.prisma.fileAsset.findFirst({
      where: { sha256Hash: data.sha256Hash },
      select: { id: true },
    });

    if (existing) {
      return { id: existing.id, sha256Hash: data.sha256Hash };
    }

    const fileAsset = await this.prisma.fileAsset.create({
      data: {
        organizationId: data.organizationId,
        uploadedById: data.uploadedById,
        storageProvider: data.storageProvider,
        bucketName: data.bucketName,
        objectKey: data.objectKey,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        fileSizeBytes: data.fileSizeBytes,
        sha256Hash: data.sha256Hash,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        sha256Hash: true,
      },
    });

    await this.recordAuditEvent({
      organizationId: data.organizationId,
      actorId: data.uploadedById,
      action: 'FILE_ASSET_CREATED',
      entityType: 'FileAsset',
      entityId: fileAsset.id,
      payload: { originalFilename: data.originalFilename, mimeType: data.mimeType, sizeBytes: data.fileSizeBytes.toString() },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return { id: fileAsset.id, sha256Hash: fileAsset.sha256Hash };
  }

  async upload(
    file: UploadedFile,
    organizationId: string,
    uploadedById: string,
    adapter: LocalFileStorageAdapter,
    ipAddress?: string | null,
    userAgent?: string | null,
    correlationId?: string,
  ): Promise<FileAssetMetadata> {
    if (!file || !file.buffer) {
      throw new BadRequestException('InvalidFile');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('FileTooLarge');
    }

    const extension = this.getExtension(file.originalname);
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException('InvalidFileExtension');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('InvalidMimeType');
    }

    const checksum = calculateChecksum(file.buffer);

    const existing = await this.prisma.fileAsset.findFirst({
      where: { sha256Hash: checksum },
      select: { id: true },
    });

    if (existing) {
      const existingAsset = await this.prisma.fileAsset.findFirst({
        where: { id: existing.id },
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          fileSizeBytes: true,
          sha256Hash: true,
          storageProvider: true,
          objectKey: true,
          createdAt: true,
        },
      });

      if (!existingAsset) {
        throw new NotFoundException('FileAssetNotFound');
      }

      return {
        id: existingAsset.id,
        originalFilename: existingAsset.originalFilename,
        mimeType: existingAsset.mimeType,
        sizeBytes: existingAsset.fileSizeBytes,
        sha256Hash: existingAsset.sha256Hash,
        storageProvider: existingAsset.storageProvider,
        objectKey: existingAsset.objectKey,
        createdAt: existingAsset.createdAt,
      };
    }

    const fileAssetId = this.generateUuid();
    const documentId = 'pending';
    const documentVersionId = 'pending';

    const storagePath: StoragePath = {
      organizationId,
      documentId,
      documentVersionId,
      fileAssetId,
      filename: file.originalname,
    };

    const storageKey = adapter.getStorageKey(storagePath);

    try {
      await adapter.save(storagePath, this.bufferToAsyncIterable(file.buffer));
    } catch {
      throw new InternalServerErrorException('FileStorageFailed');
    }

    try {
      const fileAsset = await this.prisma.fileAsset.create({
        data: {
          organizationId,
          uploadedById,
          storageProvider: 'LOCAL',
          bucketName: '',
          objectKey: storageKey,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          fileSizeBytes: BigInt(file.size),
          sha256Hash: checksum,
        },
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          fileSizeBytes: true,
          sha256Hash: true,
          storageProvider: true,
          objectKey: true,
          createdAt: true,
        },
      });

      await this.recordAuditEvent({
        organizationId,
        actorId: uploadedById,
        action: 'FILE_ASSET_CREATED',
        entityType: 'FileAsset',
        entityId: fileAsset.id,
        payload: { originalFilename: fileAsset.originalFilename, mimeType: fileAsset.mimeType, sizeBytes: fileAsset.fileSizeBytes.toString() },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        correlationId,
      });

      return {
        id: fileAsset.id,
        originalFilename: fileAsset.originalFilename,
        mimeType: fileAsset.mimeType,
        sizeBytes: fileAsset.fileSizeBytes,
        sha256Hash: fileAsset.sha256Hash,
        storageProvider: fileAsset.storageProvider,
        objectKey: fileAsset.objectKey,
        createdAt: fileAsset.createdAt,
      };
    } catch {
      try {
        await adapter.delete(storagePath);
      } catch {
        // cleanup best-effort
      }
      throw new InternalServerErrorException('FileAssetCreationFailed');
    }
  }

  async findById(id: string, organizationId: string): Promise<FileAssetMetadata | null> {
    const fileAsset = await this.prisma.fileAsset.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        originalFilename: true,
        mimeType: true,
        fileSizeBytes: true,
        sha256Hash: true,
        storageProvider: true,
        objectKey: true,
        createdAt: true,
      },
    });

    if (!fileAsset) {
      return null;
    }

    return {
      id: fileAsset.id,
      originalFilename: fileAsset.originalFilename,
      mimeType: fileAsset.mimeType,
      sizeBytes: fileAsset.fileSizeBytes,
      sha256Hash: fileAsset.sha256Hash,
      storageProvider: fileAsset.storageProvider,
      objectKey: fileAsset.objectKey,
      createdAt: fileAsset.createdAt,
    };
  }

  async download(id: string, organizationId: string, adapter: LocalFileStorageAdapter): Promise<{ stream: AsyncIterable<Buffer>; metadata: FileAssetMetadata }> {
    const fileAsset = await this.prisma.fileAsset.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        originalFilename: true,
        mimeType: true,
        fileSizeBytes: true,
        sha256Hash: true,
        storageProvider: true,
        objectKey: true,
        createdAt: true,
      },
    });

    if (!fileAsset) {
      throw new NotFoundException('FileAssetNotFound');
    }

    if (fileAsset.storageProvider !== 'LOCAL') {
      throw new BadRequestException('UnsupportedStorageProvider');
    }

    const storagePath: StoragePath = {
      organizationId,
      documentId: 'unknown',
      documentVersionId: 'unknown',
      fileAssetId: fileAsset.id,
      filename: fileAsset.originalFilename,
    };

    const stream = await adapter.read(storagePath);

    const metadata: FileAssetMetadata = {
      id: fileAsset.id,
      originalFilename: fileAsset.originalFilename,
      mimeType: fileAsset.mimeType,
      sizeBytes: fileAsset.fileSizeBytes,
      sha256Hash: fileAsset.sha256Hash,
      storageProvider: fileAsset.storageProvider,
      objectKey: fileAsset.objectKey,
      createdAt: fileAsset.createdAt,
    };

    return { stream, metadata };
  }

  async verifyIntegrity(id: string, expectedHash: string): Promise<boolean> {
    const fileAsset = await this.prisma.fileAsset.findFirst({
      where: { id },
      select: { sha256Hash: true },
    });

    if (!fileAsset) {
      throw new NotFoundException('FileAssetNotFound');
    }

    return fileAsset.sha256Hash === expectedHash;
  }

  async delete(id: string, organizationId: string, adapter: LocalFileStorageAdapter, actorId: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<void> {
    const fileAsset = await this.prisma.fileAsset.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        storageProvider: true,
        objectKey: true,
        originalFilename: true,
      },
    });

    if (!fileAsset) {
      throw new NotFoundException('FileAssetNotFound');
    }

    const version = await this.prisma.documentVersion.findFirst({
      where: { fileAssetId: id },
      select: { id: true, status: true },
    });

    if (version && ['PUBLISHED', 'CURRENT', 'APPROVED'].includes(version.status)) {
      throw new BadRequestException('CannotDeleteFileAssetInPublishedVersion');
    }

    if (fileAsset.storageProvider === 'LOCAL' && fileAsset.objectKey) {
      const storagePath: StoragePath = {
        organizationId,
        documentId: 'unknown',
        documentVersionId: 'unknown',
        fileAssetId: fileAsset.id,
        filename: fileAsset.originalFilename,
      };

      try {
        await adapter.delete(storagePath);
      } catch {
        // cleanup best-effort
      }
    }

    await this.prisma.fileAsset.delete({ where: { id } });

    await this.recordAuditEvent({
      organizationId,
      actorId,
      action: 'FILE_ASSET_DELETED',
      entityType: 'FileAsset',
      entityId: id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });
  }

  private getExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? `.${ext}` : '';
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private bufferToAsyncIterable(buffer: Buffer): AsyncIterable<Buffer> {
    return {
      async *[Symbol.asyncIterator]() {
        yield buffer;
      },
    };
  }
}
