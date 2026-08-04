import { Global, Module, OnModuleInit } from "@nestjs/common";
import { AIProviderFactory } from "./ai-provider.factory";
import { AI_PROVIDER } from "./ai-provider.interface";
import { promptRegistry } from "./prompts/prompt-registry";
import { registerDefaultPrompts } from "@seeding/ai-core";

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
    registerDefaultPrompts(promptRegistry);
  }
}
