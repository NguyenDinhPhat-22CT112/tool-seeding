import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createAIProvider } from "@seeding/ai-core";
import type {
  AIProvider,
  AnalyzeFeedbackInput,
  AnalyzeFeedbackResult,
  GenerateInsightsInput,
  GenerateInsightsResult,
  GenerateStrategyInput,
  GenerateStrategyResult,
} from "@seeding/ai-core";

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private provider: AIProvider | null = null;
  private insightStrategyProvider: AIProvider | null = null;

  constructor(private readonly config: ConfigService) {}

  /** Provider dùng cho phân tích từng feedback (AI_PROVIDER, mặc định Ollama local). */
  private getProvider(): AIProvider {
    if (this.provider) return this.provider;

    const providerName = this.config.get<string>("AI_PROVIDER", "ollama");
    const geminiKeysRaw = this.config.get<string>("GEMINI_API_KEYS", "");
    const geminiKeys = geminiKeysRaw
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    this.provider = createAIProvider({
      provider: providerName,
      openai: {
        apiKey: this.config.get<string>("OPENAI_API_KEY"),
        model: this.config.get<string>("OPENAI_MODEL", "gpt-4o-mini"),
      },
      gemini: {
        apiKeys: geminiKeys,
        model: this.config.get<string>("GEMINI_MODEL", "gemini-2.0-flash"),
      },
      ollama: {
        baseUrl: this.config.get<string>("OLLAMA_BASE_URL"),
        model: this.config.get<string>("OLLAMA_MODEL", "qwen2.5:3b"),
      },
      deepseek: {
        apiKey: this.config.get<string>("DEEPSEEK_API_KEY"),
        model: this.config.get<string>("DEEPSEEK_MODEL", "deepseek-v4-flash"),
      },
    });
    this.logger.log(`Using ${providerName} AI provider for feedback analysis`);
    return this.provider;
  }

  /**
   * Provider dùng cho insight/strategy generation. Riêng biệt vì cần model
   * mạnh hơn: AI_INSIGHT_STRATEGY_PROVIDER mặc định deepseek (trả phí).
   * Fallback về provider feedback khi không cấu hình.
   */
  private getInsightStrategyProvider(): AIProvider {
    if (this.insightStrategyProvider) return this.insightStrategyProvider;

    const providerName = this.config.get<string>("AI_INSIGHT_STRATEGY_PROVIDER", "");
    if (!providerName || providerName === "default") {
      this.insightStrategyProvider = this.getProvider();
      return this.insightStrategyProvider;
    }

    const deepseekKey = this.config.get<string>("DEEPSEEK_API_KEY");
    const deepseekModel = this.config.get<string>("DEEPSEEK_MODEL", "deepseek-v4-pro");
    this.insightStrategyProvider = createAIProvider({
      provider: providerName,
      deepseek: {
        apiKey: deepseekKey,
        model: deepseekModel,
      },
      ollama: {
        baseUrl: this.config.get<string>("OLLAMA_BASE_URL"),
        model: this.config.get<string>("OLLAMA_MODEL_STRATEGY", "qwen2.5:7b"),
      },
    });
    this.logger.log(`Using ${providerName} AI provider for insight/strategy generation`);
    return this.insightStrategyProvider;
  }

  async analyzeFeedback(input: AnalyzeFeedbackInput): Promise<AnalyzeFeedbackResult> {
    const provider = this.getProvider();
    return provider.analyzeFeedback(input);
  }

  async generateInsights(input: GenerateInsightsInput): Promise<GenerateInsightsResult> {
    const provider = this.getInsightStrategyProvider();
    return provider.generateInsights(input);
  }

  async generateStrategy(input: GenerateStrategyInput): Promise<GenerateStrategyResult> {
    const provider = this.getInsightStrategyProvider();
    return provider.generateStrategy(input);
  }
}
