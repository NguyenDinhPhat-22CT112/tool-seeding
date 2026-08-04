import type { AIProvider } from "./ai-provider.interface";
import { createOpenAIProvider } from "./providers/openai-provider";
import { createGeminiProvider } from "./providers/gemini-provider";
import { createOllamaProvider } from "./providers/ollama-provider";
import { createDeepSeekProvider } from "./providers/deepseek-provider";
import { createFailoverProvider } from "./providers/failover-provider";

export interface AIProviderConfig {
  provider?: string;
  openai?: { apiKey?: string; model?: string };
  gemini?: { apiKey?: string; apiKeys?: string[]; model?: string };
  ollama?: { baseUrl?: string; model?: string };
  deepseek?: { apiKey?: string; model?: string; baseUrl?: string };
}

export function createAIProvider(config?: AIProviderConfig): AIProvider {
  const providerName = config?.provider ?? "openai";
  if (providerName === "ollama") {
    return createOllamaProvider({
      baseUrl: config?.ollama?.baseUrl,
      model: config?.ollama?.model,
    });
  }
  if (providerName === "deepseek") {
    return createDeepSeekProvider({
      apiKey: config?.deepseek?.apiKey,
      model: config?.deepseek?.model,
      baseUrl: config?.deepseek?.baseUrl,
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
  return createOpenAIProvider({
    apiKey: config?.openai?.apiKey,
    model: config?.openai?.model,
  });
}
