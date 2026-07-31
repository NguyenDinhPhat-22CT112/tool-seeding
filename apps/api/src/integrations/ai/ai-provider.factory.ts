import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createAIProvider } from "@seeding/ai-core";
import type { AIProvider } from "./ai-provider.interface";

@Injectable()
export class AIProviderFactory {
  constructor(private readonly config: ConfigService) {}

  create(): AIProvider {
    return createAIProvider({
      provider: this.config.get<string>("ai.provider", "openai"),
      openai: {
        apiKey: this.config.get<string>("ai.openai.apiKey"),
        model: this.config.get<string>("ai.openai.model", "gpt-4o-mini"),
      },
      gemini: {
        apiKey: this.config.get<string>("ai.gemini.apiKey"),
        model: this.config.get<string>("ai.gemini.model", "gemini-2.0-flash"),
      },
    });
  }
}
