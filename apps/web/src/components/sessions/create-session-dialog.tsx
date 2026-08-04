"use client";

import { SessionForm } from "@/components/sessions/session-form";
import { Dialog } from "@/components/ui/dialog";
import { BusinessListItemResponse } from "@/lib/types";

interface CreateSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    businessId?: string;
    name: string;
    objective?: string | null;
    focusProduct?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
  }) => Promise<void>;
  isLoading?: boolean;
  businesses?: BusinessListItemResponse[];
}

export function CreateSessionDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  businesses,
}: CreateSessionDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo đợt phân tích"
      description="Nhập thông tin để bắt đầu một đợt phân tích mới"
    >
      <SessionForm onSubmit={onSubmit} isLoading={isLoading} businesses={businesses} />
    </Dialog>
  );
}
