import { Module } from "@nestjs/common";
import { AnalysisSessionsModule } from "../analysis-sessions";
import { DataSourcesModule } from "../data-sources";
import { FEEDBACK_REPOSITORY } from "./domain/feedback.types";
import { FeedbackPolicy } from "./application/feedback.policy";
import { FeedbackService } from "./application/feedback.service";
import { PrismaFeedbackRepository } from "./infrastructure/prisma-feedback.repository";
import { FeedbackController } from "./presentation/feedback.controller";

@Module({
  imports: [AnalysisSessionsModule, DataSourcesModule],
  controllers: [FeedbackController],
  providers: [
    FeedbackService,
    FeedbackPolicy,
    { provide: FEEDBACK_REPOSITORY, useClass: PrismaFeedbackRepository },
  ],
  exports: [FeedbackService, FEEDBACK_REPOSITORY],
})
export class FeedbackModule {}
