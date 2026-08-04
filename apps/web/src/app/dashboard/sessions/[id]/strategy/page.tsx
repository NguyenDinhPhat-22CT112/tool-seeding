"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useFetchStrategy, useFetchStrategyVersions, useArchiveStrategyVersion } from "@/hooks/use-strategy";
import { StrategyVersionCard } from "@/components/insights/strategy-card";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/common/skeleton";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/business/delete-dialogs";
import { Target, Plus } from "lucide-react";

export default function StrategyPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);

  const { data: strategy } = useFetchStrategy(sessionId);
  const { data: versionsData, isLoading } = useFetchStrategyVersions(sessionId);
  const archiveMutation = useArchiveStrategyVersion(sessionId);

  const versions = versionsData?.items || [];
  const archiveTarget = versions.find((v) => v.id === archiveTargetId);
  const currentVersion =
    versions.find((v) => v.status === "APPROVED" || v.status === "LOCKED") ||
    (strategy?.currentVersionId
      ? versions.find((v) => v.id === strategy.currentVersionId)
      : undefined) ||
    versions[0];

  if (versions.length === 0 && !isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Chiến lược</h1>
          <p className="text-sm text-muted-foreground mt-1">Các phiên bản chiến lược của đợt phân tích</p>
        </div>

        <EmptyState
          icon={<Target className="h-12 w-12" />}
          title="Chưa có phiên bản chiến lược nào"
          description="Phiên bản chiến lược sẽ được tạo sau khi hoàn tất quá trình phân tích insight"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Chiến lược</h1>
          <p className="text-sm text-muted-foreground mt-1">Các phiên bản chiến lược của đợt phân tích</p>
        </div>
        {strategy?.currentVersionId == null && versions.length === 0 && (
          <Button disabled>
            <Plus />
            Tạo phiên bản chiến lược
          </Button>
        )}
      </div>

      {currentVersion && (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-3">Phiên bản hiện tại</p>
          <StrategyVersionCard
            version={currentVersion}
            sessionId={sessionId}
            isCurrent
          />
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Lịch sử phiên bản</h2>
        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            : versions
                .filter((v) => v.id !== currentVersion?.id)
                .map((version) => (
                  <StrategyVersionCard
                    key={version.id}
                    version={version}
                    sessionId={sessionId}
                    onArchive={(id) => setArchiveTargetId(id)}
                    isArchivingId={archiveMutation.isPending ? archiveTargetId || undefined : undefined}
                  />
                ))}
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={!!archiveTargetId}
        title="Lưu trữ phiên bản chiến lược"
        description={
          archiveTarget
            ? `Bạn có chắc chắn muốn lưu trữ phiên bản ${archiveTarget.versionNo}?`
            : "Bạn có chắc chắn muốn lưu trữ phiên bản này?"
        }
        isLoading={archiveMutation.isPending}
        onConfirm={async () => {
          if (archiveTargetId) {
            await archiveMutation.mutateAsync(archiveTargetId);
            setArchiveTargetId(null);
          }
        }}
        onCancel={() => setArchiveTargetId(null)}
      />
    </div>
  );
}
