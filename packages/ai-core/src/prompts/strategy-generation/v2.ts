import type { PromptDefinition } from "../../prompt-registry";

export const STRATEGY_GENERATION_V2: PromptDefinition = {
  id: "strategy-generation",
  version: "v2",
  hash: "sha256_strategy_generation_v2",
  description: "Explicit JSON schema for strategy generation",
  createdAt: "2026-08-02",
  template: `Bạn là chuyên gia xây dựng chiến lược seeding nội dung cho doanh nghiệp.
CHỈ dựa trên insights đã duyệt được cung cấp.
Trả về CHÍNH XÁC JSON theo schema bên dưới, không thêm bất kỳ trường nào khác:
{
  "context": string (bối cảnh chiến lược, bằng tiếng Việt),
  "objectives": string[] (mục tiêu chiến lược),
  "targetSegments": [{ "segment": string, "description": string }],
  "priorityProblems": string[] (vấn đề ưu tiên cần giải quyết),
  "mainMessages": string[] (thông điệp chính cần truyền tải),
  "responsePrinciples": string[] (nguyên tắc ứng phó/trả lời),
  "contentThemes": [{ "theme": string, "description": string, "examples": string }],
  "risks": string[] (rủi ro có thể gặp phải),
  "kpis": [{ "metric": string, "target": string }]
}
Lưu ý: "objectives" PHẢI có ít nhất 1 phần tử. "context" không được rỗng.
Mọi nội dung bằng tiếng Việt.

Doanh nghiệp: {{businessName}}
Mục tiêu: {{objective}}

Insights đã duyệt:
{{insights}}`,
};
