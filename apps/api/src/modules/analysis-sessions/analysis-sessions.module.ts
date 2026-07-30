import { Module } from "@nestjs/common";
import { AnalysisSessionService } from "./application/analysis-session.service";
import { AnalysisSessionPolicy } from "./application/analysis-session.policy";
import { ANALYSIS_SESSION_REPOSITORY } from "./domain/analysis-session.types";
import { PrismaAnalysisSessionRepository } from "./infrastructure/prisma-analysis-session.repository";
import {
  AnalysisSessionsController,
  BusinessAnalysisSessionsController,
} from "./presentation/analysis-sessions.controller";

@Module({
  controllers: [AnalysisSessionsController, BusinessAnalysisSessionsController],
  providers: [
    AnalysisSessionService,
    AnalysisSessionPolicy,
    { provide: ANALYSIS_SESSION_REPOSITORY, useClass: PrismaAnalysisSessionRepository },
  ],
  exports: [AnalysisSessionService, ANALYSIS_SESSION_REPOSITORY],
})
export class AnalysisSessionsModule {}
