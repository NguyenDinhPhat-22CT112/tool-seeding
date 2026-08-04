import { Module } from "@nestjs/common";
import { AnalysisSessionsModule } from "../analysis-sessions";
import { DataProcessingModule } from "../data-processing";
import { REVIEW_CRAWL_REPOSITORY } from "./domain/review-crawl.types";
import { ReviewCrawlPolicy } from "./application/review-crawl.policy";
import { ReviewCrawlService } from "./application/review-crawl.service";
import { PrismaReviewCrawlRepository } from "./infrastructure/prisma-review-crawl.repository";
import { ReviewCrawlController } from "./presentation/review-crawl.controller";

@Module({
  imports: [AnalysisSessionsModule, DataProcessingModule],
  controllers: [ReviewCrawlController],
  providers: [
    ReviewCrawlService,
    ReviewCrawlPolicy,
    {
      provide: REVIEW_CRAWL_REPOSITORY,
      useClass: PrismaReviewCrawlRepository,
    },
  ],
  exports: [ReviewCrawlService],
})
export class ReviewsCrawlerModule {}
