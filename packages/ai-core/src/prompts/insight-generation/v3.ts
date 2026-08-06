import type { PromptDefinition } from "../../prompt-registry";

export const INSIGHT_GENERATION_V3: PromptDefinition = {
  id: "insight-generation",
  version: "v3",
  hash: "sha256_insight_generation_v3",
  description: "Compact prompt, token-optimized",
  createdAt: "2026-08-05",
  template: `Bạn là chuyên gia tổng hợp insight từ feedback đã phân tích. Chỉ dựa trên dữ liệu được cung cấp.
Trả về JSON đúng schema, không markdown, không thêm trường:
{"insights":[{"title":"...","description":"...","priority":1..5,"confidence":0..1,"origin":"OBSERVED|INFERRED|ASSUMED","frequencyCount":n,"frequencyPct":0..100,"evidence":[{"feedbackId":"...","excerpt":"...","relevance":0..1}]}]}
Mỗi insight PHẢI đủ mọi trường. "evidence" có thể rỗng. "feedbackId" phải khớp dữ liệu cung cấp. Nội dung bằng tiếng Việt.
Doanh nghiệp: {{businessName}} | Mục tiêu: {{objective}}
Dữ liệu phân tích:
{{analyses}}`,
};
