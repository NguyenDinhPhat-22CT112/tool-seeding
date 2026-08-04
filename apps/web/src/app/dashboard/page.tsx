"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/common/skeleton";
import { StatusBadge } from "@/components/common/status-badge";
import { useFetchBusinesses } from "@/hooks/use-businesses";
import { useFetchSessions } from "@/hooks/use-sessions";
import { Building2, FileText, Plus, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { data: businessesData, isLoading: businessesLoading } = useFetchBusinesses({
    page: 1,
    pageSize: 5,
  });
  const { data: sessionsData, isLoading: sessionsLoading } = useFetchSessions({
    page: 1,
    pageSize: 5,
  });

  const businesses = businessesData?.items || [];
  const sessions = sessionsData?.items || [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Tổng quan về các chiến lược seeding của bạn.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Link href="/dashboard/businesses">
          <Button variant="outline" className="w-full h-auto flex-col items-start gap-2 p-4">
            <Building2 className="h-5 w-5" />
            <span className="text-base font-semibold">{businessesLoading ? "..." : businesses.length}</span>
            <span className="text-sm text-muted-foreground font-normal">Doanh nghiệp</span>
          </Button>
        </Link>
        <Link href="/dashboard/sessions">
          <Button variant="outline" className="w-full h-auto flex-col items-start gap-2 p-4">
            <FileText className="h-5 w-5" />
            <span className="text-base font-semibold">{sessionsLoading ? "..." : sessions.length}</span>
            <span className="text-sm text-muted-foreground font-normal">Đợt phân tích gần đây</span>
          </Button>
        </Link>
        <Link href="/dashboard/businesses">
          <Button variant="outline" className="w-full h-auto flex-col items-start gap-2 p-4">
            <Plus className="h-5 w-5" />
            <span className="text-base font-semibold">Bắt đầu</span>
            <span className="text-sm text-muted-foreground font-normal">Tạo doanh nghiệp mới</span>
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Doanh nghiệp gần đây</h2>
          <Link href="/dashboard/businesses">
            <Button variant="ghost" size="sm" className="gap-1">
              Xem tất cả
              <ArrowRight />
            </Button>
          </Link>
        </div>

        {businessesLoading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : businesses.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {businesses.map((business) => (
              <Link key={business.id} href={`/dashboard/businesses/${business.id}`}>
                <div className="rounded-lg border border-border bg-card p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{business.name}</h3>
                      {business.industry && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {business.industry}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {business.sessionCount} đợt phân tích
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Building2 className="h-12 w-12" />}
            title="Chưa có doanh nghiệp nào"
            description="Tạo doanh nghiệp đầu tiên để bắt đầu phân tích"
            action={
              <Link href="/dashboard/businesses">
                <Button>Tạo doanh nghiệp</Button>
              </Link>
            }
          />
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Đợt phân tích gần đây</h2>
          <Link href="/dashboard/sessions">
            <Button variant="ghost" size="sm" className="gap-1">
              Xem tất cả
              <ArrowRight />
            </Button>
          </Link>
        </div>

        {sessionsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link key={session.id} href={`/dashboard/sessions/${session.id}`}>
                <div className="rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{session.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Cập nhật: {new Date(session.updatedAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="Chưa có đợt phân tích nào"
            description="Tạo đợt phân tích đầu tiên để bắt đầu"
            action={
              <Link href="/dashboard/sessions">
                <Button>Tạo đợt phân tích</Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
