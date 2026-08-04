"use client";

import Link from "next/link";
import { InsightListItemResponse } from "@/lib/types";
import { InsightStatusBadge, InsightOriginBadge, PriorityBadge, ConfidenceScore } from "./insight-status";
import { Button } from "@/components/ui/button";
import { Trash2, Flag } from "lucide-react";

interface InsightCardProps {
  insight: InsightListItemResponse;
  sessionId: string;
  onDelete?: (id: string) => void;
  isDeletingId?: string;
  canManage?: boolean;
}

export function InsightCard({
  insight,
  sessionId,
  onDelete,
  isDeletingId,
  canManage = true,
}: InsightCardProps) {
  return (
    <Link href={`/dashboard/sessions/${sessionId}/insights/${insight.id}`}>
      <div className="border border-border rounded-lg p-4 hover:border-muted-foreground/30 transition-colors cursor-pointer group">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {insight.title}
            </h3>
          </div>
          <InsightStatusBadge status={insight.status} className="ml-2 flex-shrink-0" />
        </div>

        {insight.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{insight.description}</p>
        )}

        <div className="space-y-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <InsightOriginBadge origin={insight.origin} />
            <PriorityBadge priority={insight.priority} />
            {insight.isFlagged && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-500/10 text-pink-700 dark:text-pink-400">
                <Flag className="w-3 h-3" />
                Đánh dấu
              </span>
            )}
          </div>
          <ConfidenceScore score={insight.confidence} />
          {insight.evidenceCount > 0 && (
            <p className="text-xs text-muted-foreground">{insight.evidenceCount} bằng chứng</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Cập nhật: {new Date(insight.updatedAt).toLocaleDateString("vi-VN")}
          </p>
          {onDelete && insight.status !== "ARCHIVED" && canManage && (
            <div onClick={(e) => e.preventDefault()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(insight.id)}
                disabled={isDeletingId === insight.id}
                className="h-8 w-8 p-0"
                aria-label="Lưu trữ"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
