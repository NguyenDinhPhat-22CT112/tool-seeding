import type { AIProvider, AnalyzeFeedbackInput, AnalyzeFeedbackResult } from "../ai-provider.interface";
import { AIRetryPolicy } from "../retry-policy";
import { TokenBucketLimiter } from "../rate-limiter";
import { feedbackAnalysisOutputSchema } from "../schemas/feedback-analysis.schema";
import { analyzeFeedbackWithProvider } from "./shared";
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
  const limiter = new TokenBucketLimiter(60, 1, 5);

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
  };
}
