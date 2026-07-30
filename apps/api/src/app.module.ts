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
import { DatabaseModule } from "./database";
import { HealthModule } from "./modules/health/health.module";
import { SerpApiModule } from "./integrations/serpapi";
import { BusinessesModule } from "./modules/businesses";
import { AnalysisSessionsModule } from "./modules/analysis-sessions";
import { DataSourcesModule } from "./modules/data-sources";
import { FeedbackModule } from "./modules/feedback";
import { ImportsModule } from "./modules/imports";
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
    DatabaseModule,
    HealthModule,
    SerpApiModule,
    BusinessesModule,
    AnalysisSessionsModule,
    DataSourcesModule,
    FeedbackModule,
    ImportsModule,
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
