"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/common/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import {
  useCreatePromptTemplate,
  useFetchPromptTemplates,
  useUpdatePromptTemplate,
} from "@/hooks/use-contents";
import { PromptPurpose, PromptTemplateResponse } from "@/lib/types";
import { FileCode2, Plus, Pencil } from "lucide-react";

const PURPOSE_LABELS: Record<PromptPurpose, string> = {
  GENERATE: "Tạo nội dung",
  REWRITE: "Viết lại",
};

const CONTENT_TYPE_OPTIONS = ["Đánh giá", "Hỏi đáp", "Giới thiệu", "Cảm nhận"] as const;

const INPUT_CLASS =
  "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

interface FormState {
  name: string;
  platform: string;
  contentType: string;
  purpose: PromptPurpose;
  templateBody: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  platform: "",
  contentType: CONTENT_TYPE_OPTIONS[0],
  purpose: "GENERATE",
  templateBody: "",
};

export function PromptTemplateManager() {
  const { data: templates, isLoading } = useFetchPromptTemplates();
  const createMutation = useCreatePromptTemplate();
  const updateMutation = useUpdatePromptTemplate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromptTemplateResponse | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (t: PromptTemplateResponse) => {
    setEditing(t);
    setForm({
      name: t.name,
      platform: t.platform ?? "",
      contentType: t.contentType,
      purpose: t.purpose,
      templateBody: t.templateBody,
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.templateBody.trim()) {
      setError("Tên và nội dung template không được bỏ trống.");
      return;
    }
    setError(null);
    const payload = {
      name: form.name.trim(),
      platform: form.platform.trim() || null,
      contentType: form.contentType.trim(),
      purpose: form.purpose,
      templateBody: form.templateBody,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra khi lưu template.");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Prompt Template AI
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mẫu prompt dùng chung cho toàn hệ thống khi tạo nội dung seeding.
            Sửa template sẽ tạo version mới (không ghi đè).
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Tạo template
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !templates || templates.length === 0 ? (
        <EmptyState
          icon={<FileCode2 className="h-8 w-8" />}
          title="Chưa có prompt template"
          description="Tạo template đầu tiên để AI sinh nội dung theo đúng ngữ điệu bạn muốn."
          action={
            <Button onClick={openCreate}>
              <Plus />
              Tạo template đầu tiên
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="border border-border rounded-lg p-4 flex items-start justify-between gap-4 hover:border-muted-foreground/30 transition-colors"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{t.name}</span>
                  <span className="text-xs text-muted-foreground">v{t.version}</span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.isActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {t.isActive ? "Hoạt động" : "Ẩn"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Mục đích: {PURPOSE_LABELS[t.purpose]}</span>
                  <span>Loại nội dung: {t.contentType}</span>
                  {t.platform && <span>Nền tảng: {t.platform}</span>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {t.templateBody}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                <Pencil className="w-4 h-4 mr-1" />
                Sửa
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? `Sửa template: ${editing.name}` : "Tạo prompt template"}
        description="Sửa sẽ tạo version mới của template này."
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Tên template</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Đánh giá tích cực - Facebook"
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Nền tảng</label>
              <input
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                placeholder="facebook, tiktok... (bỏ trống = mọi nền tảng)"
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Loại nội dung</label>
              <input
                value={form.contentType}
                onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value }))}
                placeholder="Đánh giá, Hỏi đáp..."
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Mục đích</label>
            <select
              value={form.purpose}
              onChange={(e) =>
                setForm((f) => ({ ...f, purpose: e.target.value as PromptPurpose }))
              }
              className={INPUT_CLASS}
            >
              <option value="GENERATE">Tạo nội dung</option>
              <option value="REWRITE">Viết lại</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Nội dung prompt</label>
            <textarea
              value={form.templateBody}
              onChange={(e) =>
                setForm((f) => ({ ...f, templateBody: e.target.value }))
              }
              rows={12}
              placeholder="Viết prompt ở đây. Có thể dùng các biến: {{businessName}}, {{industry}}, {{objective}}, {{content}}, {{platform}}, {{contentType}}, {{variantCount}}, {{brandVoice}}, {{allowedTopics}}, {{bannedTopics}}, {{strategyContent}}, {{businessProfile}}"
              className={`${INPUT_CLASS} font-mono text-xs`}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving
              ? "Đang lưu..."
              : editing
                ? "Lưu (tạo version mới)"
                : "Tạo template"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
