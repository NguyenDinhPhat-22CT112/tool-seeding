import type { PromptDefinition } from "../prompt-registry";

export const INSIGHT_GENERATION_V1: PromptDefinition = {
  id: "insight-generation",
  version: "v1",
  hash: "sha256_insight_generation_v1",
  description: "Initial insight generation from feedback analyses",
  createdAt: "2026-07-15",
  template: `Bạn là chuyên gia tổng hợp insight từ phân tích feedback.
Trả về JSON theo schema quy định.

Doanh nghiệp: {{businessName}}
Mục tiêu: {{objective}}

Phân tích feedback:
{{analyses}}`,
};
