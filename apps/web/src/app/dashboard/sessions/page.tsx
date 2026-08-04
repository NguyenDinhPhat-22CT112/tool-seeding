"use client";

import { useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { FileText, Search } from "lucide-react";
import { useFetchSessions, useCreateSession, useArchiveSession } from "@/hooks/use-sessions";
import { useFetchBusinesses } from "@/hooks/use-businesses";
import { SessionCard } from "@/components/sessions/session-card";
import { CreateSessionDialog } from "@/components/sessions/create-session-dialog";
import { Skeleton } from "@/components/common/skeleton";
import { DeleteConfirmDialog } from "@/components/business/delete-dialogs";
import { AnalysisSessionStatus, CreateAnalysisSessionRequest } from "@/lib/types";

const STATUS_OPTIONS: { value: AnalysisSessionStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Nháp" },
  { value: "DATA_COLLECTION", label: "Thu thập dữ liệu" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "ANALYZING", label: "Đang phân tích" },
  { value: "INSIGHT_REVIEW", label: "Duyệt insight" },
  { value: "STRATEGY_BUILDING", label: "Xây dựng chiến lược" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "ARCHIVED", label: "Đã lưu trữ" },
];

export default function SessionsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<AnalysisSessionStatus | "">("");
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  const { data, isLoading } = useFetchSessions({
    keyword: keyword || undefined,
    status: statusFilter || undefined,
  });
  const { data: businessesData } = useFetchBusinesses();
  const createMutation = useCreateSession();
  const archiveMutation = useArchiveSession();

  const sessions = data?.items || [];
  const businesses = businessesData?.items || [];
  const deleteTarget = sessions.find((s) => s.id === deleteSessionId);

  const handleCreate = async (formData: {
    businessId?: string;
    name: string;
    objective?: string | null;
    focusProduct?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
  }) => {
    if (!formData.businessId) return;
    await createMutation.mutateAsync(formData as CreateAnalysisSessionRequest);
    setShowCreateDialog(false);
  };

  const inputClass =
    "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  if (sessions.length === 0 && !isLoading && !keyword && !statusFilter) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Đợt phân tích</h1>
            <p className="text-sm text-muted-foreground">Quản lý các đợt phân tích chiến lược</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>Tạo đợt phân tích</Button>
        </div>

        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Chưa có đợt phân tích nào"
          description="Tạo đợt phân tích đầu tiên để bắt đầu phân tích chiến lược seeding"
          action={<Button onClick={() => setShowCreateDialog(true)}>Tạo đợt phân tích</Button>}
        />

        <CreateSessionDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSubmit={handleCreate}
          isLoading={createMutation.isPending}
          businesses={businesses}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Đợt phân tích</h1>
          <p className="text-sm text-muted-foreground">Quản lý các đợt phân tích chiến lược</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>Tạo đợt phân tích</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm đợt phân tích..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AnalysisSessionStatus | "")}
          className={`${inputClass} sm:w-56`}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))
          : sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onDelete={(id) => setDeleteSessionId(id)}
                isDeletingId={archiveMutation.isPending ? deleteSessionId || undefined : undefined}
              />
            ))}
      </div>

      {!isLoading && sessions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Không tìm thấy đợt phân tích phù hợp</p>
        </div>
      )}

      <CreateSessionDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        businesses={businesses}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteSessionId}
        title="Lưu trữ đợt phân tích"
        description={
          deleteTarget
            ? `Bạn có chắc chắn muốn lưu trữ đợt phân tích "${deleteTarget.name}"? Đợt phân tích sẽ chuyển sang trạng thái đã lưu trữ.`
            : "Bạn có chắc chắn muốn lưu trữ đợt phân tích này?"
        }
        isLoading={archiveMutation.isPending}
        onConfirm={async () => {
          if (deleteSessionId) {
            await archiveMutation.mutateAsync(deleteSessionId);
            setDeleteSessionId(null);
          }
        }}
        onCancel={() => setDeleteSessionId(null)}
      />
    </div>
  );
}
