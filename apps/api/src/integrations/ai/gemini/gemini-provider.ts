import { ConfigService } from "@nestjs/config";
import { AIRetryPolicy } from "../retry-policy";
import { TokenBucketLimiter } from "../rate-limiter";
import { calculateAICost } from "../cost-calculator";
import { promptRegistry } from "../prompts/prompt-registry";
import { FEEDBACK_ANALYSIS_V2 } from "../prompts/feedback-analysis/v2";
import type {
  AIProvider,
  AnalyzeFeedbackInput,
  AnalyzeFeedbackResult,
} from "../ai-provider.interface";
import { feedbackAnalysisOutputSchema } from "../schemas/feedback-analysis.schema";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";

promptRegistry.register(FEEDBACK_ANALYSIS_V2);

function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private readonly retryPolicy = new AIRetryPolicy();
  private readonly limiter = new TokenBucketLimiter(60, 1, 5);

  constructor(private readonly config: ConfigService) {}

  async analyzeFeedback(input: AnalyzeFeedbackInput): Promise<AnalyzeFeedbackResult> {
    const apiKey = this.config.get<string>("ai.gemini.apiKey");
    const model = this.config.get<string>("ai.gemini.model", "gemini-2.0-flash");
    const promptVersion = input.promptVersion ?? "v2";
    const prompt = promptRegistry.getVersion("feedback-analysis", promptVersion);
    const userPrompt = renderTemplate(prompt.template, {
      businessName: input.businessName,
      industry: input.industry ?? "Không rõ",
      objective: input.objective ?? "Phân tích feedback khách hàng",
      content: input.content,
    });

    if (!apiKey) {
      return this.stubResult(input, model, promptVersion, userPrompt);
    }

    await this.limiter.acquire();
    const started = Date.now();
    try {
      let attempt = 0;
      while (true) {
        attempt += 1;
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userPrompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
            signal: AbortSignal.timeout(60_000),
          });

          if (!response.ok) {
            throw new DomainError(
              response.status === 429 ? "AI_PROVIDER_RATE_LIMIT" : "AI_PROVIDER_UNAVAILABLE",
            );
          }

          const body = (await response.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            usageMetadata?: {
              promptTokenCount?: number;
              candidatesTokenCount?: number;
              totalTokenCount?: number;
            };
          };
          const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new DomainError("AI_OUTPUT_INVALID");

          const parsed = feedbackAnalysisOutputSchema.parse(JSON.parse(text));
          const usage = {
            promptTokens: body.usageMetadata?.promptTokenCount ?? 0,
            completionTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: body.usageMetadata?.totalTokenCount ?? 0,
          };
          calculateAICost(model, usage.promptTokens, usage.completionTokens);

          return {
            output: parsed,
            model,
            provider: this.name,
            promptVersion,
            usage,
            rawResponse: body,
            durationMs: Date.now() - started,
          };
        } catch (error) {
          const retryError = {
            httpStatus: error instanceof DomainError ? error.getStatus() : undefined,
            type: "PROVIDER_ERROR" as const,
            attempt,
          };
          if (!this.retryPolicy.shouldRetry(retryError) || attempt >= this.retryPolicy.maxRetries(retryError)) {
            if (error instanceof DomainError) throw error;
            throw new DomainError("AI_PROVIDER_UNAVAILABLE");
          }
          await new Promise((r) =>
            setTimeout(r, this.retryPolicy.getDelay(attempt, retryError)),
          );
        }
      }
    } finally {
      this.limiter.release();
    }
  }

  private stubResult(
    input: AnalyzeFeedbackInput,
    model: string,
    promptVersion: string,
    userPrompt: string,
  ): AnalyzeFeedbackResult {
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
      model,
      provider: this.name,
      promptVersion,
      usage: { promptTokens: userPrompt.length / 4, completionTokens: 100, totalTokens: 180 },
      rawResponse: { stub: true },
      durationMs: 50,
    };
  }
}
