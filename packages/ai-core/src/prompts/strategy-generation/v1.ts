import type { PromptDefinition } from "../../prompt-registry";

export const STRATEGY_GENERATION_V1: PromptDefinition = {
  id: "strategy-generation",
  version: "v1",
  hash: "sha256_strategy_generation_v1",
  description: "Initial strategy generation from approved insights",
  createdAt: "2026-07-15",
  template: `Bạn là chuyên gia xây dựng chiến lược seeding nội dung.
Trả về JSON theo schema quy định.

Doanh nghiệp: {{businessName}}
Mục tiêu: {{objective}}

Insights đã duyệt:
{{insights}}`,
};
