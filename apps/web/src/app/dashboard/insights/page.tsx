"use client";

import Link from "next/link";
import { Skeleton } from "@/components/common/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { useFetchSessions } from "@/hooks/use-sessions";
import { useFetchInsights } from "@/hooks/use-insights";
import { Lightbulb, ArrowRight } from "lucide-react";

const MAX_SESSIONS_TO_QUERY = 6;

export default function InsightsOverviewPage() {
  const { data: sessionsData, isLoading: sessionsLoading } = useFetchSessions({
    page: 1,
    pageSize: 20,
  });

  const sessions = sessionsData?.items || [];
  const activeSessions = sessions
    .filter((s) => s.status !== "ARCHIVED" && s.status !== "DRAFT")
    .slice(0, MAX_SESSIONS_TO_QUERY);
  const hiddenSessionsCount = Math.max(
    0,
    sessions.filter((s) => s.status !== "ARCHIVED" && s.status !== "DRAFT").length -
      MAX_SESSIONS_TO_QUERY,
  );

  if (sessionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tổng quan insight theo đợt phân tích
        </p>
      </div>

      {activeSessions.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-12 w-12" />}
          title="Chưa có insight nào"
          description="Insight sẽ xuất hiện sau khi các đợt phân tích được xử lý"
        />
      ) : (
        <div className="space-y-3">
          {activeSessions.map((session) => (
            <SessionInsightsRow key={session.id} sessionId={session.id} name={session.name} />
          ))}
          {hiddenSessionsCount > 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Và {hiddenSessionsCount} đợt phân tích khác — xem chi tiết tại từng đợt
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SessionInsightsRow({ sessionId, name }: { sessionId: string; name: string }) {
  const { data, isLoading } = useFetchInsights(sessionId, { page: 1, pageSize: 5 });

  const insights = data?.items || [];

  return (
    <Link
      href={`/dashboard/sessions/${sessionId}/insights`}
      className="block rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Lightbulb className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <h3 className="font-semibold text-foreground truncate">{name}</h3>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {isLoading ? "..." : `${insights.length} insight`}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có insight</p>
      ) : (
        <div className="space-y-2">
          {insights.slice(0, 3).map((insight) => (
            <div key={insight.id} className="flex items-center justify-between gap-2">
              <p className="text-sm text-foreground line-clamp-1 flex-1">{insight.title}</p>
              <StatusBadge status={insight.status} />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-2">
        <span className="text-xs text-primary inline-flex items-center gap-1">
          Xem chi tiết
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}
