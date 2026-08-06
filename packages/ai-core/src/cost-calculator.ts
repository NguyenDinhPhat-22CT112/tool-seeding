const PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.0-flash": { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
  "llama-3.3-70b-versatile": { input: 0.59 / 1_000_000, output: 0.79 / 1_000_000 },
  "openai/gpt-oss-20b": { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
};

export function calculateAICost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = PRICING[model];
  if (!pricing) return 0;
  return promptTokens * pricing.input + completionTokens * pricing.output;
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
