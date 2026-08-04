"use client";

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  DRAFT: { label: "Nháp", bgColor: "bg-gray-500/10", textColor: "text-gray-600 dark:text-gray-400" },
  WAITING_REVIEW: { label: "Chờ duyệt", bgColor: "bg-yellow-500/10", textColor: "text-yellow-700 dark:text-yellow-400" },
  APPROVED: { label: "Đã duyệt", bgColor: "bg-emerald-500/10", textColor: "text-emerald-700 dark:text-emerald-400" },
  REJECTED: { label: "Từ chối", bgColor: "bg-red-500/10", textColor: "text-red-700 dark:text-red-400" },
  NEEDS_REANALYSIS: { label: "Cần phân tích lại", bgColor: "bg-orange-500/10", textColor: "text-orange-700 dark:text-orange-400" },
  ARCHIVED: { label: "Đã lưu trữ", bgColor: "bg-gray-500/10", textColor: "text-gray-500 dark:text-gray-400" },
};

const ORIGIN_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  OBSERVED: { label: "Quan sát", bgColor: "bg-blue-500/10", textColor: "text-blue-600 dark:text-blue-400" },
  INFERRED: { label: "Suy luận", bgColor: "bg-purple-500/10", textColor: "text-purple-600 dark:text-purple-400" },
  ASSUMED: { label: "Giả định", bgColor: "bg-indigo-500/10", textColor: "text-indigo-600 dark:text-indigo-400" },
};

interface InsightStatusBadgeProps {
  status?: string;
  className?: string;
}

interface InsightOriginBadgeProps {
  origin?: string;
  className?: string;
}

export function InsightStatusBadge({ status = "DRAFT", className = "" }: InsightStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.label}
    </span>
  );
}

export function InsightOriginBadge({ origin = "OBSERVED", className = "" }: InsightOriginBadgeProps) {
  const config = ORIGIN_CONFIG[origin];
  if (!config) return null;

  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority?: number;
  className?: string;
}

export function PriorityBadge({ priority = 0, className = "" }: PriorityBadgeProps) {
  const level = priority >= 8 ? "HIGH" : priority >= 5 ? "MEDIUM" : "LOW";
  const colors: Record<"HIGH" | "MEDIUM" | "LOW", { label: string; bgColor: string; textColor: string }> = {
    HIGH: { label: "Cao", bgColor: "bg-red-500/10", textColor: "text-red-700 dark:text-red-400" },
    MEDIUM: { label: "Trung bình", bgColor: "bg-amber-500/10", textColor: "text-amber-700 dark:text-amber-400" },
    LOW: { label: "Thấp", bgColor: "bg-green-500/10", textColor: "text-green-700 dark:text-green-400" },
  };

  const config = colors[level] || colors.MEDIUM;
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.label}
    </span>
  );
}

interface ConfidenceScoreProps {
  score?: number | null;
  className?: string;
}

export function ConfidenceScore({ score = 0, className = "" }: ConfidenceScoreProps) {
  const percentage = Math.min(100, Math.max(0, score || 0));
  let color = "bg-red-500";
  let textColor = "text-red-600 dark:text-red-400";

  if (percentage >= 75) {
    color = "bg-emerald-500";
    textColor = "text-emerald-600 dark:text-emerald-400";
  } else if (percentage >= 50) {
    color = "bg-amber-500";
    textColor = "text-amber-600 dark:text-amber-400";
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Độ tin cậy</span>
        <span className={`text-xs font-semibold ${textColor}`}>{percentage}%</span>
      </div>
      <div className="w-full bg-muted-foreground/10 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
