"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCreateManualContent } from "@/hooks/use-contents";

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  strategyVersionId: string;
}

export function ManualContentForm({ open, onClose, sessionId, strategyVersionId }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const mutation = useCreateManualContent(sessionId);

  const handleSave = async () => {
    await mutation.mutateAsync({
      strategyVersionId,
      title,
      body,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    onClose();
    setTitle("");
    setBody("");
    setTags("");
  };

  const inputClass =
    "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title="Viết nội dung thủ công"
      description="Tự viết nội dung seeding dựa trên chiến lược đã phê duyệt"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Tiêu đề</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề nội dung"
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Nội dung</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Viết nội dung từ chiến lược..."
            rows={6}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Tags (phân cách bằng dấu phẩy)
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="ưu đãi, dịch vụ"
            className={inputClass}
          />
        </div>

        <Button
          onClick={() => void handleSave()}
          disabled={!title.trim() || !body.trim() || mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? "Đang lưu..." : "Lưu nội dung"}
        </Button>
      </div>
    </Dialog>
  );
}
