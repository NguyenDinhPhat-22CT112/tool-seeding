"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/common/skeleton";
import { StatusBadge } from "@/components/common/status-badge";
import {
  useFetchImportBatches,
  useUploadImportFile,
  useMapImportColumns,
  useConfirmImport,
} from "@/hooks/use-imports";
import { useFetchDataSources } from "@/hooks/use-data-sources";
import { ImportBatchResponse } from "@/lib/types";
import { Upload, FileSpreadsheet, Check, Download } from "lucide-react";

interface ImportsTabProps {
  sessionId: string;
}

export function ImportsTab({ sessionId }: ImportsTabProps) {
  const { data, isLoading } = useFetchImportBatches(sessionId);
  const { data: dataSources } = useFetchDataSources(sessionId);
  const uploadMutation = useUploadImportFile(sessionId);
  const mapMutation = useMapImportColumns(sessionId);
  const confirmMutation = useConfirmImport(sessionId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mappingTarget, setMappingTarget] = useState<ImportBatchResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const batches = data || [];
  const dsList = dataSources || [];

  const handleUpload = async (file: File) => {
    await uploadMutation.mutateAsync(file);
  };

  const openMapping = (batch: ImportBatchResponse) => {
    setMappingTarget(batch);
    setColumnMapping(batch.columnMapping || {});
  };

  const handleSaveMapping = async () => {
    if (!mappingTarget) return;
    await mapMutation.mutateAsync({
      batchId: mappingTarget.id,
      columnMapping,
    });
    setMappingTarget(null);
  };

  const handleConfirm = async (batch: ImportBatchResponse) => {
    await confirmMutation.mutateAsync(batch.id);
  };

  const inputClass =
    "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Nhập dữ liệu</h3>
          <p className="text-sm text-muted-foreground">Tải lên file Excel/CSV để nhập phản hồi</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending || dsList.length === 0}
          >
            <Upload />
            {uploadMutation.isPending ? "Đang tải lên..." : "Tải lên file"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-10 text-center">
          <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Chưa có file nhập nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <div key={batch.id} className="border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">{batch.fileName}</p>
                    <StatusBadge status={batch.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span>{(batch.fileSize / 1024).toFixed(1)} KB</span>
                    <span>Tổng dòng: {batch.totalRows}</span>
                    {batch.validRows != null && <span>Hợp lệ: {batch.validRows}</span>}
                    {batch.errorRows != null && <span>Lỗi: {batch.errorRows}</span>}
                    {batch.importedRows != null && <span>Đã nhập: {batch.importedRows}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {batch.status === "MAPPING" && (
                    <Button size="sm" variant="outline" onClick={() => openMapping(batch)}>
                      Ánh xạ cột
                    </Button>
                  )}
                  {(batch.status === "MAPPING" || batch.status === "VALIDATING") && (
                    <Button
                      size="sm"
                      onClick={() => {
                        void handleConfirm(batch);
                      }}
                      disabled={confirmMutation.isPending}
                    >
                      <Check />
                      Xác nhận nhập
                    </Button>
                  )}
                  {batch.errorRows > 0 && batch.status === "COMPLETED" && (
                    <Button size="sm" variant="outline" disabled>
                      <Download />
                      Lỗi
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        isOpen={!!mappingTarget}
        onClose={() => setMappingTarget(null)}
        title="Ánh xạ cột"
        description={`Chọn trường dữ liệu cho file "${mappingTarget?.fileName}"`}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gán từng cột trong file vào trường dữ liệu tương ứng.
          </p>
          {mappingTarget?.headers?.map((header) => (
            <div key={header}>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Cột: {header}
              </label>
              <select
                value={columnMapping[header] || ""}
                onChange={(e) =>
                  setColumnMapping((prev) => ({ ...prev, [header]: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Chọn trường...</option>
                <option value="rawContent">Nội dung phản hồi</option>
                <option value="rating">Đánh giá</option>
                <option value="reviewerName">Người đánh giá</option>
                <option value="publishedAt">Ngày đăng</option>
                <option value="sourceUrl">URL nguồn</option>
              </select>
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setMappingTarget(null)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                void handleSaveMapping();
              }}
              disabled={mapMutation.isPending}
            >
              {mapMutation.isPending ? "Đang lưu..." : "Lưu ánh xạ"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
