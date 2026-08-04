import { Module } from "@nestjs/common";
import { AnalysisSessionsModule } from "../analysis-sessions";
import { StrategyPolicy } from "./application/strategy.policy";
import { StrategyService } from "./application/strategy.service";
import { STRATEGY_REPOSITORY } from "./domain/strategy.types";
import { PrismaStrategyRepository } from "./infrastructure/prisma-strategy.repository";
import { StrategyController } from "./presentation/strategy.controller";

@Module({
  imports: [AnalysisSessionsModule],
  controllers: [StrategyController],
  providers: [
    StrategyService,
    StrategyPolicy,
    { provide: STRATEGY_REPOSITORY, useClass: PrismaStrategyRepository },
  ],
  exports: [StrategyService, STRATEGY_REPOSITORY],
})
export class StrategyModule {}
