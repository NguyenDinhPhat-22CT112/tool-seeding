"use client";

import { Button } from "@/components/ui/button";
import { AnalysisSessionStatus } from "@/lib/types";

interface SessionActionsProps {
  status: AnalysisSessionStatus;
  feedbackCount?: number;
  onStartDataCollection?: () => void;
  onProcess?: () => void;
  onGenerateInsights?: () => void;
  onGenerateStrategy?: () => void;
  onComplete?: () => void;
  onArchive?: () => void;
  isLoading?: boolean;
}

const STAGE_ACTIONS: Record<
  AnalysisSessionStatus,
  { label: string; handler: keyof Omit<SessionActionsProps, "status" | "isLoading" | "feedbackCount">; stageLabel: string } | null
> = {
  DRAFT: { label: "Thu thập đánh giá ngay", handler: "onStartDataCollection", stageLabel: "Giai đoạn 1/6" },
  DATA_COLLECTION: { label: "Xử lý dữ liệu", handler: "onProcess", stageLabel: "Giai đoạn 2/6" },
  PROCESSING: null,
  ANALYZING: { label: "Tạo insights", handler: "onGenerateInsights", stageLabel: "Giai đoạn 4/6" },
  INSIGHT_REVIEW: { label: "Tạo chiến lược", handler: "onGenerateStrategy", stageLabel: "Giai đoạn 5/6" },
  STRATEGY_BUILDING: { label: "Hoàn tất đợt phân tích", handler: "onComplete", stageLabel: "Giai đoạn 6/6" },
  COMPLETED: { label: "Lưu trữ", handler: "onArchive", stageLabel: "Hoàn tất" },
  ARCHIVED: null,
};

export function SessionActions({
  status,
  feedbackCount = 0,
  onStartDataCollection,
  onProcess,
  onGenerateInsights,
  onGenerateStrategy,
  onComplete,
  onArchive,
  isLoading,
}: SessionActionsProps) {
  if (status === "ARCHIVED") {
    return (
      <div className="text-sm text-muted-foreground">
        Đợt phân tích đã lưu trữ, không còn thao tác
      </div>
    );
  }

  if (status === "PROCESSING") {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
        <p className="text-sm font-medium text-foreground">Pipeline đang xử lý dữ liệu...</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Hệ thống đang chạy các công việc (chuẩn hoá, loại trùng, phân tích AI). Xem tab &quot;Công việc&quot; để theo dõi tiến độ.
        </p>
      </div>
    );
  }

  const action = STAGE_ACTIONS[status];
  if (!action) return null;

  const handlers: Record<string, (() => void) | undefined> = {
    onStartDataCollection,
    onProcess,
    onGenerateInsights,
    onGenerateStrategy,
    onComplete,
    onArchive,
  };

  const handler = handlers[action.handler];

  // Bước 2 (DATA_COLLECTION) = thu thập feedback. Chặn xử lý khi chưa có dữ liệu.
  const isDataCollection = status === "DATA_COLLECTION";
  const blockedNoData = isDataCollection && feedbackCount === 0;

  return (
    <div className="flex flex-col gap-2">
      {blockedNoData && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            Chưa có dữ liệu đánh giá nào
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Hãy vào tab &quot;Thu thập đánh giá&quot; bên dưới, bấm <b>Cào đánh giá</b> cho địa điểm
            của doanh nghiệp để thu về feedback trước khi xử lý.
          </p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{action.stageLabel}</span>
        {isDataCollection && (
          <span className="text-xs text-muted-foreground">
            ({feedbackCount} phản hồi đã thu thập)
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handler}
          disabled={isLoading || !handler || blockedNoData}
          className="flex-1"
        >
          {isLoading ? "Đang xử lý..." : action.label}
        </Button>
      </div>
    </div>
  );
}
