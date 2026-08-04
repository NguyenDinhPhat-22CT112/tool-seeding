import { InsightStatus } from "./insight.types";

/**
 * Sơ đồ chuyển trạng thái Insight — NGUỒN CHÂN LÝ DUY NHẤT cho mọi transition hợp lệ.
 * Service và repository đều phải đi qua đây, không tự ý viết điều kiện chuyển
 * trạng thái ở nơi khác — tránh hai chỗ code lệch nhau theo thời gian.
 *
 * Ngữ nghĩa:
 * - DRAFT            → WAITING_REVIEW (submit), ARCHIVED
 * - WAITING_REVIEW   → APPROVED, REJECTED, NEEDS_REANALYSIS, ARCHIVED
 * - APPROVED         → NEEDS_REANALYSIS (phát hiện sai khi dựng strategy), ARCHIVED
 * - REJECTED         → WAITING_REVIEW (sửa lại rồi submit), NEEDS_REANALYSIS, DRAFT, ARCHIVED
 * - NEEDS_REANALYSIS → WAITING_REVIEW (submit bản mới), DRAFT (edit tại chỗ), ARCHIVED
 * - ARCHIVED         → trạng thái kết thúc, chỉ đọc
 */
const TRANSITIONS: Record<InsightStatus, InsightStatus[]> = {
  DRAFT: ["WAITING_REVIEW", "ARCHIVED"],
  WAITING_REVIEW: ["APPROVED", "REJECTED", "NEEDS_REANALYSIS", "ARCHIVED"],
  APPROVED: ["NEEDS_REANALYSIS", "ARCHIVED"],
  REJECTED: ["WAITING_REVIEW", "NEEDS_REANALYSIS", "DRAFT", "ARCHIVED"],
  NEEDS_REANALYSIS: ["WAITING_REVIEW", "DRAFT", "ARCHIVED"],
  ARCHIVED: [], // trạng thái kết thúc, chỉ đọc — không có transition đi ra
};

export class InsightStateMachine {
  static canTransition(from: InsightStatus, to: InsightStatus): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }

  static assertCanTransition(from: InsightStatus, to: InsightStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Không thể chuyển trạng thái từ ${from} sang ${to}`);
    }
  }

  /** Nội dung chỉ được sửa khi insight đang DRAFT hoặc bị trả về để phân tích lại. */
  static isEditable(status: InsightStatus): boolean {
    return status === "DRAFT" || status === "NEEDS_REANALYSIS";
  }

  /** Chỉ insight đang chờ duyệt mới approve/reject/trả lại. */
  static isReviewable(status: InsightStatus): boolean {
    return status === "WAITING_REVIEW";
  }

  /** Insight còn "sống" (không archive) để merge/split. Điều kiện parent được xử lý ở service. */
  static isActive(status: InsightStatus): boolean {
    return status !== "ARCHIVED";
  }
}
