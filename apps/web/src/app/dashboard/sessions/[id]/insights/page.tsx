"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFetchInsights,
  useArchiveInsight,
  useDeleteInsight,
} from "@/hooks/use-insights";
import { useFetchSession } from "@/hooks/use-sessions";
import { useAuth } from "@/hooks/use-auth";
import { InsightCard } from "@/components/insights/insight-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/common/skeleton";
import { DeleteConfirmDialog } from "@/components/business/delete-dialogs";
import { Lightbulb, Search, ArrowLeft } from "lucide-react";
import { InsightStatus } from "@/lib/types";

const ARCHIVABLE_SESSION_STATUSES = ["INSIGHT_REVIEW", "STRATEGY_BUILDING"];

const STATUS_OPTIONS: { value: InsightStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Nháp" },
  { value: "WAITING_REVIEW", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "NEEDS_REANALYSIS", label: "Cần phân tích lại" },
  { value: "ARCHIVED", label: "Đã lưu trữ" },
];

const ORIGIN_OPTIONS = [
  { value: "", label: "Tất cả nguồn" },
  { value: "OBSERVED", label: "Quan sát" },
  { value: "INFERRED", label: "Suy luận" },
  { value: "ASSUMED", label: "Giả định" },
];

export default function InsightsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<InsightStatus | "">("");
  const [originFilter, setOriginFilter] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: sessionData } = useFetchSession(sessionId);
  const { auth } = useAuth();
  const { data, isLoading } = useFetchInsights(sessionId, {
    status: statusFilter || undefined,
    origin: originFilter || undefined,
  });
  const archiveMutation = useArchiveInsight(sessionId);
  const deleteMutation = useDeleteInsight(sessionId);

  const canManageInsights = ARCHIVABLE_SESSION_STATUSES.includes(
    sessionData?.status || "",
  );
  const canDeleteInsights = auth?.role === "ORG_ADMIN";

  const insights = data?.items || [];
  const archiveTargetInsight = insights.find((i) => i.id === archiveTarget);
  const deleteTargetInsight = insights.find((i) => i.id === deleteTarget);

  const filteredInsights = insights.filter(
    (insight) =>
      insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (insight.description?.toLowerCase() || "").includes(searchTerm.toLowerCase()),
  );

  const inputClass =
    "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  if (insights.length === 0 && !isLoading && !searchTerm && !statusFilter && !originFilter) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push(`/dashboard/sessions/${sessionId}?tab=insights`)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Insights</h1>
            <p className="text-sm text-muted-foreground mt-1">Các insight được tạo từ đợt phân tích</p>
          </div>
        </div>

        <EmptyState
          icon={<Lightbulb className="h-12 w-12" />}
          title="Chưa có insight nào"
          description="Insight sẽ xuất hiện sau khi đợt phân tích tạo ra chúng"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push(`/dashboard/sessions/${sessionId}?tab=insights`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">Các insight được tạo từ đợt phân tích</p>
        </div>
      </div>

      {!canManageInsights && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Đợt phân tích đang ở trạng thái hiện tại, không thể lưu trữ insight.
            Chỉ lưu trữ được khi đợt ở giai đoạn &quot;Duyệt insight&quot; hoặc &quot;Xây dựng chiến lược&quot;.
            {canDeleteInsights && <> (Org Admin vẫn xóa vĩnh viễn được insight).</>}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm insight..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InsightStatus | "")}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className={inputClass}
          >
            {ORIGIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))
          : filteredInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                sessionId={sessionId}
                onArchive={(id) => setArchiveTarget(id)}
                onDelete={(id) => setDeleteTarget(id)}
                isArchivingId={archiveMutation.isPending ? archiveTarget || undefined : undefined}
                isDeletingId={deleteMutation.isPending ? deleteTarget || undefined : undefined}
                canManage={canManageInsights}
                canDelete={canDeleteInsights}
              />
            ))}
      </div>

      {!isLoading && filteredInsights.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Không tìm thấy insight phù hợp</p>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={!!archiveTarget}
        title="Lưu trữ insight"
        description={
          archiveTargetInsight
            ? `Bạn có chắc chắn muốn lưu trữ insight "${archiveTargetInsight.title}"?`
            : "Bạn có chắc chắn muốn lưu trữ insight này?"
        }
        confirmLabel="Lưu trữ"
        loadingLabel="Đang lưu trữ..."
        isLoading={archiveMutation.isPending}
        onConfirm={async () => {
          if (archiveTarget) {
            await archiveMutation.mutateAsync(archiveTarget);
            setArchiveTarget(null);
          }
        }}
        onCancel={() => setArchiveTarget(null)}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Xóa insight"
        description={
          deleteTargetInsight
            ? `Bạn có chắc chắn muốn xóa vĩnh viễn insight "${deleteTargetInsight.title}"? Toàn bộ bằng chứng và lịch sử duyệt sẽ bị xóa. Hành động này không thể hoàn tác.`
            : "Bạn có chắc chắn muốn xóa vĩnh viễn insight này? Hành động này không thể hoàn tác."
        }
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
