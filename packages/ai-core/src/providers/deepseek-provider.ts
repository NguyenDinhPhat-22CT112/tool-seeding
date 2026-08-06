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

export interface DeepSeekProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

const DEEPSEEK_API = "https://api.deepseek.com";

function stubFeedback(input: AnalyzeFeedbackInput, model: string, promptVersion: string): AnalyzeFeedbackResult {
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
    provider: "deepseek",
    promptVersion,
    usage: { promptTokens: input.content.length / 4, completionTokens: 120, totalTokens: 200 },
    rawResponse: { stub: true },
    durationMs: 50,
  };
}

export function createDeepSeekProvider(config?: DeepSeekProviderConfig): AIProvider {
  const apiKey = config?.apiKey;
  const model = config?.model ?? "deepseek-v4-flash";
  const baseUrl = (config?.baseUrl ?? DEEPSEEK_API).replace(/\/+$/, "");
  const retryPolicy = new AIRetryPolicy();
  const limiter = new TokenBucketLimiter(60, 60 / 60, 1);

  const providerHandler: ProviderHandler = {
    name: "deepseek",
    model,
    buildRequest(userPrompt: string, key: string) {
      return {
        url: `${baseUrl}/v1/chat/completions`,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: {
          model,
          messages: [
            { role: "system", content: "Trả lời BẰNG TIẾNG VIỆT. Trả về JSON hợp lệ theo schema được yêu cầu trong prompt. Không thêm chữ nào ngoài JSON." },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          stream: false,
          temperature: 0.3,
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
    stubResult(input: AnalyzeFeedbackInput, promptVersion: string) {
      return stubFeedback(input, model, promptVersion);
    },
  };

  return {
    name: "deepseek",
    async analyzeFeedback(input) {
      return analyzeFeedbackWithProvider(providerHandler, apiKey, input, retryPolicy, limiter);
    },
    async generateInsights(input: GenerateInsightsInput): Promise<GenerateInsightsResult> {
      return generateStructuredWithProvider({
        handler: providerHandler,
        apiKey,
        promptId: "insight-generation",
        promptVersion: input.promptVersion ?? "v3",
        variables: {
          businessName: input.businessName,
          objective: input.objective ?? "Phân tích feedback khách hàng",
          analyses: JSON.stringify(input.analyses),
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
        promptVersion: input.promptVersion ?? "v3",
        variables: {
          businessName: input.businessName,
          objective: input.objective ?? "Xây dựng chiến lược seeding",
          insights: JSON.stringify(input.insights),
        },
        schema: strategyGenerationOutputSchema,
        retryPolicy,
        limiter,
      });
    },
  };
}
