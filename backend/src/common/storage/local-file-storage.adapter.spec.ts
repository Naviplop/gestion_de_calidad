import { LocalFileStorageAdapter } from './local-file-storage.adapter';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('LocalFileStorageAdapter', () => {
  let adapter: LocalFileStorageAdapter;
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
    adapter = new LocalFileStorageAdapter(tempRoot);
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  describe('getStorageKey', () => {
    it('should generate a normalized relative path', () => {
      const key = adapter.getStorageKey({
        organizationId: 'org-1',
        documentId: 'doc-1',
        documentVersionId: 'ver-1',
        fileAssetId: 'asset-1',
        filename: 'manual.pdf',
      });

      expect(key).toBe('organizations/org-1/documents/doc-1/versions/ver-1/asset-1/manual.pdf');
    });

    it('should sanitize special characters in filename', () => {
      const key = adapter.getStorageKey({
        organizationId: 'org-1',
        documentId: 'doc-1',
        documentVersionId: 'ver-1',
        fileAssetId: 'asset-1',
        filename: 'my file (1).pdf',
      });

      expect(key).toBe('organizations/org-1/documents/doc-1/versions/ver-1/asset-1/my_file__1_.pdf');
    });

    it('should neutralize directory traversal sequences in filename via basename', () => {
      const key = adapter.getStorageKey({
        organizationId: 'org-1',
        documentId: 'doc-1',
        documentVersionId: 'ver-1',
        fileAssetId: 'asset-1',
        filename: '../../../etc/passwd',
      });

      expect(key).toBe('organizations/org-1/documents/doc-1/versions/ver-1/asset-1/passwd');
    });

    it('should normalize Windows-style traversal in filename', () => {
      const key = adapter.getStorageKey({
        organizationId: 'org-1',
        documentId: 'doc-1',
        documentVersionId: 'ver-1',
        fileAssetId: 'asset-1',
        filename: '..\\..\\..\\..\\Windows\\System32\\cmd.exe',
      });

      expect(key).toBe('organizations/org-1/documents/doc-1/versions/ver-1/asset-1/cmd.exe');
    });
  });

  describe('save and read', () => {
    it('should save and read a file', async () => {
      const pathData = {
        organizationId: 'org-1',
        documentId: 'doc-1',
        documentVersionId: 'ver-1',
        fileAssetId: 'asset-1',
        filename: 'test.pdf',
      };

      const buffer = Buffer.from('Hello, World!');
      await adapter.save(pathData, [buffer]);

      const stream = await adapter.read(pathData);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(Buffer.concat(chunks).toString()).toBe('Hello, World!');
    });

    it('should throw NotFoundException when reading non-existent file', async () => {
      const pathData = {
        organizationId: 'org-1',
        documentId: 'doc-1',
        documentVersionId: 'ver-1',
        fileAssetId: 'asset-1',
        filename: 'missing.pdf',
      };

      await expect(adapter.read(pathData)).rejects.toThrow('FileNotFound');
    });
  });

  describe('delete', () => {
    it('should delete an existing file', async () => {
      const pathData = {
        organizationId: 'org-1',
        documentId: 'doc-1',
        documentVersionId: 'ver-1',
        fileAssetId: 'asset-1',
        filename: 'test.pdf',
      };

      await adapter.save(pathData, [Buffer.from('data')]);
      await adapter.delete(pathData);

      const exists = await adapter.exists(pathData);
      expect(exists).toBe(false);
    });

    it('should not throw when deleting non-existent file', async () => {
      const pathData = {
        organizationId: 'org-1',
        documentId: 'doc-1',
        documentVersionId: 'ver-1',
        fileAssetId: 'asset-1',
        filename: 'missing.pdf',
      };

      await expect(adapter.delete(pathData)).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const pathData = {
        organizationId: 'org-1',
        documentId: 'doc-1',
        documentVersionId: 'ver-1',
        fileAssetId: 'asset-1',
        filename: 'test.pdf',
      };

      await adapter.save(pathData, [Buffer.from('data')]);
      expect(await adapter.exists(pathData)).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const pathData = {
        organizationId: 'org-1',
        documentId: 'doc-1',
        documentVersionId: 'ver-1',
        fileAssetId: 'asset-1',
        filename: 'missing.pdf',
      };

      expect(await adapter.exists(pathData)).toBe(false);
    });
  });

  describe('path traversal protection', () => {
    it('should neutralize absolute path injection via basename sanitization', async () => {
      const pathData = {
        organizationId: 'org-1',
        documentId: 'doc-1',
        documentVersionId: 'ver-1',
        fileAssetId: 'asset-1',
        filename: '/etc/passwd',
      };

      await expect(adapter.save(pathData, [Buffer.from('data')])).resolves.not.toThrow();
      const key = adapter.getStorageKey(pathData);
      expect(key).not.toContain('..');
      expect(key).not.toContain('/etc/');
    });
  });
});
