"use client";

import Link from "next/link";
import { StrategyVersionListItemResponse } from "@/lib/types";
import { StrategyStatusBadge } from "./strategy-status";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";

interface StrategyVersionCardProps {
  version: StrategyVersionListItemResponse;
  sessionId: string;
  isCurrent?: boolean;
  onArchive?: (id: string) => void;
  isArchivingId?: string;
}

export function StrategyVersionCard({
  version,
  sessionId,
  isCurrent = false,
  onArchive,
  isArchivingId,
}: StrategyVersionCardProps) {
  const objectivesCount = version.objectives?.length || 0;

  return (
    <Link href={`/dashboard/sessions/${sessionId}/strategy/${version.id}`}>
      <div
        className={`border rounded-lg p-4 transition-colors cursor-pointer group ${
          isCurrent
            ? "border-primary/50 bg-primary/5 hover:border-primary"
            : "border-border hover:border-muted-foreground/30"
        }`}
      >
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                Phiên bản {version.versionNo}
              </h3>
              {isCurrent && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded flex-shrink-0">
                  Hiện tại
                </span>
              )}
            </div>
          </div>
          <StrategyStatusBadge status={version.status} className="ml-2 flex-shrink-0" />
        </div>

        {version.context && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{version.context}</p>
        )}

        <div className="text-xs text-muted-foreground mb-3">
          {objectivesCount} mục tiêu
          {version.aiModel && ` · ${version.aiModel}`}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Cập nhật: {new Date(version.updatedAt).toLocaleDateString("vi-VN")}
          </p>
          {onArchive && version.status !== "ARCHIVED" && version.status !== "SUPERSEDED" && (
            <div onClick={(e) => e.preventDefault()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onArchive(version.id)}
                disabled={isArchivingId === version.id}
                className="h-8 w-8 p-0"
                aria-label="Lưu trữ"
              >
                <Archive className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
