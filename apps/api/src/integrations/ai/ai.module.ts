import { Global, Module } from "@nestjs/common";
import { AIProviderFactory } from "./ai-provider.factory";
import { AI_PROVIDER } from "./ai-provider.interface";

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
export class AiModule {}
