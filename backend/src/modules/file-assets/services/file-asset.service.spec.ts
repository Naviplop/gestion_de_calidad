import { Test, TestingModule } from '@nestjs/testing';
import { FileAssetService } from '../services/file-asset.service';
import { PrismaService } from '../../../database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LocalFileStorageAdapter } from '../../../common/storage/local-file-storage.adapter';
import { calculateChecksum } from '../../../common/utils/checksum.util';
import { MAX_FILE_SIZE_BYTES } from '../../../common/constants/file-constants';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';

describe('FileAssetService', () => {
  let service: FileAssetService;

  const mockPrisma = {
    fileAsset: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    documentVersion: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileAssetService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: { recordEvent: jest.fn() } },
        { provide: SecurityEventService, useValue: { recordEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get<FileAssetService>(FileAssetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('upload', () => {
    it('should reject file too large', async () => {
      const file = {
        buffer: Buffer.alloc(MAX_FILE_SIZE_BYTES + 1),
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: MAX_FILE_SIZE_BYTES + 1,
      };

      const adapter = new LocalFileStorageAdapter('/tmp/nonexistent-storage');

      await expect(service.upload(file, 'org-1', 'user-1', adapter)).rejects.toThrow(BadRequestException);
      await expect(service.upload(file, 'org-1', 'user-1', adapter)).rejects.toThrow('FileTooLarge');
    });

    it('should reject invalid MIME type with valid extension', async () => {
      const file = {
        buffer: Buffer.alloc(100),
        originalname: 'doc.pdf',
        mimetype: 'text/html',
        size: 100,
      };

      const adapter = new LocalFileStorageAdapter('/tmp/nonexistent-storage');

      await expect(service.upload(file, 'org-1', 'user-1', adapter)).rejects.toThrow(BadRequestException);
      await expect(service.upload(file, 'org-1', 'user-1', adapter)).rejects.toThrow('InvalidMimeType');
    });

    it('should reject invalid extension', async () => {
      const file = {
        buffer: Buffer.alloc(100),
        originalname: 'script.js',
        mimetype: 'application/javascript',
        size: 100,
      };

      const adapter = new LocalFileStorageAdapter('/tmp/nonexistent-storage');

      await expect(service.upload(file, 'org-1', 'user-1', adapter)).rejects.toThrow(BadRequestException);
      await expect(service.upload(file, 'org-1', 'user-1', adapter)).rejects.toThrow('InvalidFileExtension');
    });

    it('should return existing asset for duplicate checksum', async () => {
      const buffer = Buffer.from('duplicate content');
      const checksum = calculateChecksum(buffer);

      mockPrisma.fileAsset.findFirst
        .mockResolvedValueOnce({ id: 'existing-id', sha256Hash: checksum })
        .mockResolvedValueOnce({
          id: 'existing-id',
          originalFilename: 'old.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: BigInt(100),
          sha256Hash: checksum,
          storageProvider: 'LOCAL',
          objectKey: 'organizations/org-1/documents/doc-1/versions/ver-1/asset-1/old.pdf',
          createdAt: new Date(),
        });

      const file = {
        buffer,
        originalname: 'new.pdf',
        mimetype: 'application/pdf',
        size: buffer.length,
      };

      const adapter = new LocalFileStorageAdapter('/tmp/nonexistent-storage');

      const result = await service.upload(file, 'org-1', 'user-1', adapter);
      expect(result.id).toBe('existing-id');
    });

    it('should create new asset for unique file', async () => {
      const buffer = Buffer.from('unique content');
      const checksum = calculateChecksum(buffer);

      mockPrisma.fileAsset.findFirst.mockResolvedValueOnce(null);
      mockPrisma.fileAsset.create.mockResolvedValueOnce({
        id: 'new-id',
        originalFilename: 'new.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: BigInt(buffer.length),
        sha256Hash: checksum,
        storageProvider: 'LOCAL',
        objectKey: 'organizations/org-1/documents/doc-1/versions/ver-1/new-id/new.pdf',
        createdAt: new Date(),
      });

      const file = {
        buffer,
        originalname: 'new.pdf',
        mimetype: 'application/pdf',
        size: buffer.length,
      };

      const adapter = new LocalFileStorageAdapter('/tmp/nonexistent-storage');

      const result = await service.upload(file, 'org-1', 'user-1', adapter);
      expect(result.id).toBe('new-id');
      expect(result.sha256Hash).toBe(checksum);
    });
  });

  describe('findById', () => {
    it('should return metadata for existing asset', async () => {
      mockPrisma.fileAsset.findFirst.mockResolvedValue({
        id: 'asset-1',
        originalFilename: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: BigInt(1024),
        sha256Hash: 'abc123',
        storageProvider: 'LOCAL',
        objectKey: 'organizations/org-1/documents/doc-1/versions/ver-1/asset-1/doc.pdf',
        createdAt: new Date(),
      });

      const result = await service.findById('asset-1', 'org-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('asset-1');
      expect(result?.originalFilename).toBe('doc.pdf');
    });

    it('should return null for non-existing asset', async () => {
      mockPrisma.fileAsset.findFirst.mockResolvedValue(null);

      const result = await service.findById('missing', 'org-1');
      expect(result).toBeNull();
    });
  });

  describe('download', () => {
    it('should throw NotFoundException for missing asset', async () => {
      mockPrisma.fileAsset.findFirst.mockResolvedValue(null);

      const adapter = new LocalFileStorageAdapter('/tmp/nonexistent-storage');
      await expect(service.download('missing', 'org-1', adapter)).rejects.toThrow(NotFoundException);
    });

    it('should throw for unsupported storage provider', async () => {
      mockPrisma.fileAsset.findFirst.mockResolvedValue({
        id: 'asset-1',
        originalFilename: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: BigInt(1024),
        sha256Hash: 'abc123',
        storageProvider: 'S3',
        objectKey: 'bucket/key',
        createdAt: new Date(),
      });

      const adapter = new LocalFileStorageAdapter('/tmp/nonexistent-storage');
      await expect(service.download('asset-1', 'org-1', adapter)).rejects.toThrow(BadRequestException);
      await expect(service.download('asset-1', 'org-1', adapter)).rejects.toThrow('UnsupportedStorageProvider');
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException for missing asset', async () => {
      mockPrisma.fileAsset.findFirst.mockResolvedValue(null);

      const adapter = new LocalFileStorageAdapter('/tmp/nonexistent-storage');
      await expect(service.delete('missing', 'org-1', adapter)).rejects.toThrow(NotFoundException);
    });

    it('should prevent delete for published version', async () => {
      mockPrisma.fileAsset.findFirst.mockResolvedValue({
        id: 'asset-1',
        storageProvider: 'LOCAL',
        objectKey: 'organizations/org-1/documents/doc-1/versions/ver-1/asset-1/doc.pdf',
        originalFilename: 'doc.pdf',
      });
      mockPrisma.documentVersion.findFirst.mockResolvedValue({
        id: 'ver-1',
        status: 'PUBLISHED',
      });

      const adapter = new LocalFileStorageAdapter('/tmp/nonexistent-storage');
      await expect(service.delete('asset-1', 'org-1', adapter)).rejects.toThrow(BadRequestException);
      await expect(service.delete('asset-1', 'org-1', adapter)).rejects.toThrow('CannotDeleteFileAssetInPublishedVersion');
    });
  });

  describe('verifyIntegrity', () => {
    it('should return true for matching hash', async () => {
      mockPrisma.fileAsset.findFirst.mockResolvedValue({ sha256Hash: 'abc123' });

      const result = await service.verifyIntegrity('asset-1', 'abc123');
      expect(result).toBe(true);
    });

    it('should return false for non-matching hash', async () => {
      mockPrisma.fileAsset.findFirst.mockResolvedValue({ sha256Hash: 'abc123' });

      const result = await service.verifyIntegrity('asset-1', 'xyz789');
      expect(result).toBe(false);
    });
  });
});
