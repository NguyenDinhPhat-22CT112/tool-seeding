"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useFetchStrategyVersion,
  useSubmitStrategyVersion,
  useApproveStrategyVersion,
  useRejectStrategyVersion,
  useRequestRevision,
  useLockStrategyVersion,
} from "@/hooks/use-strategy";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/common/skeleton";
import { StrategyStatusBadge } from "@/components/insights/strategy-status";
import { ArrowLeft, Check, X, RotateCcw, Send, Lock } from "lucide-react";

export default function StrategyVersionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const versionId = params.versionId as string;

  const [comment, setComment] = useState("");

  const { data: version, isLoading } = useFetchStrategyVersion(sessionId, versionId);
  const submitMutation = useSubmitStrategyVersion(sessionId, versionId);
  const approveMutation = useApproveStrategyVersion(sessionId, versionId);
  const rejectMutation = useRejectStrategyVersion(sessionId, versionId);
  const revisionMutation = useRequestRevision(sessionId, versionId);
  const lockMutation = useLockStrategyVersion(sessionId, versionId);

  const isMutating =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    revisionMutation.isPending ||
    lockMutation.isPending;

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

  if (!version) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy phiên bản chiến lược</p>
        <Button className="mt-4" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  const inputClass =
    "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  const canSubmit = version.status === "DRAFT" || version.status === "AI_DRAFT";
  const canApprove = version.status === "WAITING_APPROVAL";
  const canLock = version.status === "APPROVED";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Phiên bản {version.versionNo}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cập nhật: {new Date(version.updatedAt).toLocaleString("vi-VN")}
          </p>
        </div>
        <StrategyStatusBadge status={version.status} />
      </div>

      {version.context && (
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Bối cảnh</h2>
          <p className="text-sm text-foreground whitespace-pre-wrap">{version.context}</p>
        </div>
      )}

      {version.additionalNotes && (
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Ghi chú bổ sung</h2>
          <p className="text-sm text-foreground whitespace-pre-wrap">{version.additionalNotes}</p>
        </div>
      )}

      {version.objectives.length > 0 && (
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Mục tiêu</h2>
          <ul className="space-y-2">
            {version.objectives.map((objective, index) => (
              <li key={index} className="text-sm text-foreground flex gap-2">
                <span className="text-primary flex-shrink-0">•</span>
                {objective}
              </li>
            ))}
          </ul>
        </div>
      )}

      {version.priorityProblems.length > 0 && (
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Vấn đề ưu tiên</h2>
          <ul className="space-y-2">
            {version.priorityProblems.map((item, index) => (
              <li key={index} className="text-sm text-foreground flex gap-2">
                <span className="text-red-400 flex-shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {version.mainMessages.length > 0 && (
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Thông điệp chính</h2>
          <ul className="space-y-2">
            {version.mainMessages.map((item, index) => (
              <li key={index} className="text-sm text-foreground flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {version.targetSegments.length > 0 && (
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Phân khúc mục tiêu</h2>
          <div className="space-y-3">
            {version.targetSegments.map((segment, index) => (
              <div key={index} className="border border-border rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">{segment.segment}</p>
                <p className="text-sm text-muted-foreground mt-1">{segment.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {version.contentThemes.length > 0 && (
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Chủ đề nội dung</h2>
          <div className="space-y-3">
            {version.contentThemes.map((theme, index) => (
              <div key={index} className="border border-border rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">{theme.theme}</p>
                <p className="text-sm text-muted-foreground mt-1">{theme.description}</p>
                {theme.examples && (
                  <p className="text-sm text-muted-foreground mt-1 italic">{theme.examples}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {version.responsePrinciples.length > 0 && (
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Nguyên tắc phản hồi</h2>
          <ul className="space-y-2">
            {version.responsePrinciples.map((item, index) => (
              <li key={index} className="text-sm text-foreground flex gap-2">
                <span className="text-primary flex-shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {version.risks.length > 0 && (
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Rủi ro</h2>
          <ul className="space-y-2">
            {version.risks.map((item, index) => (
              <li key={index} className="text-sm text-foreground flex gap-2">
                <span className="text-amber-500 flex-shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {version.kpis.length > 0 && (
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">KPI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {version.kpis.map((kpi, index) => (
              <div key={index} className="border border-border rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">{kpi.metric}</p>
                <p className="text-sm text-muted-foreground mt-1">Mục tiêu: {kpi.target}</p>
              </div>
            ))}
          </div>
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

      {canApprove && (
        <div className="border border-border rounded-lg p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Duyệt phiên bản</h2>
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
                void handleAction(() => approveMutation.mutateAsync());
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
                  revisionMutation.mutateAsync({ comment: comment || null }),
                );
              }}
              disabled={isMutating}
            >
              <RotateCcw />
              Yêu cầu chỉnh sửa
            </Button>
          </div>
        </div>
      )}

      {canLock && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              void handleAction(() => lockMutation.mutateAsync());
            }}
            disabled={isMutating}
          >
            <Lock />
            Khoá phiên bản
          </Button>
        </div>
      )}
    </div>
  );
}
