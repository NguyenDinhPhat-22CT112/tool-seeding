import { Injectable } from "@nestjs/common";
import { StorageProvider } from "./storage.interface";

/** Stub cho production — triển khai Cloudflare R2 sau. */
@Injectable()
export class R2StorageProvider implements StorageProvider {
  async save(_key: string, _buffer: Buffer): Promise<void> {
    throw new Error("R2 storage chưa được triển khai");
  }

  async read(_key: string): Promise<Buffer> {
    throw new Error("R2 storage chưa được triển khai");
  }

  async delete(_key: string): Promise<void> {
    throw new Error("R2 storage chưa được triển khai");
  }

  async exists(_key: string): Promise<boolean> {
    return false;
  }
}
