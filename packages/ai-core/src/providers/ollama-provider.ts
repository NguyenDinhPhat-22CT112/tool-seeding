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

export interface OllamaProviderConfig {
  /** Base URL Ollama server, mặc định local. */
  baseUrl?: string;
  /** Tên model đã pull về (VD qwen2.5:7b). */
  model?: string;
}

const SYSTEM_PROMPT =
  "Trả lời BẰNG TIẾNG VIỆT. Trả về JSON hợp lệ theo schema được yêu cầu trong prompt. Không thêm chữ nào ngoài JSON.";

export function createOllamaProvider(config?: OllamaProviderConfig): AIProvider {
  const baseUrl = (config?.baseUrl ?? "http://localhost:11434").replace(/\/+$/, "");
  const model = config?.model ?? "qwen2.5:7b";
  const retryPolicy = new AIRetryPolicy();
  // Ollama local không có quota cứng; vẫn giữ token bucket để tránh quá tải GPU.
  const limiter = new TokenBucketLimiter(10, 10 / 60, 1);

  const providerHandler: ProviderHandler = {
    name: "ollama",
    model,
    buildRequest(userPrompt: string, _apiKey?: string) {
      return {
        url: `${baseUrl}/v1/chat/completions`,
        headers: { "Content-Type": "application/json" },
        body: {
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          stream: false,
          format: "json",
          temperature: 0.1,
        },
      };
    },
    parseResponse(raw: any) {
      const content = raw.choices?.[0]?.message?.content ?? "";
      return {
        content,
        usage: {
          promptTokens: raw.usage?.prompt_tokens ?? 0,
          completionTokens: raw.usage?.completion_tokens ?? 0,
          totalTokens: raw.usage?.total_tokens ?? 0,
        },
      };
    },
    stubResult(input: AnalyzeFeedbackInput, promptVersion: string): AnalyzeFeedbackResult {
      const isNegative = /tệ|chậm|kém|bad|slow|wait|đợi/i.test(input.content);
      const output = feedbackAnalysisOutputSchema.parse({
        sentiment: isNegative ? "NEGATIVE" : "POSITIVE",
        sentimentScore: isNegative ? -0.6 : 0.7,
        topics: isNegative ? ["thời gian phục vụ"] : ["chất lượng sản phẩm"],
        painPoints: isNegative ? ["khách hàng phải chờ lâu"] : [],
        questions: [],
        priority: isNegative ? 4 : 2,
        confidence: 0.75,
        evidence: [{ text: input.content.slice(0, 120), relevance: 0.8 }],
      });
      return {
        output,
        model,
        provider: "ollama",
        promptVersion,
        usage: { promptTokens: input.content.length / 4, completionTokens: 120, totalTokens: 200 },
        rawResponse: { stub: true },
        durationMs: 50,
      };
    },
  };

  return {
    name: "ollama",
    async analyzeFeedback(input) {
      return analyzeFeedbackWithProvider(providerHandler, undefined, input, retryPolicy, limiter, false);
    },
    async generateInsights(input: GenerateInsightsInput): Promise<GenerateInsightsResult> {
      return generateStructuredWithProvider({
        handler: providerHandler,
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
        requiresApiKey: false,
      });
    },
    async generateStrategy(input: GenerateStrategyInput): Promise<GenerateStrategyResult> {
      return generateStructuredWithProvider({
        handler: providerHandler,
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
        requiresApiKey: false,
      });
    },
  };
}
