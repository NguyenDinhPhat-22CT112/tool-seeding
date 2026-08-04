import { cn } from "@/lib/utils";
import {
  AnalysisSessionStatus,
  DataSourceStatus,
  FeedbackProcessingStatus,
  ImportBatchStatus,
  InsightStatus,
  StrategyVersionStatus,
  ProcessingJobResponse,
} from "@/lib/types";

type JobStatus = ProcessingJobResponse["status"];
type StatusType =
  | AnalysisSessionStatus
  | DataSourceStatus
  | FeedbackProcessingStatus
  | ImportBatchStatus
  | InsightStatus
  | JobStatus
  | StrategyVersionStatus;

const statusConfig: Record<
  StatusType,
  { bg: string; text: string; label: string }
> = {
  // AnalysisSessionStatus
  DRAFT: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", label: "Nháp" },
  DATA_COLLECTION: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "Thu thập dữ liệu" },
  PROCESSING: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", label: "Đang xử lý" },
  ANALYZING: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", label: "Đang phân tích" },
  INSIGHT_REVIEW: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", label: "Duyệt insight" },
  STRATEGY_BUILDING: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", label: "Xây dựng chiến lược" },
  COMPLETED: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Hoàn tất" },
  ARCHIVED: { bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400", label: "Đã lưu trữ" },

  // DataSourceStatus
  PENDING: { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", label: "Chờ xử lý" },
  FAILED: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", label: "Thất bại" },

  // FeedbackProcessingStatus
  RAW: { bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400", label: "Thô" },
  NORMALIZED: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", label: "Đã chuẩn hoá" },
  DUPLICATE: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", label: "Trùng lặp" },
  EXCLUDED: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", label: "Đã loại" },

  // InsightStatus
  WAITING_REVIEW: { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", label: "Chờ duyệt" },
  APPROVED: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Đã duyệt" },
  REJECTED: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", label: "Từ chối" },
  NEEDS_REANALYSIS: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", label: "Cần phân tích lại" },

  // JobStatus
  RUNNING: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "Đang chạy" },
  CANCELLED: { bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400", label: "Đã huỷ" },

  // ImportBatchStatus
  UPLOADING: { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", label: "Đang tải lên" },
  MAPPING: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "Đang ánh xạ" },
  VALIDATING: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", label: "Đang kiểm tra" },
  IMPORTING: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", label: "Đang nhập" },

  // StrategyVersionStatus
  AI_DRAFT: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", label: "Nháp AI" },
  WAITING_APPROVAL: { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", label: "Chờ duyệt" },
  NEEDS_REVISION: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", label: "Cần chỉnh sửa" },
  LOCKED: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "Đã khoá" },
  SUPERSEDED: { bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400", label: "Đã thay thế" },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  showLabel?: boolean;
}

export function StatusBadge({
  status,
  className,
  showLabel = true,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        className,
      )}
    >
      {showLabel ? config.label : status}
    </span>
  );
}
