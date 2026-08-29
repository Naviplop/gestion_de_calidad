import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { FileStorageAdapter, StoragePath } from './file-storage.service';

@Injectable()
export class LocalFileStorageAdapter implements FileStorageAdapter {
  constructor(private readonly storageRoot: string) {}

  getStorageKey(pathData: StoragePath): string {
    const sanitizedFilename = this.sanitizeFilename(pathData.filename);
    const relativePath = path
      .join(
        'organizations',
        pathData.organizationId,
        'documents',
        pathData.documentId,
        'versions',
        pathData.documentVersionId,
        pathData.fileAssetId,
        sanitizedFilename,
      )
      .replace(/\\/g, '/');

    return relativePath;
  }

  async save(pathData: StoragePath, stream: AsyncIterable<Buffer>): Promise<string> {
    const absolutePath = this.resolveAbsolutePath(pathData);
    const directory = path.dirname(absolutePath);

    await fs.mkdir(directory, { recursive: true });

    const readable = new Readable({
      async read() {
        for await (const chunk of stream) {
          this.push(chunk);
        }
        this.push(null);
      },
    });

    const { createWriteStream } = await import('fs');
    const fileStream = createWriteStream(absolutePath);

    try {
      await pipeline(readable, fileStream);
    } finally {
      readable.destroy();
    }

    return absolutePath;
  }

  async read(pathData: StoragePath): Promise<AsyncIterable<Buffer>> {
    const absolutePath = this.resolveAbsolutePath(pathData);

    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException('FileNotFound');
    }

    const CHUNK_SIZE = 64 * 1024;
    let offset = 0;
    const totalSize = (await fs.stat(absolutePath)).size;
    const fileHandle = await fs.open(absolutePath, 'r');

    return {
      async *[Symbol.asyncIterator]() {
        while (offset < totalSize) {
          const buffer = Buffer.alloc(Math.min(CHUNK_SIZE, totalSize - offset));
          const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, offset);
          if (bytesRead === 0) break;
          yield buffer.slice(0, bytesRead);
          offset += bytesRead;
        }

        await fileHandle.close();
      },
    };
  }

  async delete(pathData: StoragePath): Promise<void> {
    const absolutePath = this.resolveAbsolutePath(pathData);

    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async exists(pathData: StoragePath): Promise<boolean> {
    const absolutePath = this.resolveAbsolutePath(pathData);

    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  private resolveAbsolutePath(pathData: StoragePath): string {
    const storageKey = this.getStorageKey(pathData);
    const resolved = path.resolve(this.storageRoot, ...storageKey.split('/'));
    const relativeFromRoot = path.relative(this.storageRoot, resolved);

    if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
      throw new Error('Path traversal detected');
    }

    return resolved;
  }

  private sanitizeFilename(filename: string): string {
    const basename = path.basename(filename);
    const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');

    if (!sanitized || sanitized.length > 255) {
      return `file_${Date.now()}`;
    }

    return sanitized;
  }
}
