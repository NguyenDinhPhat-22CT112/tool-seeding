import Link from "next/link";
import { AnalysisSessionListItemResponse } from "@/lib/types";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Archive, Building2, ChevronRight, Trash2 } from "lucide-react";

interface SessionCardProps {
  session: AnalysisSessionListItemResponse;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  isArchiveId?: string;
  isDeletingId?: string;
}

export function SessionCard({
  session,
  onArchive,
  onDelete,
  isArchiveId,
  isDeletingId,
}: SessionCardProps) {
  return (
    <div className="border border-border rounded-lg p-4 hover:border-muted-foreground/30 transition-colors">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground line-clamp-1">{session.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {session.feedbackCount} phản hồi
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {session.businessName || "Không xác định"}
          </p>
        </div>
        <StatusBadge status={session.status} />
      </div>

      {session.objective && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{session.objective}</p>
      )}

      <p className="text-xs text-muted-foreground mb-3">
        Cập nhật: {new Date(session.updatedAt).toLocaleDateString("vi-VN")}
      </p>

      <div className="flex gap-2">
        <Link href={`/dashboard/sessions/${session.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            Xem chi tiết
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
        {onArchive && session.status !== "ARCHIVED" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive(session.id)}
            disabled={isArchiveId === session.id}
            title="Lưu trữ"
            aria-label="Lưu trữ"
          >
            <Archive className="w-3 h-3" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(session.id)}
            disabled={isDeletingId === session.id}
            className="text-destructive hover:text-destructive"
            title="Xóa vĩnh viễn"
            aria-label="Xóa vĩnh viễn"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
