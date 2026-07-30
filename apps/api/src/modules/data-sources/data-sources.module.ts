import { Module } from "@nestjs/common";
import { AnalysisSessionsModule } from "../analysis-sessions";
import { DATA_SOURCE_REPOSITORY } from "./domain/data-source.types";
import { DataSourcePolicy } from "./application/data-source.policy";
import { DataSourceService } from "./application/data-source.service";
import { PrismaDataSourceRepository } from "./infrastructure/prisma-data-source.repository";
import { DataSourcesController } from "./presentation/data-sources.controller";

@Module({
  imports: [AnalysisSessionsModule],
  controllers: [DataSourcesController],
  providers: [
    DataSourceService,
    DataSourcePolicy,
    { provide: DATA_SOURCE_REPOSITORY, useClass: PrismaDataSourceRepository },
  ],
  exports: [DataSourceService, DATA_SOURCE_REPOSITORY],
})
export class DataSourcesModule {}
