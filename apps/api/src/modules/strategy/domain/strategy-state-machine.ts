import { StrategyVersionStatus } from "./strategy.types";

/**
 * Sơ đồ chuyển trạng thái StrategyVersion — NGUỒN CHÂN LÝ DUY NHẤT cho mọi transition.
 * Service phải đi qua đây, không tự ý viết điều kiện chuyển trạng thái ở nơi khác.
 *
 * Ngữ nghĩa:
 * - AI_DRAFT          (AI vừa sinh) → DRAFT (manager bắt đầu chỉnh), WAITING_APPROVAL (submit thẳng), SUPERSEDED, ARCHIVED
 * - DRAFT             → WAITING_APPROVAL (submit duyệt), SUPERSEDED, ARCHIVED
 * - WAITING_APPROVAL  → APPROVED, NEEDS_REVISION (trả sửa, bắt buộc lý do), SUPERSEDED, ARCHIVED
 * - NEEDS_REVISION    → DRAFT (sửa), WAITING_APPROVAL (gửi lại), SUPERSEDED, ARCHIVED
 * - APPROVED          → LOCKED (khóa chốt), NEEDS_REVISION (phát hiện sai), SUPERSEDED (có version mới), ARCHIVED
 * - LOCKED            → SUPERSEDED (version mới thay thế), ARCHIVED
 * - SUPERSEDED        → ARCHIVED
 * - ARCHIVED          → trạng thái kết thúc, chỉ đọc
 */
const TRANSITIONS: Record<StrategyVersionStatus, StrategyVersionStatus[]> = {
  AI_DRAFT: ["DRAFT", "WAITING_APPROVAL", "SUPERSEDED", "ARCHIVED"],
  DRAFT: ["WAITING_APPROVAL", "SUPERSEDED", "ARCHIVED"],
  WAITING_APPROVAL: ["APPROVED", "NEEDS_REVISION", "SUPERSEDED", "ARCHIVED"],
  NEEDS_REVISION: ["DRAFT", "WAITING_APPROVAL", "SUPERSEDED", "ARCHIVED"],
  APPROVED: ["LOCKED", "NEEDS_REVISION", "SUPERSEDED", "ARCHIVED"],
  LOCKED: ["SUPERSEDED", "ARCHIVED"],
  SUPERSEDED: ["ARCHIVED"],
  ARCHIVED: [], // trạng thái kết thúc, chỉ đọc
};

export class StrategyVersionStateMachine {
  static canTransition(
    from: StrategyVersionStatus,
    to: StrategyVersionStatus,
  ): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }

  static assertCanTransition(
    from: StrategyVersionStatus,
    to: StrategyVersionStatus,
  ): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Không thể chuyển trạng thái từ ${from} sang ${to}`);
    }
  }

  /** Nội dung được sửa khi AI_DRAFT / DRAFT / NEEDS_REVISION. */
  static isEditable(status: StrategyVersionStatus): boolean {
    return status === "AI_DRAFT" || status === "DRAFT" || status === "NEEDS_REVISION";
  }

  /** Version đã chốt (APPROVED/LOCKED) hoặc đã hết hiệu lực (SUPERSEDED) hoặc bị archive — không sửa trực tiếp. */
  static isImmutable(status: StrategyVersionStatus): boolean {
    return (
      status === "APPROVED" ||
      status === "LOCKED" ||
      status === "SUPERSEDED" ||
      status === "ARCHIVED"
    );
  }

  /** Version đang "sống" (chưa archive) để xử lý version workflow. */
  static isActive(status: StrategyVersionStatus): boolean {
    return status !== "ARCHIVED";
  }
}
