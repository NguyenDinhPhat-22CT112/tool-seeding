import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createAIProvider } from "@seeding/ai-core";
import type {
  AIProvider,
  AnalyzeFeedbackInput,
  AnalyzeFeedbackResult,
  GenerateContentInput,
  GenerateContentResult,
  GenerateInsightsInput,
  GenerateInsightsResult,
  GenerateStrategyInput,
  GenerateStrategyResult,
} from "@seeding/ai-core";

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private provider: AIProvider | null = null;
  private insightProvider: AIProvider | null = null;
  private strategyProvider: AIProvider | null = null;

  constructor(private readonly config: ConfigService) {}

  /** Provider dùng cho phân tích từng feedback (AI_PROVIDER, mặc định Groq). */
  private getProvider(): AIProvider {
    if (this.provider) return this.provider;

    const providerName = this.config.get<string>("AI_PROVIDER", "groq");
    const geminiKeysRaw = this.config.get<string>("GEMINI_API_KEYS", "");
    const geminiKeys = geminiKeysRaw
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    this.provider = createAIProvider({
      provider: providerName,
      gemini: {
        apiKeys: geminiKeys,
        model: this.config.get<string>("GEMINI_MODEL", "gemini-2.0-flash"),
      },
      groq: {
        apiKey: this.config.get<string>("GROQ_API_KEY"),
        model: this.config.get<string>("GROQ_MODEL", "openai/gpt-oss-20b"),
      },
    });
    this.logger.log(`Using ${providerName} AI provider for feedback analysis`);
    return this.provider;
  }

  /**
   * Provider dùng cho insight generation — OpenRouter (AI_INSIGHT_PROVIDER, mặc định openrouter).
   * Model mặc định theo model free trên OpenRouter. Fallback về provider feedback
   * khi cấu hình "default".
   */
  private getInsightProvider(): AIProvider {
    if (this.insightProvider) return this.insightProvider;

    const providerName = this.config.get<string>("AI_INSIGHT_PROVIDER", "openrouter");
    if (providerName === "default") {
      this.insightProvider = this.getProvider();
      return this.insightProvider;
    }

    this.insightProvider = createAIProvider({
      provider: providerName,
      openrouter: {
        apiKey: this.config.get<string>("OPENROUTER_API_KEY"),
        model: this.config.get<string>("OPENROUTER_MODEL", "google/gemini-2.0-flash-exp:free"),
      },
      gemini: {
        apiKey: this.config.get<string>("GEMINI_API_KEY"),
        model: this.config.get<string>("GEMINI_MODEL", "gemini-2.0-flash"),
      },
    });
    this.logger.log(`Using ${providerName} AI provider for insight generation`);
    return this.insightProvider;
  }

  /**
   * Provider dùng cho strategy generation — Gemini (AI_STRATEGY_PROVIDER, mặc định gemini).
   * Fallback về provider feedback khi cấu hình "default".
   */
  private getStrategyProvider(): AIProvider {
    if (this.strategyProvider) return this.strategyProvider;

    const providerName = this.config.get<string>("AI_STRATEGY_PROVIDER", "gemini");
    if (providerName === "default") {
      this.strategyProvider = this.getProvider();
      return this.strategyProvider;
    }

    const geminiKeysRaw = this.config.get<string>("GEMINI_API_KEYS", "");
    const geminiKeys = geminiKeysRaw
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    this.strategyProvider = createAIProvider({
      provider: providerName,
      gemini: {
        apiKeys: geminiKeys,
        apiKey: this.config.get<string>("GEMINI_API_KEY"),
        model: this.config.get<string>("GEMINI_MODEL_STRATEGY", "gemini-2.0-flash"),
      },
      openrouter: {
        apiKey: this.config.get<string>("OPENROUTER_API_KEY"),
        model: this.config.get<string>("OPENROUTER_MODEL", "google/gemini-2.0-flash-exp:free"),
      },
    });
    this.logger.log(`Using ${providerName} AI provider for strategy generation`);
    return this.strategyProvider;
  }

  async analyzeFeedback(input: AnalyzeFeedbackInput): Promise<AnalyzeFeedbackResult> {
    const provider = this.getProvider();
    return provider.analyzeFeedback(input);
  }

  async generateInsights(input: GenerateInsightsInput): Promise<GenerateInsightsResult> {
    const provider = this.getInsightProvider();
    return provider.generateInsights(input);
  }

  async generateStrategy(input: GenerateStrategyInput): Promise<GenerateStrategyResult> {
    const provider = this.getStrategyProvider();
    return provider.generateStrategy(input);
  }

  async generateContent(input: GenerateContentInput): Promise<GenerateContentResult> {
    const provider = this.getStrategyProvider();
    return provider.generateContent(input);
  }
}
