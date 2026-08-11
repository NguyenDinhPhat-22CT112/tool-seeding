import { ContentStatus } from "./content.types";

/**
 * Sơ đồ chuyển trạng thái Content — NGUỒN CHÂN LÝ DUY NHẤT cho mọi transition.
 *
 * Ngữ nghĩa:
 * - DRAFT            → WAITING_APPROVAL (submit duyệt), ARCHIVED
 * - WAITING_APPROVAL → APPROVED, NEEDS_REVISION (bắt buộc lý do), ARCHIVED
 * - NEEDS_REVISION   → WAITING_APPROVAL (sửa xong gửi lại), ARCHIVED
 * - APPROVED         → LOCKED (khóa chốt), NEEDS_REVISION (phát hiện sai), ARCHIVED
 * - LOCKED           → NEEDS_REVISION (unlock, bắt buộc lý do), ARCHIVED
 * - ARCHIVED         → trạng thái kết thúc, chỉ đọc
 */
const TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ["WAITING_APPROVAL", "ARCHIVED"],
  WAITING_APPROVAL: ["APPROVED", "NEEDS_REVISION", "ARCHIVED"],
  NEEDS_REVISION: ["WAITING_APPROVAL", "ARCHIVED"],
  APPROVED: ["LOCKED", "NEEDS_REVISION", "ARCHIVED"],
  LOCKED: ["NEEDS_REVISION", "ARCHIVED"],
  ARCHIVED: [], // trạng thái kết thúc, chỉ đọc
};

export class ContentStateMachine {
  static canTransition(from: ContentStatus, to: ContentStatus): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }

  static assertCanTransition(from: ContentStatus, to: ContentStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Không thể chuyển trạng thái từ ${from} sang ${to}`);
    }
  }

  /** Nội dung được sửa khi DRAFT / NEEDS_REVISION. */
  static isEditable(status: ContentStatus): boolean {
    return status === "DRAFT" || status === "NEEDS_REVISION";
  }

  /** Nội dung đã chốt / kết thúc — không sửa trực tiếp. */
  static isImmutable(status: ContentStatus): boolean {
    return (
      status === "APPROVED" ||
      status === "LOCKED" ||
      status === "ARCHIVED"
    );
  }

  /** Nội dung còn "sống" (chưa archive). */
  static isActive(status: ContentStatus): boolean {
    return status !== "ARCHIVED";
  }
}
