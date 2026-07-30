import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LocalStorageProvider } from "./local-storage.provider";
import { R2StorageProvider } from "./r2-storage.provider";
import { STORAGE_PROVIDER } from "./storage.interface";

@Module({
  providers: [
    LocalStorageProvider,
    R2StorageProvider,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, LocalStorageProvider, R2StorageProvider],
      useFactory: (
        config: ConfigService,
        local: LocalStorageProvider,
        r2: R2StorageProvider,
      ) => {
        const provider = config.get<string>("storage.provider", "local");
        return provider === "r2" ? r2 : local;
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
