export interface StoragePath {
  organizationId: string;
  documentId: string;
  documentVersionId: string;
  fileAssetId: string;
  filename: string;
}

export interface FileStorageAdapter {
  save(path: StoragePath, stream: AsyncIterable<Buffer>): Promise<string>;
  read(path: StoragePath): Promise<AsyncIterable<Buffer>>;
  readByObjectKey(objectKey: string): Promise<AsyncIterable<Buffer>>;
  delete(path: StoragePath): Promise<void>;
  exists(path: StoragePath): Promise<boolean>;
  existsByObjectKey(objectKey: string): Promise<boolean>;
  getStorageKey(path: StoragePath): string;
}
