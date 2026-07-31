import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createAIProvider } from "@seeding/ai-core";
import type {
  AIProvider,
  AnalyzeFeedbackInput,
  AnalyzeFeedbackResult,
} from "@seeding/ai-core";

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private provider: AIProvider | null = null;

  constructor(private readonly config: ConfigService) {}

  private getProvider(): AIProvider {
    if (this.provider) return this.provider;

    const providerName = this.config.get<string>("AI_PROVIDER", "openai");
    this.provider = createAIProvider({
      provider: providerName,
      openai: {
        apiKey: this.config.get<string>("OPENAI_API_KEY"),
        model: this.config.get<string>("OPENAI_MODEL", "gpt-4o-mini"),
      },
      gemini: {
        apiKey: this.config.get<string>("GEMINI_API_KEY"),
        model: this.config.get<string>("GEMINI_MODEL", "gemini-2.0-flash"),
      },
    });
    this.logger.log(`Using ${providerName} AI provider`);
    return this.provider;
  }

  async analyzeFeedback(input: AnalyzeFeedbackInput): Promise<AnalyzeFeedbackResult> {
    const provider = this.getProvider();
    return provider.analyzeFeedback(input);
  }
}
