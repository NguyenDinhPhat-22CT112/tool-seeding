import { BullModule } from "@nestjs/bullmq";
import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PrismaModule } from "@seeding/database";
import { registerDefaultPrompts } from "@seeding/ai-core";
import {
  DataProcessingDispatcher,
  NormalizationProcessor,
  DeduplicationProcessor,
  FeedbackAnalysisProcessor,
  ReviewsCrawlProcessor,
  InsightGenerationProcessor,
  StrategyGenerationProcessor,
} from "./processors";
import { AiAnalysisService } from "./services/ai-analysis.service";
import { JobRepositoryService } from "./services/job-repository.service";
import { globalFileLogger } from "./common/file-logger";
import { JobMonitor } from "./common/job-monitor";

const DATA_PROCESSING_QUEUE = "data-processing";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get("REDIS_HOST", "localhost"),
          port: config.get("REDIS_PORT", 6379),
          password: config.get("REDIS_PASSWORD") || undefined,
        },
      }),
    }),
    BullModule.registerQueue({ name: DATA_PROCESSING_QUEUE }),
    PrismaModule,
  ],
  providers: [
    DataProcessingDispatcher,
    NormalizationProcessor,
    DeduplicationProcessor,
    FeedbackAnalysisProcessor,
    ReviewsCrawlProcessor,
    InsightGenerationProcessor,
    StrategyGenerationProcessor,
    AiAnalysisService,
    JobRepositoryService,
  ],
})
export class WorkerModule implements OnModuleInit {
  private readonly logger = new Logger(WorkerModule.name);

  async onModuleInit(): Promise<void> {
    registerDefaultPrompts();
    await globalFileLogger.log("INFO", "WorkerModule initialized", {
      queue: DATA_PROCESSING_QUEUE,
      processors: [
        "NormalizationProcessor",
        "DeduplicationProcessor",
        "FeedbackAnalysisProcessor",
        "ReviewsCrawlProcessor",
        "InsightGenerationProcessor",
        "StrategyGenerationProcessor",
      ],
    });
    this.logger.log("WorkerModule initialized successfully");
  }
}
