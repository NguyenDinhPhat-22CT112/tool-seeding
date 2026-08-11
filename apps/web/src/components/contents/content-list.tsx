"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  useApproveContent,
  useArchiveContent,
  useFetchContentDetail,
  useLockContent,
  useRequestRevisionContent,
  useSubmitContent,
  useUnlockContent,
} from "@/hooks/use-contents";
import { SeedingContentSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";

interface Props {
  sessionId: string;
  items: SeedingContentSummary[];
  filter: { status?: string; origin?: string };
  onFilterChange: (f: { status?: string; origin?: string }) => void;
}

const ORIGIN_LABEL: Record<string, string> = {
  AI_GENERATED: "AI",
  HUMAN_WRITTEN: "Thủ công",
};

export function ContentList({ sessionId, items, filter, onFilterChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterButton
          label="Tất cả"
          active={!filter.origin && !filter.status}
          onClick={() => onFilterChange({})}
        />
        <FilterButton
          label="AI"
          active={filter.origin === "AI_GENERATED"}
          onClick={() => onFilterChange({ ...filter, origin: "AI_GENERATED" })}
        />
        <FilterButton
          label="Thủ công"
          active={filter.origin === "HUMAN_WRITTEN"}
          onClick={() => onFilterChange({ ...filter, origin: "HUMAN_WRITTEN" })}
        />
        <span className="w-px bg-border mx-1" />
        <FilterButton
          label="Đã duyệt"
          active={filter.status === "APPROVED"}
          onClick={() => onFilterChange({ ...filter, status: "APPROVED" })}
        />
        <FilterButton
          label="Chờ duyệt"
          active={filter.status === "WAITING_APPROVAL"}
          onClick={() => onFilterChange({ ...filter, status: "WAITING_APPROVAL" })}
        />
        <FilterButton
          label="Nháp"
          active={filter.status === "DRAFT"}
          onClick={() => onFilterChange({ ...filter, status: "DRAFT" })}
        />
      </div>

      <div className="space-y-3">
        {items.map((content) => (
          <div
            key={content.id}
            className="border border-border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{content.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={content.status} />
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      content.origin === "AI_GENERATED"
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        : "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                    )}
                  >
                    {ORIGIN_LABEL[content.origin] ?? content.origin}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedId(content.id)}>
                <Eye />
                Chi tiết
              </Button>
            </div>
            {content.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {content.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedId && (
        <ContentDetailDialog
          sessionId={sessionId}
          contentId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ContentDetailDialog({
  sessionId,
  contentId,
  onClose,
}: {
  sessionId: string;
  contentId: string;
  onClose: () => void;
}) {
  const { data: content, isLoading } = useFetchContentDetail(sessionId, contentId);
  const [revisionComment, setRevisionComment] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [showUnlockInput, setShowUnlockInput] = useState(false);
  const [unlockComment, setUnlockComment] = useState("");

  const submit = useSubmitContent(sessionId, contentId);
  const approve = useApproveContent(sessionId, contentId);
  const requestRevision = useRequestRevisionContent(sessionId, contentId);
  const lock = useLockContent(sessionId, contentId);
  const unlock = useUnlockContent(sessionId, contentId);
  const archive = useArchiveContent(sessionId, contentId);

  return (
    <Dialog
      isOpen={!!contentId}
      onClose={onClose}
      title={content?.title ?? "Chi tiết nội dung"}
    >
      {isLoading || !content ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={content.status} />
            <span className="text-xs text-muted-foreground">
              {content.origin === "AI_GENERATED" ? "AI sinh" : "Viết thủ công"}
            </span>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="text-sm text-muted-foreground mb-1">Nội dung</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {content.currentVersion?.body ?? "(trống)"}
            </p>
          </div>

          {content.currentVersion?.reviewComment && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-xs text-muted-foreground mb-1">Nhận xét duyệt</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {content.currentVersion.reviewComment}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(content.status === "DRAFT" || content.status === "NEEDS_REVISION") && (
              <Button size="sm" onClick={() => submit.mutate()} disabled={submit.isPending}>
                Gửi duyệt
              </Button>
            )}
            {content.status === "WAITING_APPROVAL" && (
              <>
                <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
                  Duyệt
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRevisionInput(true)}
                >
                  Yêu cầu sửa
                </Button>
              </>
            )}
            {content.status === "APPROVED" && (
              <Button size="sm" onClick={() => lock.mutate()} disabled={lock.isPending}>
                Khóa
              </Button>
            )}
            {content.status === "LOCKED" && (
              <Button size="sm" variant="outline" onClick={() => setShowUnlockInput(true)}>
                Mở khóa
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => archive.mutate()}
              disabled={archive.isPending}
            >
              Lưu trữ
            </Button>
          </div>

          {showRevisionInput && (
            <div className="space-y-2">
              <textarea
                value={revisionComment}
                onChange={(e) => setRevisionComment(e.target.value)}
                placeholder="Lý do yêu cầu sửa"
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              />
              <Button
                size="sm"
                onClick={() =>
                  requestRevision.mutate({ comment: revisionComment }, {
                    onSuccess: () => {
                      setShowRevisionInput(false);
                      setRevisionComment("");
                    },
                  })
                }
                disabled={!revisionComment.trim() || requestRevision.isPending}
              >
                Gửi yêu cầu sửa
              </Button>
            </div>
          )}

          {showUnlockInput && (
            <div className="space-y-2">
              <textarea
                value={unlockComment}
                onChange={(e) => setUnlockComment(e.target.value)}
                placeholder="Lý do mở khóa"
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
              />
              <Button
                size="sm"
                onClick={() =>
                  unlock.mutate({ comment: unlockComment }, {
                    onSuccess: () => {
                      setShowUnlockInput(false);
                      setUnlockComment("");
                    },
                  })
                }
                disabled={!unlockComment.trim() || unlock.isPending}
              >
                Mở khóa
              </Button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
