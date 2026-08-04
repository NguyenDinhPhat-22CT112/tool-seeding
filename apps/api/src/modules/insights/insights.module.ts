import { Module } from "@nestjs/common";
import { AnalysisSessionsModule } from "../analysis-sessions";
import { FeedbackModule } from "../feedback";
import { InsightPolicy } from "./application/insight.policy";
import { InsightService } from "./application/insight.service";
import { INSIGHT_REPOSITORY } from "./domain/insight.types";
import { PrismaInsightRepository } from "./infrastructure/prisma-insight.repository";
import { InsightsController } from "./presentation/insights.controller";

@Module({
  imports: [AnalysisSessionsModule, FeedbackModule],
  controllers: [InsightsController],
  providers: [
    InsightService,
    InsightPolicy,
    { provide: INSIGHT_REPOSITORY, useClass: PrismaInsightRepository },
  ],
  exports: [InsightService, INSIGHT_REPOSITORY],
})
export class InsightsModule {}
