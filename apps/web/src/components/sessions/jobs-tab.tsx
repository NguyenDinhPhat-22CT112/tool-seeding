"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/common/skeleton";
import { StatusBadge } from "@/components/common/status-badge";
import { useFetchProcessingJobs, useRetryJob, useCancelJob } from "@/hooks/use-jobs";
import { ProcessingJobResponse } from "@/lib/types";
import { RotateCcw, XCircle, Zap } from "lucide-react";

interface JobsTabProps {
  sessionId: string;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  REVIEW_CRAWLING: "Thu thập đánh giá",
  DATA_NORMALIZATION: "Chuẩn hoá dữ liệu",
  DEDUPLICATION: "Loại trùng lặp",
  AI_FEEDBACK_ANALYSIS: "Phân tích AI feedback",
  INSIGHT_GENERATION: "Tạo insight",
  STRATEGY_GENERATION: "Tạo chiến lược",
};

function jobTypeLabel(jobType: string): string {
  return JOB_TYPE_LABELS[jobType] || jobType;
}

export function JobsTab({ sessionId }: JobsTabProps) {
  const { data, isLoading } = useFetchProcessingJobs(
    { analysisSessionId: sessionId, page: 1, pageSize: 50 },
    sessionId,
  );
  const retryMutation = useRetryJob();
  const cancelMutation = useCancelJob();

  const jobs = data?.items || [];

  const canCancel = (job: ProcessingJobResponse) =>
    job.status === "PENDING" || job.status === "RUNNING";
  const canRetry = (job: ProcessingJobResponse) => job.status === "FAILED";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Công việc xử lý</h3>
        <p className="text-sm text-muted-foreground">{jobs.length} công việc</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-10 text-center">
          <Zap className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Chưa có công việc xử lý nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground">{jobTypeLabel(job.jobType)}</p>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span>ID: {job.id}</span>
                    {job.progress != null && <span>Tiến độ: {job.progress}%</span>}
                    {job.totalItems != null && (
                      <span>
                        {job.processedItems ?? 0}/{job.totalItems} mục
                      </span>
                    )}
                    {job.errorMessage && (
                      <span className="text-red-400 w-full truncate">{job.errorMessage}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tạo lúc: {new Date(job.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {canRetry(job) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryMutation.mutate(job.id)}
                      disabled={retryMutation.isPending}
                    >
                      <RotateCcw />
                      Thử lại
                    </Button>
                  )}
                  {canCancel(job) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => cancelMutation.mutate(job.id)}
                      disabled={cancelMutation.isPending}
                    >
                      <XCircle />
                      Hủy
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
