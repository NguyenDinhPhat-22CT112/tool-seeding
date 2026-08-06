import type { PromptDefinition } from "../../prompt-registry";

export const STRATEGY_GENERATION_V3: PromptDefinition = {
  id: "strategy-generation",
  version: "v3",
  hash: "sha256_strategy_generation_v3",
  description: "Compact prompt, token-optimized",
  createdAt: "2026-08-05",
  template: `Bạn là chuyên gia xây dựng chiến lược seeding nội dung. Chỉ dựa trên insights đã duyệt được cung cấp.
Trả về JSON đúng schema, không markdown, không thêm trường:
{"context":"...","objectives":["..."],"targetSegments":[{"segment":"...","description":"..."}],"priorityProblems":["..."],"mainMessages":["..."],"responsePrinciples":["..."],"contentThemes":[{"theme":"...","description":"...","examples":"..."}],"risks":["..."],"kpis":[{"metric":"...","target":"..."}]}
"objectives" tối thiểu 1 phần tử, "context" không rỗng. Nội dung bằng tiếng Việt.
Doanh nghiệp: {{businessName}} | Mục tiêu: {{objective}}
Insights đã duyệt:
{{insights}}`,
};
