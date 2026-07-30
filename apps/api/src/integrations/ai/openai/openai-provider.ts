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

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private readonly retryPolicy = new AIRetryPolicy();
  private readonly limiter = new TokenBucketLimiter(60, 1, 5);

  constructor(private readonly config: ConfigService) {}

  async analyzeFeedback(input: AnalyzeFeedbackInput): Promise<AnalyzeFeedbackResult> {
    const apiKey = this.config.get<string>("ai.openai.apiKey");
    const model = this.config.get<string>("ai.openai.model", "gpt-4o-mini");
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
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content:
                    "Trả về JSON hợp lệ theo schema: sentiment, topics, painPoints, questions, priority (1-5), confidence (0-1), evidence[{text,relevance}].",
                },
                { role: "user", content: userPrompt },
              ],
            }),
            signal: AbortSignal.timeout(60_000),
          });

          if (!response.ok) {
            const errorType =
              response.status === 429
                ? "AI_PROVIDER_RATE_LIMIT"
                : response.status >= 500
                  ? "AI_PROVIDER_UNAVAILABLE"
                  : "AI_OUTPUT_INVALID";
            throw new DomainError(errorType as "AI_PROVIDER_UNAVAILABLE");
          }

          const body = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          };
          const content = body.choices?.[0]?.message?.content;
          if (!content) throw new DomainError("AI_OUTPUT_INVALID");

          const parsed = feedbackAnalysisOutputSchema.parse(JSON.parse(content));
          const usage = {
            promptTokens: body.usage?.prompt_tokens ?? 0,
            completionTokens: body.usage?.completion_tokens ?? 0,
            totalTokens: body.usage?.total_tokens ?? 0,
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
      provider: this.name,
      promptVersion,
      usage: { promptTokens: userPrompt.length / 4, completionTokens: 120, totalTokens: 200 },
      rawResponse: { stub: true },
      durationMs: 50,
    };
  }
}
