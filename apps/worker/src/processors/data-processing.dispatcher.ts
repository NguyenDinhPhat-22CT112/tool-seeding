import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { NormalizationProcessor } from "./normalization.processor";
import { DeduplicationProcessor } from "./deduplication.processor";
import { FeedbackAnalysisProcessor } from "./feedback-analysis.processor";
import { ReviewsCrawlProcessor } from "./reviews-crawl.processor";
import { InsightGenerationProcessor } from "./insight-generation.processor";
import { StrategyGenerationProcessor } from "./strategy-generation.processor";

const DATA_PROCESSING_QUEUE = "data-processing";

/**
 * Dispatcher duy nhất lắng nghe queue data-processing.
 * BullMQ phân phối job tới worker theo lượt — nếu để nhiều @Processor trên cùng
 * một queue, mỗi processor sẽ là một worker độc lập và có thể nhận job của loại khác.
 * Dispatcher đọc job.name (jobType) và route tới handler tương ứng.
 */
@Injectable()
@Processor(DATA_PROCESSING_QUEUE)
export class DataProcessingDispatcher extends WorkerHost {
  private readonly logger = new Logger(DataProcessingDispatcher.name);

  constructor(
    private readonly normalization: NormalizationProcessor,
    private readonly deduplication: DeduplicationProcessor,
    private readonly feedbackAnalysis: FeedbackAnalysisProcessor,
    private readonly reviewsCrawl: ReviewsCrawlProcessor,
    private readonly insightGeneration: InsightGenerationProcessor,
    private readonly strategyGeneration: StrategyGenerationProcessor,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const jobType = job.name || (job.data as { jobType?: string } | undefined)?.jobType;

    switch (jobType) {
      case "DATA_NORMALIZATION":
        return this.normalization.process(job);
      case "DEDUPLICATION":
        return this.deduplication.process(job);
      case "AI_FEEDBACK_ANALYSIS":
        return this.feedbackAnalysis.process(job);
      case "REVIEW_CRAWLING":
        return this.reviewsCrawl.process(job);
      case "INSIGHT_GENERATION":
        return this.insightGeneration.process(job);
      case "STRATEGY_GENERATION":
        return this.strategyGeneration.process(job);
      default:
        this.logger.error(
          {
            jobType,
            processingJobId: (job.data as { processingJobId?: string } | undefined)?.processingJobId,
          },
          `No handler registered for job type: ${jobType}`,
        );
        throw new Error(`No handler registered for job type: ${jobType}`);
    }
  }
}
