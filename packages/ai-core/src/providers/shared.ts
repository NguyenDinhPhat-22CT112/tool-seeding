import type { AnalyzeFeedbackInput, AnalyzeFeedbackResult, AICompletionUsage, AIProvider } from "../ai-provider.interface";
import { AIProviderError } from "../ai-provider.interface";
import { AIRetryPolicy } from "../retry-policy";
import { TokenBucketLimiter } from "../rate-limiter";
import { calculateAICost, renderTemplate } from "../cost-calculator";
import { promptRegistry } from "../prompt-registry";
import { feedbackAnalysisOutputSchema } from "../schemas/feedback-analysis.schema";
import type { z } from "zod";

export interface ProviderHandler {
  name: string;
  model: string;
  buildRequest(userPrompt: string, apiKey?: string): { url: string; headers: Record<string, string>; body: unknown };
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
  requiresApiKey = true,
): Promise<AnalyzeFeedbackResult> {  const { promptVersion, userPrompt } = await resolvePrompt(input);

  if (requiresApiKey && !apiKey) {
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
          signal: AbortSignal.timeout(600_000),
        });

        if (!response.ok) {
          const rawText = await response.text().catch(() => "");
          throw new AIProviderError(
            `${handler.name} error: ${response.status} ${rawText}`,
            "PROVIDER_ERROR",
            response.status,
            response.status === 429
              ? extractRetryAfterMs(rawText) ?? parseRetryAfterHeader(response.headers.get("retry-after"))
              : undefined,
          );
        }

        const raw = await response.json();
        const { content, usage } = handler.parseResponse(raw);
        if (!content) {
          throw new AIProviderError(`${handler.name} returned empty content`, "SCHEMA_INVALID");
        }

        const parsed = feedbackAnalysisOutputSchema.parse(safeParseJson(content));
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

/**
 * Gọi AI để sinh output có cấu trúc theo schema bất kỳ (insight, strategy...).
 * Dùng chung cơ chế retry/rate-limit/safeParseJson với analyzeFeedbackWithProvider.
 */
export async function generateStructuredWithProvider<T>(params: {
  handler: ProviderHandler;
  apiKey?: string;
  promptId: string;
  promptVersion: string;
  variables: Record<string, string>;
  schema: z.ZodType<T>;
  retryPolicy: AIRetryPolicy;
  limiter: TokenBucketLimiter;
  requiresApiKey?: boolean;
}): Promise<{
  output: T;
  model: string;
  provider: string;
  promptVersion: string;
  usage: AICompletionUsage;
  rawResponse: unknown;
  durationMs: number;
}> {
  const { handler, apiKey, promptId, promptVersion, variables, schema, retryPolicy, limiter } = params;
  const requiresApiKey = params.requiresApiKey ?? true;

  if (requiresApiKey && !apiKey) {
    throw new AIProviderError(`${handler.name}: missing API key for ${promptId}`, "PROVIDER_ERROR");
  }

  const prompt = promptRegistry.getVersion(promptId, promptVersion);
  const userPrompt = renderTemplate(prompt.template, variables);

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
          signal: AbortSignal.timeout(600_000),
        });

        if (!response.ok) {
          const rawText = await response.text().catch(() => "");
          throw new AIProviderError(
            `${handler.name} error: ${response.status} ${rawText}`,
            "PROVIDER_ERROR",
            response.status,
            response.status === 429
              ? extractRetryAfterMs(rawText) ?? parseRetryAfterHeader(response.headers.get("retry-after"))
              : undefined,
          );
        }

        const raw = await response.json();
        const { content, usage } = handler.parseResponse(raw);
        if (!content) {
          throw new AIProviderError(`${handler.name} returned empty content`, "SCHEMA_INVALID");
        }

        const output = schema.parse(safeParseJson(content));
        calculateAICost(handler.model, usage.promptTokens, usage.completionTokens);

        return {
          output,
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

/**
 * Gemini trả 429 free-tier với `RetryInfo.retryDelay` dạng "21s" (hoặc "1.5s")
 * nằm trong body JSON, không phải HTTP header. Parse ra ms để retry policy
 * coi đó là rate-limit tạm thời thay vì quota vĩnh viễn.
 */
function extractRetryAfterMs(rawText: string): number | undefined {
  const retryDelay = /"retryDelay"\s*:\s*"([^"]+)"/.exec(rawText)?.[1];
  if (!retryDelay) return undefined;
  const seconds = Number.parseFloat(retryDelay.replace(/s$/, ""));
  if (Number.isNaN(seconds) || seconds <= 0) return undefined;
  return Math.ceil(seconds * 1000);
}

/** Parse HTTP `Retry-After: 30` hoặc `Retry-After: date`. */
function parseRetryAfterHeader(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number.parseInt(header, 10);
  if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1000;
  const ms = Date.parse(header);
  if (!Number.isNaN(ms) && ms > Date.now()) return ms - Date.now();
  return undefined;
}

/**
 * Parse JSON từ output model, chịu được:
 * 1. Markdown code fence (```json ... ```)
 * 2. Khoảng trắng/dòng thừa trước-sau
 * 3. Response bị cắt giữa chừng (thiếu dấu đóng) — tự sửa bằng cách đóng lại
 *    chuỗi/array/object còn dở rồi thử parse từng cấp.
 */
function safeParseJson(rawText: string): unknown {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  if (!cleaned) throw new Error("Empty JSON content");

  try {
    return JSON.parse(cleaned);
  } catch {
    // Thử sửa truncation: tìm prefix hợp lệ kết thúc bằng `}` (hoặc `]`) với
    // các phần tử array/object chưa đóng được bỏ đi dần.
    let repaired: unknown;
    if (tryRepairJson(cleaned, (v) => ((repaired = v), true))) {
      return repaired;
    }
    throw new Error(`Invalid JSON from provider: ${cleaned.slice(0, 200)}`);
  }
}

/** Thử đóng các cấu trúc JSON còn dở (response bị cắt). */
function tryRepairJson(text: string, onOk: (value: unknown) => boolean): boolean {
  for (let i = text.length; i >= 0; i--) {
    const candidate = text.slice(0, i) + closeOpenStructures(text.slice(0, i));
    try {
      onOk(JSON.parse(candidate));
      return true;
    } catch {
      // tiếp tục thử
    }
  }
  return false;
}

/** Đóng các array/object/string còn mở bằng ký tự phù hợp (thứ tự ngược). */
function closeOpenStructures(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      stack.push("}");
    } else if (ch === "[") {
      stack.push("]");
    } else if (ch === "}" || ch === "]") {
      stack.pop();
    }
  }
  return stack.reverse().join("");
}
