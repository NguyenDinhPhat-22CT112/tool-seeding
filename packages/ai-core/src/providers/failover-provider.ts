import type {
  AIProvider,
  AnalyzeFeedbackInput,
  AnalyzeFeedbackResult,
  GenerateInsightsInput,
  GenerateInsightsResult,
  GenerateStrategyInput,
  GenerateStrategyResult,
} from "../ai-provider.interface";
import { AIProviderError } from "../ai-provider.interface";

type MethodName = "analyzeFeedback" | "generateInsights" | "generateStrategy";

/**
 * Wrap nhiều provider (VD nhiều Gemini API key) — khi provider hiện tại gặp
 * lỗi 429 (hết quota, không có retryAfterMs) thì tự chuyển sang provider kế.
 * Các lỗi khác (schema, network...) được truyền thẳng, không failover.
 */
export function createFailoverProvider(providers: AIProvider[]): AIProvider {
  if (providers.length === 0) {
    throw new Error("createFailoverProvider requires at least 1 provider");
  }
  if (providers.length === 1) {
    return providers[0]!;
  }

  let cursor = 0;
  const disabled = new Set<number>();

  async function run<T>(method: MethodName, input: unknown): Promise<T> {
    const candidates = Array.from({ length: providers.length }, (_, i) => i)
      .filter((i) => !disabled.has(i))
      .sort((a, b) => {
        const ra = (a - cursor + providers.length) % providers.length;
        const rb = (b - cursor + providers.length) % providers.length;
        return ra - rb;
      });
    let lastError: unknown;

    for (const index of candidates) {
      try {
        const provider = providers[index]!;
        const result = await (provider[method] as (i: unknown) => Promise<T>)(input);
        cursor = index;
        return result;
      } catch (error) {
        if (error instanceof AIProviderError && error.httpStatus === 429 && !error.retryAfterMs) {
          disabled.add(index);
          lastError = error;
          cursor = (index + 1) % providers.length;
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new AIProviderError("All AI providers failed", "PROVIDER_ERROR");
  }

  return {
    name: `failover(${providers.map((p) => p.name).join(",")})`,
    analyzeFeedback(input: AnalyzeFeedbackInput) {
      return run<AnalyzeFeedbackResult>("analyzeFeedback", input);
    },
    generateInsights(input: GenerateInsightsInput) {
      return run<GenerateInsightsResult>("generateInsights", input);
    },
    generateStrategy(input: GenerateStrategyInput) {
      return run<GenerateStrategyResult>("generateStrategy", input);
    },
  };
}
