"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useFetchAIGeneration,
  useGenerateContents,
  useSaveAIGeneration,
} from "@/hooks/use-contents";
import { PromptTemplateResponse } from "@/lib/types";
import { Skeleton } from "@/components/common/skeleton";

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  strategyVersionId: string;
  promptTemplates: PromptTemplateResponse[];
}

export function GenerateContentDialog({
  open,
  onClose,
  sessionId,
  strategyVersionId,
  promptTemplates,
}: Props) {
  const [promptTemplateId, setPromptTemplateId] = useState("");
  const [variantCount, setVariantCount] = useState(3);
  const [aiGenerationId, setAiGenerationId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const generateMutation = useGenerateContents(sessionId);
  const saveMutation = useSaveAIGeneration(sessionId);

  const { data: generation, isLoading: pollingGeneration } = useFetchAIGeneration(
    aiGenerationId ?? undefined,
  );

  const handleGenerate = async () => {
    if (!promptTemplateId) return;
    const res = await generateMutation.mutateAsync({
      strategyVersionId,
      promptTemplateId,
      variantCount,
    });
    setAiGenerationId(res.aiGenerationId);
    setSelectedIndex(null);
  };

  const handleSave = async () => {
    if (!aiGenerationId || selectedIndex === null) return;
    await saveMutation.mutateAsync({
      aiGenerationId,
      selectedCandidateIndex: selectedIndex,
    });
    onClose();
  };

  const isPending = generateMutation.isPending || pollingGeneration;

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title="Tạo nội dung AI"
      description="AI sinh nhiều phương án — chọn 1 và bấm Save để thành nội dung"
    >
      <div className="space-y-4">
        {!aiGenerationId && (
          <>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Prompt template</label>
              {promptTemplates.length === 0 ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  Chưa có template nào. Vào{" "}
                  <a
                    href="/dashboard/prompt-templates"
                    className="underline font-medium"
                    onClick={() => onClose()}
                  >
                    Quản lý template
                  </a>{" "}
                  để tạo trước.
                </div>
              ) : (
                <select
                  value={promptTemplateId}
                  onChange={(e) => setPromptTemplateId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                >
                  <option value="">-- Chọn template --</option>
                  {promptTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (v{t.version})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Số phương án</label>
              <input
                type="number"
                min={1}
                max={5}
                value={variantCount}
                onChange={(e) => setVariantCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              />
            </div>

            <Button
              onClick={() => void handleGenerate()}
              disabled={!promptTemplateId || generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? "Đang tạo job..." : "Tạo candidates"}
            </Button>
          </>
        )}

        {aiGenerationId && isPending && generation?.status === "PENDING" && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <p className="text-sm text-muted-foreground">AI đang sinh nội dung...</p>
          </div>
        )}

        {aiGenerationId && generation?.status === "FAILED" && (
          <p className="text-sm text-destructive">
            AI sinh nội dung thất bại. Vui lòng thử lại.
          </p>
        )}

        {aiGenerationId && generation?.status === "COMPLETED" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Chọn một phương án để lưu thành nội dung:
            </p>
            {generation.candidates.map((c) => (
              <button
                key={c.variantIndex}
                onClick={() => setSelectedIndex(c.variantIndex)}
                className={`w-full text-left border rounded-lg p-3 transition-colors ${
                  selectedIndex === c.variantIndex
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="text-sm font-semibold text-foreground">{c.title}</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-4">{c.body}</p>
              </button>
            ))}
            <Button
              onClick={() => void handleSave()}
              disabled={selectedIndex === null || saveMutation.isPending}
              className="w-full"
            >
              {saveMutation.isPending ? "Đang lưu..." : "Lưu thành nội dung"}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
