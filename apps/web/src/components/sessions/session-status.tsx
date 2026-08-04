import { AnalysisSessionStatus } from "@/lib/types";

const STATUS_CONFIG: Record<AnalysisSessionStatus, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: "Nháp", color: "text-gray-600 dark:text-gray-400", bgColor: "bg-gray-500/10" },
  DATA_COLLECTION: { label: "Thu thập dữ liệu", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" },
  PROCESSING: { label: "Đang xử lý", color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-500/10" },
  ANALYZING: { label: "Đang phân tích", color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-500/10" },
  INSIGHT_REVIEW: { label: "Duyệt insight", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-500/10" },
  STRATEGY_BUILDING: { label: "Xây dựng chiến lược", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" },
  COMPLETED: { label: "Hoàn tất", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10" },
  ARCHIVED: { label: "Đã lưu trữ", color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-500/10" },
};

export interface SessionStatusBadgeProps {
  status: AnalysisSessionStatus;
  className?: string;
}

export function SessionStatusBadge({ status, className = "" }: SessionStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
}

export function getSessionStatusColor(status: AnalysisSessionStatus): string {
  return STATUS_CONFIG[status]?.bgColor || "bg-gray-500/10";
}

export function getSessionStatusTextColor(status: AnalysisSessionStatus): string {
  return STATUS_CONFIG[status]?.color || "text-gray-600";
}
