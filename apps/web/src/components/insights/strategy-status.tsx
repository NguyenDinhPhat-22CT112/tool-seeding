"use client";

const STRATEGY_STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  AI_DRAFT: { label: "Nháp AI", bgColor: "bg-slate-500/10", textColor: "text-slate-700 dark:text-slate-400" },
  DRAFT: { label: "Nháp", bgColor: "bg-gray-500/10", textColor: "text-gray-700 dark:text-gray-400" },
  WAITING_APPROVAL: { label: "Chờ duyệt", bgColor: "bg-yellow-500/10", textColor: "text-yellow-700 dark:text-yellow-400" },
  NEEDS_REVISION: { label: "Cần chỉnh sửa", bgColor: "bg-orange-500/10", textColor: "text-orange-700 dark:text-orange-400" },
  APPROVED: { label: "Đã duyệt", bgColor: "bg-emerald-500/10", textColor: "text-emerald-700 dark:text-emerald-400" },
  LOCKED: { label: "Đã khoá", bgColor: "bg-blue-500/10", textColor: "text-blue-700 dark:text-blue-400" },
  SUPERSEDED: { label: "Đã thay thế", bgColor: "bg-neutral-500/10", textColor: "text-neutral-700 dark:text-neutral-400" },
  ARCHIVED: { label: "Đã lưu trữ", bgColor: "bg-neutral-500/10", textColor: "text-neutral-700 dark:text-neutral-400" },
};

interface StrategyStatusBadgeProps {
  status?: string;
  className?: string;
}

export function StrategyStatusBadge({ status = "AI_DRAFT", className = "" }: StrategyStatusBadgeProps) {
  const config = STRATEGY_STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      {config.label}
    </span>
  );
}

export function getStrategyStatusColor(status?: string): string {
  return STRATEGY_STATUS_CONFIG[status || "AI_DRAFT"]?.bgColor || "bg-gray-500/10";
}

export function getStrategyStatusLabel(status?: string): string {
  return STRATEGY_STATUS_CONFIG[status || "AI_DRAFT"]?.label || status || "Không xác định";
}
