import type { AnalyzeFeedbackInput, AnalyzeFeedbackResult, AICompletionUsage, AIProvider } from "../ai-provider.interface";
import { AIProviderError } from "../ai-provider.interface";
import { AIRetryPolicy } from "../retry-policy";
import { TokenBucketLimiter } from "../rate-limiter";
import { calculateAICost, renderTemplate } from "../cost-calculator";
import { promptRegistry } from "../prompt-registry";
import { feedbackAnalysisOutputSchema } from "../schemas/feedback-analysis.schema";

export interface ProviderHandler {
  name: string;
  model: string;
  buildRequest(userPrompt: string, apiKey: string): { url: string; headers: Record<string, string>; body: unknown };
  parseResponse(raw: unknown): { content: string; usage: AICompletionUsage };
  stubResult(input: AnalyzeFeedbackInput, promptVersion: string): AnalyzeFeedbackResult;
}

async function resolvePrompt(input: AnalyzeFeedbackInput): Promise<{ promptVersion: string; userPrompt: string }> {
  const promptVersion = input.promptVersion ?? "v2";
  const prompt = promptRegistry.getVersion("feedback-analysis", promptVersion);
  const userPrompt = renderTemplate(prompt.template, {
    businessName: input.businessName,
    industry: input.industry ?? "Không rõ",
    objective: input.objective ?? "Phân tích feedback khách hàng",
    content: input.content,
  });
  return { promptVersion, userPrompt };
}

function buildErrorLabel(providerName: string, error: unknown): string {
  return error instanceof Error ? error.message : `Unknown ${providerName} error`;
}

export async function analyzeFeedbackWithProvider(
  handler: ProviderHandler,
  apiKey: string | undefined,
  input: AnalyzeFeedbackInput,
  retryPolicy: AIRetryPolicy,
  limiter: TokenBucketLimiter,
): Promise<AnalyzeFeedbackResult> {
  const { promptVersion, userPrompt } = await resolvePrompt(input);

  if (!apiKey) {
    return handler.stubResult(input, promptVersion);
  }

  await limiter.acquire();
  const started = Date.now();
  try {
    let attempt = 0;
    while (true) {
      attempt += 1;
      try {
        const { url, headers, body } = handler.buildRequest(userPrompt, apiKey);
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60_000),
        });

        if (!response.ok) {
          throw new AIProviderError(
            `${handler.name} error: ${response.status} ${await response.text().catch(() => "")}`,
            "PROVIDER_ERROR",
            response.status,
            response.status === 429 ? Number(response.headers.get("retry-after-ms") ?? 0) || undefined : undefined,
          );
        }

        const raw = await response.json();
        const { content, usage } = handler.parseResponse(raw);
        if (!content) {
          throw new AIProviderError(`${handler.name} returned empty content`, "SCHEMA_INVALID");
        }

        const parsed = feedbackAnalysisOutputSchema.parse(JSON.parse(content));
        calculateAICost(handler.model, usage.promptTokens, usage.completionTokens);

        return {
          output: parsed,
          model: handler.model,
          provider: handler.name,
          promptVersion,
          usage,
          rawResponse: raw,
          durationMs: Date.now() - started,
        };
      } catch (error) {
        if (error instanceof AIProviderError) {
          const retryError = {
            httpStatus: error.httpStatus,
            type: error.type ?? ("PROVIDER_ERROR" as const),
            attempt,
            retryAfterMs: error.retryAfterMs,
          };
          if (!retryPolicy.shouldRetry(retryError) || attempt >= retryPolicy.maxRetries(retryError)) {
            throw error;
          }
          await new Promise((r) => setTimeout(r, retryPolicy.getDelay(attempt, retryError)));
        } else {
          throw new AIProviderError(buildErrorLabel(handler.name, error), "PROVIDER_ERROR");
        }
      }
    }
  } finally {
    limiter.release();
  }
}
