import type { AIProvider } from "./ai-provider.interface";
import { createOpenAIProvider } from "./providers/openai-provider";
import { createGeminiProvider } from "./providers/gemini-provider";

export interface AIProviderConfig {
  provider?: string;
  openai?: { apiKey?: string; model?: string };
  gemini?: { apiKey?: string; model?: string };
}

export function createAIProvider(config?: AIProviderConfig): AIProvider {
  const providerName = config?.provider ?? "openai";
  if (providerName === "gemini") {
    return createGeminiProvider({
      apiKey: config?.gemini?.apiKey,
      model: config?.gemini?.model,
    });
  }
  return createOpenAIProvider({
    apiKey: config?.openai?.apiKey,
    model: config?.openai?.model,
  });
}
