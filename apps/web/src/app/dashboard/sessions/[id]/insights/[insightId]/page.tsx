"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useFetchInsight,
  useApproveInsight,
  useRejectInsight,
  useRequestReanalysis,
  useSubmitInsight,
  useArchiveInsight,
} from "@/hooks/use-insights";
import { useFetchSession } from "@/hooks/use-sessions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/common/skeleton";
import { DeleteConfirmDialog } from "@/components/business/delete-dialogs";
import { InsightStatusBadge, InsightOriginBadge, PriorityBadge, ConfidenceScore } from "@/components/insights/insight-status";
import { ArrowLeft, Check, X, RotateCcw, Send, Archive } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  SUBMITTED: "Gửi duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  EDITED: "Đã chỉnh sửa",
  REANALYSIS_REQUESTED: "Yêu cầu phân tích lại",
  MERGED: "Đã gộp",
  SPLIT: "Đã tách",
  ARCHIVED: "Đã lưu trữ",
};

export default function InsightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const insightId = params.insightId as string;

  const [comment, setComment] = useState("");
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const { data: sessionData } = useFetchSession(sessionId);
  const { data: insight, isLoading } = useFetchInsight(sessionId, insightId);
  const approveMutation = useApproveInsight(sessionId, insightId);
  const rejectMutation = useRejectInsight(sessionId, insightId);
  const reanalysisMutation = useRequestReanalysis(sessionId, insightId);
  const submitMutation = useSubmitInsight(sessionId, insightId);
  const archiveMutation = useArchiveInsight(sessionId);

  const canManageInsights =
    sessionData?.status === "INSIGHT_REVIEW" ||
    sessionData?.status === "STRATEGY_BUILDING";

  const isMutating =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    reanalysisMutation.isPending ||
    submitMutation.isPending ||
    archiveMutation.isPending;

  const handleAction = async (action: () => Promise<unknown>) => {
    await action();
    setComment("");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Skeleton className="h-8 w-1/2" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy insight</p>
        <Button className="mt-4" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  const inputClass =
    "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  const canSubmit = insight.status === "DRAFT";
  const canReview = insight.status === "WAITING_REVIEW";
  const canArchive = insight.status !== "ARCHIVED" && canManageInsights;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{insight.title}</h1>
        </div>
        <InsightStatusBadge status={insight.status} />
      </div>

      <div className="border border-border rounded-lg p-6 space-y-4">
        {insight.description && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Mô tả</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{insight.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Nguồn</p>
            <InsightOriginBadge origin={insight.origin} />
          </div>
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Ưu tiên</p>
            <PriorityBadge priority={insight.priority} />
          </div>
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Tần suất</p>
            <p className="text-sm font-medium text-foreground">
              {insight.frequencyCount} ({insight.frequencyPct}%)
            </p>
          </div>
        </div>

        <ConfidenceScore score={insight.confidence} />
      </div>

      {insight.evidences.length > 0 && (
        <div className="border border-border rounded-lg p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Bằng chứng</h2>
          {insight.evidences.map((evidence) => (
            <div key={evidence.id} className="border border-border rounded-lg p-3">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {evidence.excerpt || "Không có trích đoạn"}
              </p>
              {evidence.relevance != null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Mức liên quan: {evidence.relevance}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {insight.reviewLogs.length > 0 && (
        <div className="border border-border rounded-lg p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Lịch sử duyệt</h2>
          {insight.reviewLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3">
              <span className="text-xs font-medium text-foreground px-2 py-0.5 rounded-full bg-muted">
                {ACTION_LABELS[log.action] || log.action}
              </span>
              <div className="min-w-0">
                {log.comment && (
                  <p className="text-sm text-muted-foreground">{log.comment}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {canSubmit && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              void handleAction(() => submitMutation.mutateAsync());
            }}
            disabled={isMutating}
          >
            <Send />
            Gửi duyệt
          </Button>
        </div>
      )}

      {canReview && (
        <div className="border border-border rounded-lg p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Duyệt insight</h2>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Nhập nhận xét (không bắt buộc)"
            rows={3}
            className={`${inputClass} resize-none`}
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                void handleAction(() =>
                  approveMutation.mutateAsync({ comment: comment || null }),
                );
              }}
              disabled={isMutating}
            >
              <Check />
              Duyệt
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-red-400 hover:text-red-300"
              onClick={() => {
                void handleAction(() =>
                  rejectMutation.mutateAsync({ comment: comment || null }),
                );
              }}
              disabled={isMutating}
            >
              <X />
              Từ chối
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                void handleAction(() =>
                  reanalysisMutation.mutateAsync({ comment: comment || null }),
                );
              }}
              disabled={isMutating}
            >
              <RotateCcw />
              Yêu cầu phân tích lại
            </Button>
          </div>
        </div>
      )}

      {canArchive && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setShowArchiveDialog(true)} disabled={isMutating}>
            <Archive />
            Lưu trữ
          </Button>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={showArchiveDialog}
        title="Lưu trữ insight"
        description={`Bạn có chắc chắn muốn lưu trữ insight "${insight.title}"?`}
        isLoading={archiveMutation.isPending}
        onConfirm={async () => {
          await archiveMutation.mutateAsync(insightId);
          setShowArchiveDialog(false);
        }}
        onCancel={() => setShowArchiveDialog(false)}
      />
    </div>
  );
}
