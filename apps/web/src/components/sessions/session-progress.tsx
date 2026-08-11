import { AnalysisSessionStatus } from "@/lib/types";
import { CheckCircle2, Circle } from "lucide-react";

const WORKFLOW_STAGES: AnalysisSessionStatus[] = [
  "DRAFT",
  "DATA_COLLECTION",
  "PROCESSING",
  "ANALYZING",
  "INSIGHT_REVIEW",
  "STRATEGY_BUILDING",
  "COMPLETED",
];

const STAGE_LABELS: Record<AnalysisSessionStatus, string> = {
  DRAFT: "Nháp",
  DATA_COLLECTION: "Thu thập",
  PROCESSING: "Xử lý",
  ANALYZING: "Phân tích",
  INSIGHT_REVIEW: "Duyệt",
  STRATEGY_BUILDING: "Chiến lược",
  COMPLETED: "Hoàn tất",
  ARCHIVED: "Đã lưu trữ",
};

export interface SessionProgressProps {
  status: AnalysisSessionStatus;
  className?: string;
}

export function SessionProgress({ status, className = "" }: SessionProgressProps) {
  const currentIndex = WORKFLOW_STAGES.indexOf(status);
  const isArchived = status === "ARCHIVED";

  if (isArchived) {
    return (
      <div
        className={`flex items-center justify-center px-3 py-2 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 text-sm font-medium ${className}`}
      >
        Đã lưu trữ
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {WORKFLOW_STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={stage} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : isCurrent ? (
                <Circle className="w-5 h-5 text-blue-500 fill-blue-500" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground/30" />
              )}
              <span
                className={`text-xs mt-1 font-medium whitespace-nowrap ${
                  isCurrent
                    ? "text-blue-600 dark:text-blue-400"
                    : isCompleted
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground/50"
                }`}
              >
                {STAGE_LABELS[stage]}
              </span>
            </div>
            {index < WORKFLOW_STAGES.length - 1 && (
              <div
                className={`h-0.5 w-3 ${
                  isCompleted || isCurrent ? "bg-emerald-500" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function getNextAction(status: AnalysisSessionStatus): string {
  const actions: Record<AnalysisSessionStatus, string> = {
    DRAFT: "Bắt đầu giai đoạn thu thập đánh giá",
    DATA_COLLECTION: "Xử lý dữ liệu đã thu thập",
    PROCESSING: "Đang xử lý dữ liệu",
    ANALYZING: "Tạo insights",
    INSIGHT_REVIEW: "Tạo chiến lược",
    STRATEGY_BUILDING: "Hoàn tất đợt phân tích",
    COMPLETED: "Đã hoàn thành phân tích",
    ARCHIVED: "Không còn thao tác",
  };
  return actions[status] || "Không xác định";
}
