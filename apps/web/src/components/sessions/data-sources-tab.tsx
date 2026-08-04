"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/common/skeleton";
import { StatusBadge } from "@/components/common/status-badge";
import { DeleteConfirmDialog } from "@/components/business/delete-dialogs";
import { useFetchDataSources, useCreateDataSource, useDeleteDataSource } from "@/hooks/use-data-sources";
import { DataSourceResponse, SourceType } from "@/lib/types";
import { Database, Plus, Trash2 } from "lucide-react";

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  MANUAL: "Thủ công",
  EXCEL: "Excel",
  CSV: "CSV",
  SERPAPI: "SerpApi",
};

interface DataSourcesTabProps {
  sessionId: string;
}

export function DataSourcesTab({ sessionId }: DataSourcesTabProps) {
  const { data, isLoading } = useFetchDataSources(sessionId);
  const createMutation = useCreateDataSource(sessionId);
  const deleteMutation = useDeleteDataSource(sessionId);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("MANUAL");
  const [deleteTarget, setDeleteTarget] = useState<DataSourceResponse | null>(null);
  const [error, setError] = useState("");

  const dataSources = data || [];

  const handleCreate = async () => {
    setError("");
    if (!name.trim()) {
      setError("Tên nguồn dữ liệu là bắt buộc");
      return;
    }
    try {
      await createMutation.mutateAsync({ name: name.trim(), sourceType });
      setName("");
      setSourceType("MANUAL");
      setShowCreate(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tạo nguồn dữ liệu";
      setError(message);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Nguồn dữ liệu</h3>
          <p className="text-sm text-muted-foreground">{dataSources.length} nguồn dữ liệu</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus />
          Thêm nguồn
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : dataSources.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-10 text-center">
          <Database className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Chưa có nguồn dữ liệu nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dataSources.map((ds) => (
            <div
              key={ds.id}
              className="flex items-start justify-between gap-4 border border-border rounded-lg p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground">{ds.name}</p>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                    {SOURCE_TYPE_LABELS[ds.sourceType]}
                  </span>
                  <StatusBadge status={ds.status} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                  {ds.totalRecords != null && <span>Tổng: {ds.totalRecords}</span>}
                  {ds.validRecords != null && <span>Hợp lệ: {ds.validRecords}</span>}
                  {ds.errorRecords != null && <span>Lỗi: {ds.errorRecords}</span>}
                </div>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 shrink-0"
                onClick={() => setDeleteTarget(ds)}
                disabled={deleteMutation.isPending}
                aria-label="Xóa"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Thêm nguồn dữ liệu"
        description="Tạo nguồn dữ liệu mới cho đợt phân tích"
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="ds-name" className="block text-sm font-medium text-foreground mb-2">
              Tên nguồn dữ liệu *
            </label>
            <input
              id="ds-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Đánh giá Google Maps"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ds-type" className="block text-sm font-medium text-foreground mb-2">
              Loại nguồn
            </label>
            <select
              id="ds-type"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
              className={inputClass}
            >
              {(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((type) => (
                <option key={type} value={type}>
                  {SOURCE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                void handleCreate();
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Đang tạo..." : "Tạo nguồn"}
            </Button>
          </div>
        </div>
      </Dialog>

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Xóa nguồn dữ liệu"
        description={
          deleteTarget
            ? `Bạn có chắc chắn muốn xóa nguồn dữ liệu "${deleteTarget.name}"?`
            : "Bạn có chắc chắn muốn xóa nguồn dữ liệu này?"
        }
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
