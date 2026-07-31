import { Global, Module, OnModuleInit } from "@nestjs/common";
import { AIProviderFactory } from "./ai-provider.factory";
import { AI_PROVIDER } from "./ai-provider.interface";
import { promptRegistry } from "./prompts/prompt-registry";
import { FEEDBACK_ANALYSIS_V1 } from "./prompts/feedback-analysis/v1";
import { FEEDBACK_ANALYSIS_V2 } from "./prompts/feedback-analysis/v2";
import { INSIGHT_GENERATION_V1 } from "./prompts/insight-generation/v1";
import { STRATEGY_GENERATION_V1 } from "./prompts/strategy-generation/v1";

@Global()
@Module({
  providers: [
    AIProviderFactory,
    {
      provide: AI_PROVIDER,
      useFactory: (factory: AIProviderFactory) => factory.create(),
      inject: [AIProviderFactory],
    },
  ],
  exports: [AI_PROVIDER, AIProviderFactory],
})
export class AiModule implements OnModuleInit {
  onModuleInit(): void {
    promptRegistry.register(FEEDBACK_ANALYSIS_V1);
    promptRegistry.register(FEEDBACK_ANALYSIS_V2);
    promptRegistry.register(INSIGHT_GENERATION_V1);
    promptRegistry.register(STRATEGY_GENERATION_V1);
  }
}
