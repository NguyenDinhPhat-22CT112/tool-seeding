import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AIProvider } from "./ai-provider.interface";
import { GeminiProvider } from "./gemini/gemini-provider";
import { OpenAIProvider } from "./openai/openai-provider";

@Injectable()
export class AIProviderFactory {
  constructor(private readonly config: ConfigService) {}

  create(): AIProvider {
    const provider = this.config.get<string>("ai.provider", "openai");
    if (provider === "gemini") {
      return new GeminiProvider(this.config);
    }
    return new OpenAIProvider(this.config);
  }
}
