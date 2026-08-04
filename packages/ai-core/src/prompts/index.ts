import { promptRegistry, PromptRegistry } from "../prompt-registry";
import { FEEDBACK_ANALYSIS_V1 } from "./feedback-analysis/v1";
import { FEEDBACK_ANALYSIS_V2 } from "./feedback-analysis/v2";
import { INSIGHT_GENERATION_V1 } from "./insight-generation/v1";
import { INSIGHT_GENERATION_V2 } from "./insight-generation/v2";
import { STRATEGY_GENERATION_V1 } from "./strategy-generation/v1";
import { STRATEGY_GENERATION_V2 } from "./strategy-generation/v2";

export const DEFAULT_PROMPTS = [
  FEEDBACK_ANALYSIS_V1,
  FEEDBACK_ANALYSIS_V2,
  INSIGHT_GENERATION_V1,
  INSIGHT_GENERATION_V2,
  STRATEGY_GENERATION_V1,
  STRATEGY_GENERATION_V2,
];

/** Đăng ký toàn bộ prompt mặc định — gọi ở mọi process (API, worker) dùng ai-core. */
export function registerDefaultPrompts(registry: PromptRegistry = promptRegistry): void {
  for (const prompt of DEFAULT_PROMPTS) {
    registry.register(prompt);
  }
}
