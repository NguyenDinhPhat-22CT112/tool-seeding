import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PrismaModule } from "@seeding/database";
import {
  NormalizationProcessor,
  DeduplicationProcessor,
  FeedbackAnalysisProcessor,
} from "./processors";
import { AiAnalysisService } from "./services/ai-analysis.service";
import { JobRepositoryService } from "./services/job-repository.service";

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
    NormalizationProcessor,
    DeduplicationProcessor,
    FeedbackAnalysisProcessor,
    AiAnalysisService,
    JobRepositoryService,
  ],
})
export class WorkerModule {}
