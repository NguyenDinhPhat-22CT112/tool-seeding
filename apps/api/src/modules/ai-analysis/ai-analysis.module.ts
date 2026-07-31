import { Module } from "@nestjs/common";
import { FEEDBACK_ANALYSIS_REPOSITORY } from "./domain/feedback-analysis.types";
import { AiAnalysisService } from "./application/ai-analysis.service";
import { PrismaFeedbackAnalysisRepository } from "./infrastructure/prisma-feedback-analysis.repository";
import { AiAnalysisController } from "./presentation/ai-analysis.controller";

@Module({
  controllers: [AiAnalysisController],
  providers: [
    AiAnalysisService,
    {
      provide: FEEDBACK_ANALYSIS_REPOSITORY,
      useClass: PrismaFeedbackAnalysisRepository,
    },
  ],
  exports: [AiAnalysisService, FEEDBACK_ANALYSIS_REPOSITORY],
})
export class AiAnalysisModule {}
