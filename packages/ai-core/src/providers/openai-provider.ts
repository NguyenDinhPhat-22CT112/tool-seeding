import type { AIProvider, AnalyzeFeedbackInput, AnalyzeFeedbackResult } from "../ai-provider.interface";
import { AIRetryPolicy } from "../retry-policy";
import { TokenBucketLimiter } from "../rate-limiter";
import { feedbackAnalysisOutputSchema } from "../schemas/feedback-analysis.schema";
import { analyzeFeedbackWithProvider } from "./shared";
import type { ProviderHandler } from "./shared";

export interface OpenAIProviderConfig {
  apiKey?: string;
  model?: string;
}

const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const SYSTEM_PROMPT =
  "Trả về JSON hợp lệ theo schema: sentiment, topics, painPoints, questions, priority (1-5), confidence (0-1), evidence[{text,relevance}].";

const handler: ProviderHandler = {
  name: "openai",
  model: "gpt-4o-mini",
  buildRequest(userPrompt: string, apiKey: string) {
    return {
      url: OPENAI_API,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: {
        model: handler.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
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
      model: handler.model,
      provider: handler.name,
      promptVersion,
      usage: { promptTokens: input.content.length / 4, completionTokens: 120, totalTokens: 200 },
      rawResponse: { stub: true },
      durationMs: 50,
    };
  },
};

export function createOpenAIProvider(config?: OpenAIProviderConfig): AIProvider {
  const apiKey = config?.apiKey;
  const model = config?.model ?? "gpt-4o-mini";
  const retryPolicy = new AIRetryPolicy();
  const limiter = new TokenBucketLimiter(60, 1, 5);

  const providerHandler: ProviderHandler = {
    ...handler,
    model,
    buildRequest(userPrompt, key) {
      return {
        url: OPENAI_API,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: {
          model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        },
      };
    },
  };

  return {
    name: "openai",
    async analyzeFeedback(input) {
      return analyzeFeedbackWithProvider(providerHandler, apiKey, input, retryPolicy, limiter);
    },
  };
}
