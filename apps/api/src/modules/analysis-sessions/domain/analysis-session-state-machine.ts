import { AnalysisSessionStatus } from "./analysis-session.types";

/**
 * Sơ đồ chuyển trạng thái — đúng mermaid ở mục 4 tài liệu.
 * Đây là NGUỒN CHÂN LÝ DUY NHẤT cho mọi transition hợp lệ. Use case và
 * PrismaRepository đều phải đi qua đây, không tự ý viết điều kiện chuyển
 * trạng thái ở nơi khác — tránh hai chỗ code lệch nhau theo thời gian.
 *
 * Giai đoạn 1 chỉ HIỆN THỰC các transition: DRAFT->DATA_COLLECTION, ->ARCHIVED,
 * DATA_COLLECTION->ARCHIVED, ->COMPLETED (đóng session sớm), COMPLETED->ARCHIVED.
 * Các transition còn lại (PROCESSING, ANALYZING, INSIGHT_REVIEW, STRATEGY_BUILDING)
 * đã khai báo đủ trong sơ đồ để không phải sửa lại file này ở Giai đoạn 2–5,
 * nhưng use case tương ứng (start-processing, v.v.) sẽ được thêm ở giai đoạn đó.
 */
const TRANSITIONS: Record<AnalysisSessionStatus, AnalysisSessionStatus[]> = {
  DRAFT: ["DATA_COLLECTION", "ARCHIVED"],
  DATA_COLLECTION: ["PROCESSING", "ARCHIVED", "COMPLETED"],
  PROCESSING: ["ANALYZING"],
  ANALYZING: ["INSIGHT_REVIEW"],
  INSIGHT_REVIEW: ["STRATEGY_BUILDING"],
  STRATEGY_BUILDING: ["COMPLETED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [], // trạng thái kết thúc, chỉ đọc — không có transition đi ra
};

export class AnalysisSessionStateMachine {
  static canTransition(from: AnalysisSessionStatus, to: AnalysisSessionStatus): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }

  static assertCanTransition(from: AnalysisSessionStatus, to: AnalysisSessionStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(`Không thể chuyển trạng thái từ ${from} sang ${to}`);
    }
  }

  /** true nếu session đang ở trạng thái chỉ đọc, không nhận thêm dữ liệu/chỉnh sửa. */
  static isReadOnly(status: AnalysisSessionStatus): boolean {
    return status === "ARCHIVED";
  }

  /** COMPLETED vẫn xem/xuất được nhưng không nhận thêm dữ liệu mới (đúng mục 4). */
  static acceptsNewData(status: AnalysisSessionStatus): boolean {
    return status !== "COMPLETED" && status !== "ARCHIVED";
  }
}
