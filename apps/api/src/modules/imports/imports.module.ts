import { Module } from "@nestjs/common";
import { AnalysisSessionsModule } from "../analysis-sessions";
import { DataSourcesModule } from "../data-sources";
import { FeedbackModule } from "../feedback";
import { StorageModule } from "../../integrations/storage/storage.module";
import { IMPORT_REPOSITORY } from "./domain/import.types";
import { FileParserService } from "./application/file-parser.service";
import { ImportPolicy } from "./application/import.policy";
import { ImportService } from "./application/import.service";
import { PrismaImportRepository } from "./infrastructure/prisma-import.repository";
import { ImportsController } from "./presentation/imports.controller";

@Module({
  imports: [AnalysisSessionsModule, DataSourcesModule, FeedbackModule, StorageModule],
  controllers: [ImportsController],
  providers: [
    ImportService,
    ImportPolicy,
    FileParserService,
    { provide: IMPORT_REPOSITORY, useClass: PrismaImportRepository },
  ],
  exports: [ImportService, IMPORT_REPOSITORY],
})
export class ImportsModule {}
