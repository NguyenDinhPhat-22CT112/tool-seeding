import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createAIProvider } from "@seeding/ai-core";
import type { AIProvider } from "./ai-provider.interface";

@Injectable()
export class AIProviderFactory {
  constructor(private readonly config: ConfigService) {}

  create(): AIProvider {
    return createAIProvider({
      provider: this.config.get<string>("ai.provider", "groq"),
      gemini: {
        apiKey: this.config.get<string>("ai.gemini.apiKey"),
        model: this.config.get<string>("ai.gemini.model", "gemini-2.0-flash"),
      },
      groq: {
        apiKey: this.config.get<string>("ai.groq.apiKey"),
        model: this.config.get<string>("ai.groq.model", "openai/gpt-oss-20b"),
      },
    });
  }
}
