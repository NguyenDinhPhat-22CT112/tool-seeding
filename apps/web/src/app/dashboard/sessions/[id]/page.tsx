"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useFetchSession,
  useUpdateSession,
  useStartDataCollection,
  useCompleteStage,
  useArchiveSession,
  useDeleteSession,
  useTriggerProcess,
} from "@/hooks/use-sessions";
import {
  useTriggerInsightGeneration,
  useTriggerStrategyGeneration,
} from "@/hooks/use-jobs";
import { useTriggerReviewCrawl } from "@/hooks/use-review-crawl";
import { useFetchLocations } from "@/hooks/use-businesses";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { SessionProgress } from "@/components/sessions/session-progress";
import { SessionActions } from "@/components/sessions/session-actions";
import { DataSourcesTab } from "@/components/sessions/data-sources-tab";
import { FeedbackTab } from "@/components/sessions/feedback-tab";
import { JobsTab } from "@/components/sessions/jobs-tab";
import { ImportsTab } from "@/components/sessions/imports-tab";
import { Skeleton } from "@/components/common/skeleton";
import { DeleteConfirmDialog } from "@/components/business/delete-dialogs";
import { apiClient } from "@/lib/api/client";
import { BusinessLocationResponse } from "@/lib/types";
import { ArrowLeft, Lightbulb, Target, Pencil, Trash2, FileText, Archive } from "lucide-react";
import Link from "next/link";

const TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "data-sources", label: "Nguồn dữ liệu" },
  { id: "feedback", label: "Phản hồi" },
  { id: "imports", label: "Nhập dữ liệu" },
  { id: "jobs", label: "Công việc" },
  { id: "insights", label: "Insights" },
  { id: "strategy", label: "Chiến lược" },
  { id: "contents", label: "Nội dung" },
];

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [activeTab, setActiveTab] = useState("overview");
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get("tab");
      const validTabs = ["overview", "data-sources", "feedback", "imports", "jobs", "insights", "strategy", "contents"];
      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [metadata, setMetadata] = useState({ name: "", objective: "", focusProduct: "" });

  const { data: session, isLoading } = useFetchSession(sessionId);
  const { data: locations } = useFetchLocations(session?.businessId);
  const updateMutation = useUpdateSession(sessionId);
  const startDataCollectionMutation = useStartDataCollection(sessionId);
  const completeStageMutation = useCompleteStage(sessionId);
  const archiveMutation = useArchiveSession();
  const deleteMutation = useDeleteSession();
  const triggerProcessMutation = useTriggerProcess(sessionId);
  const triggerInsightGenerationMutation = useTriggerInsightGeneration(sessionId);
  const triggerStrategyGenerationMutation = useTriggerStrategyGeneration(sessionId);
  const crawlMutation = useTriggerReviewCrawl(sessionId);
  const [crawlNotice, setCrawlNotice] = useState("");

  const isMutating =
    startDataCollectionMutation.isPending ||
    completeStageMutation.isPending ||
    archiveMutation.isPending ||
    triggerProcessMutation.isPending ||
    triggerInsightGenerationMutation.isPending ||
    triggerStrategyGenerationMutation.isPending ||
    crawlMutation.isPending;

  const handleStartDataCollection = async () => {
    setCrawlNotice("");
    await startDataCollectionMutation.mutateAsync();

    const businessId = session?.businessId;
    if (!businessId) {
      setCrawlNotice("Không xác định được doanh nghiệp của đợt phân tích.");
      return;
    }

    let linkedLocations: BusinessLocationResponse[] = [];
    try {
      const res = await apiClient.get<{ items: BusinessLocationResponse[] }>(
        `/businesses/${businessId}/locations`,
      );
      linkedLocations =
        res.items?.filter((l) => l.serpapiPlaceId && l.serpapiPlaceId.length > 0) || [];
    } catch {
      linkedLocations = locations?.filter((l) => l.serpapiPlaceId && l.serpapiPlaceId.length > 0) || [];
    }

    if (linkedLocations.length === 0) {
      setCrawlNotice(
        "Doanh nghiệp chưa có địa điểm nào liên kết Google Maps. Vào trang doanh nghiệp để thêm địa điểm trước.",
      );
      return;
    }

    let crawled = 0;
    for (const location of linkedLocations) {
      try {
        await crawlMutation.mutateAsync({ businessLocationId: location.id });
        crawled += 1;
      } catch {
        // tiếp tục với địa điểm kế tiếp
      }
    }
    setCrawlNotice(
      `Đã kích hoạt thu thập ${crawled}/${linkedLocations.length} địa điểm. Quá trình chạy nền — xem tab "Công việc" để theo dõi.`,
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/dashboard/sessions")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Skeleton className="h-8 w-1/2" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy đợt phân tích</p>
        <Link href="/dashboard/sessions">
          <Button className="mt-4">Quay lại danh sách</Button>
        </Link>
      </div>
    );
  }

  const handleUpdateMetadata = async () => {
    await updateMutation.mutateAsync({
      name: metadata.name,
      objective: metadata.objective || null,
      focusProduct: metadata.focusProduct || null,
    });
    setIsEditingMetadata(false);
  };

  const inputClass =
    "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/dashboard/sessions")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground truncate">{session.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {session.objective || "Chưa có mục tiêu"}
          </p>
        </div>
        <StatusBadge status={session.status} />
        {session.status !== "ARCHIVED" && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowArchiveDialog(true)}
            disabled={archiveMutation.isPending}
            className="text-muted-foreground hover:text-foreground"
            title="Lưu trữ đợt phân tích"
            aria-label="Lưu trữ đợt phân tích"
          >
            <Archive className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={deleteMutation.isPending}
          className="text-destructive hover:text-destructive"
          title="Xóa vĩnh viễn"
          aria-label="Xóa vĩnh viễn"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Trạng thái</p>
            <StatusBadge status={session.status} />
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-2">Cập nhật lần cuối</p>
            <p className="text-sm font-medium text-foreground">
              {new Date(session.updatedAt).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">Tiến độ xử lý</p>
          <SessionProgress status={session.status} className="flex-wrap gap-1" />
        </div>

        <div className="pt-4 border-t border-border">
          {crawlNotice && (
            <div className="mb-3 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3">
              <p className="text-sm text-blue-700 dark:text-blue-400">{crawlNotice}</p>
            </div>
          )}
          <SessionActions
            status={session.status}
            feedbackCount={session.feedbackCount}
            onStartDataCollection={() => void handleStartDataCollection()}
            onProcess={() => triggerProcessMutation.mutate()}
            onGenerateInsights={() => triggerInsightGenerationMutation.mutate()}
            onGenerateStrategy={() => triggerStrategyGenerationMutation.mutate()}
            onComplete={() => completeStageMutation.mutate()}
            onArchive={() => setShowArchiveDialog(true)}
            isLoading={isMutating}
          />
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border bg-muted/20 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-foreground border-b-2 border-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">Thông tin đợt phân tích</p>
                {!isEditingMetadata && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMetadata({
                        name: session.name,
                        objective: session.objective || "",
                        focusProduct: session.focusProduct || "",
                      });
                      setIsEditingMetadata(true);
                    }}
                  >
                    <Pencil />
                    Chỉnh sửa
                  </Button>
                )}
              </div>

              {isEditingMetadata ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={metadata.name}
                    onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
                    placeholder="Tên đợt phân tích"
                    className={inputClass}
                  />
                  <textarea
                    value={metadata.objective}
                    onChange={(e) => setMetadata({ ...metadata, objective: e.target.value })}
                    placeholder="Mục tiêu"
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                  <input
                    type="text"
                    value={metadata.focusProduct}
                    onChange={(e) => setMetadata({ ...metadata, focusProduct: e.target.value })}
                    placeholder="Sản phẩm trọng tâm"
                    className={inputClass}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        void handleUpdateMetadata();
                      }}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "Đang lưu..." : "Lưu"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingMetadata(false)}>
                      Hủy
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Tên đợt phân tích</p>
                    <p className="text-sm font-medium text-foreground">{session.name}</p>
                  </div>
                  {session.objective && (
                    <div className="border border-border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Mục tiêu</p>
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {session.objective}
                      </p>
                    </div>
                  )}
                  {session.focusProduct && (
                    <div className="border border-border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Sản phẩm trọng tâm</p>
                      <p className="text-sm font-medium text-foreground">{session.focusProduct}</p>
                    </div>
                  )}
                  {session.dateFrom && (
                    <div className="border border-border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Khoảng thời gian</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(session.dateFrom).toLocaleDateString("vi-VN")} -{" "}
                        {session.dateTo
                          ? new Date(session.dateTo).toLocaleDateString("vi-VN")
                          : "Đang diễn ra"}
                      </p>
                    </div>
                  )}
                  <div className="border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Số phản hồi</p>
                    <p className="text-sm font-medium text-foreground">{session.feedbackCount}</p>
                  </div>
                  {session.nextAction && (
                    <div className="border border-border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Bước tiếp theo</p>
                      <p className="text-sm font-medium text-foreground">{session.nextAction.label}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "data-sources" && <DataSourcesTab sessionId={sessionId} />}
          {activeTab === "feedback" && <FeedbackTab sessionId={sessionId} />}
          {activeTab === "imports" && <ImportsTab sessionId={sessionId} />}
          {activeTab === "jobs" && <JobsTab sessionId={sessionId} />}

          {activeTab === "insights" && (
            <div className="text-center py-8">
              <Lightbulb className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Xem và duyệt các insight chi tiết</p>
              <Link href={`/dashboard/sessions/${sessionId}/insights`}>
                <Button>Xem Insights</Button>
              </Link>
            </div>
          )}

          {activeTab === "strategy" && (
            <div className="text-center py-8">
              <Target className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Xem và quản lý các phiên bản chiến lược</p>
              <Link href={`/dashboard/sessions/${sessionId}/strategy`}>
                <Button>Xem chiến lược</Button>
              </Link>
            </div>
          )}

          {activeTab === "contents" && (
            <div className="text-center py-8">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Tạo nội dung seeding từ chiến lược (AI hoặc thủ công)</p>
              <Link href={`/dashboard/sessions/${sessionId}/contents`}>
                <Button>Xem nội dung</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={showArchiveDialog}
        title="Lưu trữ đợt phân tích"
        description={`Bạn có chắc chắn muốn lưu trữ đợt phân tích "${session.name}"?`}
        confirmLabel="Lưu trữ"
        loadingLabel="Đang lưu trữ..."
        isLoading={archiveMutation.isPending}
        onConfirm={async () => {
          await archiveMutation.mutateAsync(sessionId);
          setShowArchiveDialog(false);
        }}
        onCancel={() => setShowArchiveDialog(false)}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        title="Xóa đợt phân tích"
        description={`Bạn có chắc chắn muốn xóa vĩnh viễn đợt phân tích "${session.name}"? Toàn bộ dữ liệu (feedback, insight, chiến lược) sẽ bị xóa. Hành động này không thể hoàn tác.`}
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(sessionId);
          setShowDeleteDialog(false);
          router.push("/dashboard/sessions");
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
