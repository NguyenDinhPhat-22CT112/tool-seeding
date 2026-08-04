"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/common/skeleton";
import { StatusBadge } from "@/components/common/status-badge";
import { DeleteConfirmDialog } from "@/components/business/delete-dialogs";
import {
  useFetchFeedback,
  useCreateFeedback,
  useExcludeFeedback,
} from "@/hooks/use-feedback";
import { FeedbackListItemResponse } from "@/lib/types";
import { MessageSquare, Plus, Star, EyeOff } from "lucide-react";

interface FeedbackTabProps {
  sessionId: string;
}

export function FeedbackTab({ sessionId }: FeedbackTabProps) {
  const { data, isLoading } = useFetchFeedback(sessionId, { page: 1, pageSize: 50 });
  const createMutation = useCreateFeedback(sessionId);
  const excludeMutation = useExcludeFeedback(sessionId);

  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState("");
  const [rating, setRating] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [excludeTarget, setExcludeTarget] = useState<FeedbackListItemResponse | null>(null);
  const [error, setError] = useState("");

  const feedback = data?.items || [];

  const handleCreate = async () => {
    setError("");
    if (!content.trim()) {
      setError("Nội dung phản hồi là bắt buộc");
      return;
    }
    try {
      await createMutation.mutateAsync({
        rawContent: content.trim(),
        rating: rating ? Number(rating) : null,
        reviewerName: reviewerName.trim() || null,
      });
      setContent("");
      setRating("");
      setReviewerName("");
      setShowCreate(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể thêm phản hồi";
      setError(message);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Phản hồi</h3>
          <p className="text-sm text-muted-foreground">{feedback.length} phản hồi</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus />
          Thêm phản hồi
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : feedback.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-10 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Chưa có phản hồi nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 border border-border rounded-lg p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.rating != null && (
                    <span className="inline-flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                      <Star className="w-4 h-4" />
                      {item.rating}
                    </span>
                  )}
                  <StatusBadge status={item.processingStatus} />
                  {item.reviewerName && (
                    <span className="text-xs text-muted-foreground">{item.reviewerName}</span>
                  )}
                </div>
                <p className="text-sm text-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                  {item.rawContent}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              {item.processingStatus !== "EXCLUDED" && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 shrink-0"
                  onClick={() => setExcludeTarget(item)}
                  disabled={excludeMutation.isPending}
                  aria-label="Loại bỏ"
                >
                  <EyeOff />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Thêm phản hồi"
        description="Thêm phản hồi thủ công vào đợt phân tích"
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="fb-content" className="block text-sm font-medium text-foreground mb-2">
              Nội dung phản hồi *
            </label>
            <textarea
              id="fb-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung phản hồi"
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="fb-rating" className="block text-sm font-medium text-foreground mb-2">
                Đánh giá (1-5)
              </label>
              <input
                id="fb-rating"
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="fb-reviewer" className="block text-sm font-medium text-foreground mb-2">
                Người đánh giá
              </label>
              <input
                id="fb-reviewer"
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className={inputClass}
              />
            </div>
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
              {createMutation.isPending ? "Đang thêm..." : "Thêm phản hồi"}
            </Button>
          </div>
        </div>
      </Dialog>

      <DeleteConfirmDialog
        isOpen={!!excludeTarget}
        title="Loại bỏ phản hồi"
        description="Phản hồi này sẽ bị loại khỏi quá trình phân tích. Bạn có chắc chắn?"
        isLoading={excludeMutation.isPending}
        onConfirm={async () => {
          if (excludeTarget) {
            await excludeMutation.mutateAsync(excludeTarget.id);
            setExcludeTarget(null);
          }
        }}
        onCancel={() => setExcludeTarget(null)}
      />
    </div>
  );
}
