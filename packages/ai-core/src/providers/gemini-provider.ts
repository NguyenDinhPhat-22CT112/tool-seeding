import type {
  AIProvider,
  AnalyzeFeedbackInput,
  AnalyzeFeedbackResult,
  GenerateInsightsInput,
  GenerateInsightsResult,
  GenerateStrategyInput,
  GenerateStrategyResult,
} from "../ai-provider.interface";
import { AIRetryPolicy } from "../retry-policy";
import { TokenBucketLimiter } from "../rate-limiter";
import { feedbackAnalysisOutputSchema } from "../schemas/feedback-analysis.schema";
import { insightGenerationOutputSchema } from "../schemas/insight-generation.schema";
import { strategyGenerationOutputSchema } from "../schemas/strategy-generation.schema";
import { analyzeFeedbackWithProvider, generateStructuredWithProvider } from "./shared";
import type { ProviderHandler } from "./shared";

export interface GeminiProviderConfig {
  apiKey?: string;
  model?: string;
}

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models";

function stubResult(input: AnalyzeFeedbackInput, promptVersion: string): AnalyzeFeedbackResult {
  const isNegative = /tệ|chậm|kém|bad|slow|wait|đợi/i.test(input.content);
  const output = feedbackAnalysisOutputSchema.parse({
    sentiment: isNegative ? "NEGATIVE" : "NEUTRAL",
    sentimentScore: isNegative ? -0.5 : 0.1,
    topics: isNegative ? ["dịch vụ"] : ["trải nghiệm"],
    painPoints: isNegative ? ["chờ đợi lâu"] : [],
    questions: [],
    priority: isNegative ? 3 : 2,
    confidence: 0.7,
    evidence: [{ text: input.content.slice(0, 120), relevance: 0.75 }],
  });
  return {
    output,
    model: "gemini-2.0-flash",
    provider: "gemini",
    promptVersion,
    usage: { promptTokens: input.content.length / 4, completionTokens: 100, totalTokens: 180 },
    rawResponse: { stub: true },
    durationMs: 50,
  };
}

export function createGeminiProvider(config?: GeminiProviderConfig): AIProvider {
  const apiKey = config?.apiKey;
  const model = config?.model ?? "gemini-2.0-flash";
  const retryPolicy = new AIRetryPolicy();
  // Free-tier Gemini: ~5 req/phút per model per key. Giữ 4 RPM + concurrency 1
  // để tránh 429 rate-limit, kết hợp retry theo RetryInfo khi vẫn vượt.
  const limiter = new TokenBucketLimiter(4, 4 / 60, 1);

  const providerHandler: ProviderHandler = {
    name: "gemini",
    model,
    buildRequest(userPrompt: string, key: string) {
      const url = `${GEMINI_API}/${model}:generateContent?key=${key}`;
      return {
        url,
        headers: { "Content-Type": "application/json" },
        body: {
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        },
      };
    },
    parseResponse(raw: any) {
      const text = raw.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return {
        content: text,
        usage: {
          promptTokens: raw.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: raw.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: raw.usageMetadata?.totalTokenCount ?? 0,
        },
      };
    },
    stubResult,
  };

  return {
    name: "gemini",
    async analyzeFeedback(input) {
      return analyzeFeedbackWithProvider(providerHandler, apiKey, input, retryPolicy, limiter);
    },
    async generateInsights(input: GenerateInsightsInput): Promise<GenerateInsightsResult> {
      return generateStructuredWithProvider({
        handler: providerHandler,
        apiKey,
        promptId: "insight-generation",
        promptVersion: input.promptVersion ?? "v1",
        variables: {
          businessName: input.businessName,
          objective: input.objective ?? "Phân tích feedback khách hàng",
          analyses: JSON.stringify(input.analyses, null, 2),
        },
        schema: insightGenerationOutputSchema,
        retryPolicy,
        limiter,
      });
    },
    async generateStrategy(input: GenerateStrategyInput): Promise<GenerateStrategyResult> {
      return generateStructuredWithProvider({
        handler: providerHandler,
        apiKey,
        promptId: "strategy-generation",
        promptVersion: input.promptVersion ?? "v1",
        variables: {
          businessName: input.businessName,
          objective: input.objective ?? "Xây dựng chiến lược seeding",
          insights: JSON.stringify(input.insights, null, 2),
        },
        schema: strategyGenerationOutputSchema,
        retryPolicy,
        limiter,
      });
    },
  };
}
