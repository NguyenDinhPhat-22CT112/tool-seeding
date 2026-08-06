"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  isLoading?: boolean;
  confirmLabel?: string;
  loadingLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  isOpen,
  title = "Xóa doanh nghiệp",
  description = "Bạn có chắc chắn muốn xóa?",
  isLoading = false,
  confirmLabel = "Xóa",
  loadingLabel = "Đang xóa...",
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      className="max-w-md"
    >
      <div className="flex gap-4">
        <div className="shrink-0 rounded-full bg-red-500/10 p-3">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-sm text-muted-foreground pt-2">{description}</p>
      </div>
      <div className="flex justify-end gap-2 pt-6">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Hủy
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            void onConfirm();
          }}
          disabled={isLoading}
        >
          {isLoading ? loadingLabel : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

interface BusinessDeleteDialogProps {
  isOpen: boolean;
  businessName?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function BusinessDeleteDialog({
  isOpen,
  businessName,
  isLoading,
  onConfirm,
  onCancel,
}: BusinessDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      isOpen={isOpen}
      title="Xóa doanh nghiệp"
      description={
        businessName
          ? `Bạn có chắc chắn muốn xóa "${businessName}"? Toàn bộ đợt phân tích, insight và dữ liệu liên quan sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`
          : "Bạn có chắc chắn muốn xóa doanh nghiệp này? Toàn bộ đợt phân tích, insight và dữ liệu liên quan sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
      }
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

interface LocationDeleteDialogProps {
  isOpen: boolean;
  locationName?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function LocationDeleteDialog({
  isOpen,
  locationName,
  isLoading,
  onConfirm,
  onCancel,
}: LocationDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      isOpen={isOpen}
      title="Xóa cơ sở"
      description={
        locationName
          ? `Bạn có chắc chắn muốn xóa cơ sở "${locationName}"?`
          : "Bạn có chắc chắn muốn xóa cơ sở này?"
      }
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
