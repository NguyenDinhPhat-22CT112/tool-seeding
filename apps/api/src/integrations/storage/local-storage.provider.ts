import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StorageProvider } from "./storage.interface";

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string;

  constructor(config: ConfigService) {
    this.basePath = config.get<string>("storage.localPath", "./uploads");
  }

  private resolvePath(key: string): string {
    return join(this.basePath, key);
  }

  async save(key: string, buffer: Buffer): Promise<void> {
    const filePath = this.resolvePath(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolvePath(key));
    } catch {
      // ignore missing file
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await readFile(this.resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }
}
