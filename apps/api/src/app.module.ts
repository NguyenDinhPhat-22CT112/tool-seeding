import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import {
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  aiConfig,
  storageConfig,
} from "./config";
import { PrismaModule } from "@seeding/database";
import { HealthModule } from "./modules/health/health.module";
import { SerpApiModule } from "./integrations/serpapi";
import { BusinessesModule } from "./modules/businesses";
import { AnalysisSessionsModule } from "./modules/analysis-sessions";
import { DataSourcesModule } from "./modules/data-sources";
import { FeedbackModule } from "./modules/feedback";
import { ImportsModule } from "./modules/imports";
import { DataProcessingModule } from "./modules/data-processing";
import { AiAnalysisModule } from "./modules/ai-analysis";
import { QueueModule } from "./shared/queues/queue.module";
import { AiModule } from "./integrations/ai/ai.module";
import { TemporaryRequestContextMiddleware } from "./shared/context/request-context";
import { createLoggerConfig } from "./shared/logging";
import { AuditService } from "./shared/audit";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, aiConfig, storageConfig],
    }),
    LoggerModule.forRoot(createLoggerConfig()),
    PrismaModule,
    HealthModule,
    SerpApiModule,
    BusinessesModule,
    AnalysisSessionsModule,
    DataSourcesModule,
    FeedbackModule,
    ImportsModule,
    DataProcessingModule,
    AiAnalysisModule,
    QueueModule,
    AiModule,
    // Mỗi bounded context được import tại composition root này.
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TemporaryRequestContextMiddleware)
      .exclude({ path: "health", method: RequestMethod.ALL })
      .forRoutes("*");
  }
}
