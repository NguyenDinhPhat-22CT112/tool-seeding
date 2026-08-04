import type { PromptDefinition } from "../../prompt-registry";

export const INSIGHT_GENERATION_V2: PromptDefinition = {
  id: "insight-generation",
  version: "v2",
  hash: "sha256_insight_generation_v2",
  description: "Explicit JSON schema for insight generation",
  createdAt: "2026-08-02",
  template: `Bạn là chuyên gia tổng hợp insight từ phân tích feedback khách hàng.
CHỈ phân tích dữ liệu phân tích feedback được cung cấp.
Trả về CHÍNH XÁC JSON theo schema bên dưới, không thêm bất kỳ trường nào khác:
{
  "insights": [
    {
      "title": string (ngắn gọn, nêu bật insight),
      "description": string (giải thích chi tiết, bằng tiếng Việt),
      "priority": number (1-5, 1 thấp nhất, 5 khẩn cấp nhất),
      "confidence": number (0-1),
      "origin": "OBSERVED" | "INFERRED" | "ASSUMED",
      "frequencyCount": number (số feedback liên quan),
      "frequencyPct": number (phần trăm trên tổng feedback, 0-100),
      "evidence": [{ "feedbackId": string, "excerpt": string, "relevance": number (0-1) }]
    }
  ]
}
Lưu ý: mỗi phần tử của "insights" PHẢI có đủ tất cả các trường trên.
"evidence" là array, có thể rỗng. "feedbackId" phải là id của feedback trong dữ liệu được cung cấp.

Doanh nghiệp: {{businessName}}
Mục tiêu: {{objective}}

Phân tích feedback:
{{analyses}}`,
};
