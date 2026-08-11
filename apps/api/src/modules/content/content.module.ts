import { Module } from "@nestjs/common";
import { AnalysisSessionsModule } from "../analysis-sessions";
import { DataProcessingModule } from "../data-processing";
import { StrategyModule } from "../strategy";
import { ContentPolicy } from "./application/content.policy";
import { ContentService } from "./application/content.service";
import { CONTENT_REPOSITORY } from "./domain/content.types";
import { PrismaContentRepository } from "./infrastructure/prisma-content.repository";
import { ContentController } from "./presentation/content.controller";

@Module({
  imports: [AnalysisSessionsModule, StrategyModule, DataProcessingModule],
  controllers: [ContentController],
  providers: [
    ContentService,
    ContentPolicy,
    { provide: CONTENT_REPOSITORY, useClass: PrismaContentRepository },
  ],
  exports: [ContentService, CONTENT_REPOSITORY],
})
export class ContentModule {}
