export interface StorageProvider {
  save(key: string, buffer: Buffer, mimeType?: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");
