"use client";

import { BusinessDetailResponse, UpdateBusinessRequest } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";
import { BusinessForm } from "@/components/business/business-form";

interface CreateBusinessDialogProps {
  isOpen: boolean;
  isLoading?: boolean;
  onSubmit: (data: UpdateBusinessRequest) => Promise<void>;
  onClose: () => void;
}

export function CreateBusinessDialog({
  isOpen,
  isLoading,
  onSubmit,
  onClose,
}: CreateBusinessDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo doanh nghiệp mới"
      description="Nhập thông tin doanh nghiệp để bắt đầu phân tích chiến lược"
    >
      <BusinessForm
        isLoading={isLoading}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Dialog>
  );
}

interface EditBusinessDialogProps {
  isOpen: boolean;
  business: BusinessDetailResponse | null;
  isLoading?: boolean;
  onSubmit: (data: UpdateBusinessRequest) => Promise<void>;
  onClose: () => void;
}

export function EditBusinessDialog({
  isOpen,
  business,
  isLoading,
  onSubmit,
  onClose,
}: EditBusinessDialogProps) {
  return (
    <Dialog
      isOpen={isOpen && !!business}
      onClose={onClose}
      title="Cập nhật doanh nghiệp"
      description="Cập nhật thông tin doanh nghiệp"
    >
      {business && (
        <BusinessForm
          business={business}
          isLoading={isLoading}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      )}
    </Dialog>
  );
}
