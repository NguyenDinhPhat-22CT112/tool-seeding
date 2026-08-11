import type { AIProvider } from "./ai-provider.interface";
import { createGeminiProvider } from "./providers/gemini-provider";
import { createGroqProvider } from "./providers/groq-provider";
import { createOpenRouterProvider } from "./providers/openrouter-provider";
import { createFailoverProvider } from "./providers/failover-provider";

export interface AIProviderConfig {
  provider?: string;
  gemini?: { apiKey?: string; apiKeys?: string[]; model?: string };
  groq?: { apiKey?: string; model?: string; baseUrl?: string };
  openrouter?: { apiKey?: string; model?: string; baseUrl?: string };
}

export const SUPPORTED_AI_PROVIDERS = ["groq", "gemini", "openrouter"] as const;

export function createAIProvider(config?: AIProviderConfig): AIProvider {
  const providerName = config?.provider ?? "groq";
  if (providerName === "groq") {
    return createGroqProvider({
      apiKey: config?.groq?.apiKey,
      model: config?.groq?.model,
      baseUrl: config?.groq?.baseUrl,
    });
  }
  if (providerName === "openrouter") {
    return createOpenRouterProvider({
      apiKey: config?.openrouter?.apiKey,
      model: config?.openrouter?.model,
      baseUrl: config?.openrouter?.baseUrl,
    });
  }
  if (providerName === "gemini") {
    const model = config?.gemini?.model;
    const apiKeys = [
      ...(config?.gemini?.apiKeys ?? []),
      ...(config?.gemini?.apiKey ? [config.gemini.apiKey] : []),
    ];
    const providers = apiKeys
      .filter((key) => key && key.trim().length > 0)
      .map((apiKey) => createGeminiProvider({ apiKey, model }));
    if (providers.length === 0) {
      providers.push(createGeminiProvider({ model }));
    }
    return createFailoverProvider(providers);
  }
  throw new Error(
    `Unsupported AI provider: ${providerName}. Supported: ${SUPPORTED_AI_PROVIDERS.join(", ")}`,
  );
}
