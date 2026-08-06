"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/common/skeleton";
import { StatusBadge } from "@/components/common/status-badge";
import { useFetchDataSources } from "@/hooks/use-data-sources";
import { useFetchSession } from "@/hooks/use-sessions";
import { useFetchLocations } from "@/hooks/use-businesses";
import { useTriggerReviewCrawl } from "@/hooks/use-review-crawl";
import { DataSourceResponse } from "@/lib/types";
import { MapPin, Search, RefreshCw, Trash2, CheckCircle2 } from "lucide-react";

interface DataSourcesTabProps {
  sessionId: string;
}

export function DataSourcesTab({ sessionId }: DataSourcesTabProps) {
  const queryClient = useQueryClient();
  const { data: session } = useFetchSession(sessionId);
  const { data: locations, isLoading: locationsLoading } = useFetchLocations(
    session?.businessId,
  );
  const { data: dataSources, isLoading: dataSourcesLoading } = useFetchDataSources(sessionId);
  const crawlMutation = useTriggerReviewCrawl(sessionId);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const linkedLocations =
    locations?.filter((l) => l.serpapiPlaceId && l.serpapiPlaceId.length > 0) || [];
  const crawledSources = dataSources || [];

  const handleCrawl = async (locationId: string, locationName: string) => {
    setError("");
    setSuccess("");
    try {
      const result = await crawlMutation.mutateAsync({ businessLocationId: locationId });
      setSuccess(
        result.idempotent
          ? `Đã có dữ liệu cho "${locationName}" — sử dụng lại dữ liệu cũ.`
          : `Đang thu thập đánh giá cho "${locationName}"... Quá trình chạy nền, kiểm tra tab "Công việc" để theo dõi.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["data-sources", sessionId] });
      void queryClient.invalidateQueries({ queryKey: ["jobs", sessionId] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể thu thập dữ liệu";
      setError(message);
    }
  };

  if (locationsLoading || dataSourcesLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Thu thập đánh giá</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Chọn địa điểm của doanh nghiệp đã liên kết Google Maps để cào đánh giá về phân tích
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">
            Địa điểm đã liên kết Google Maps ({linkedLocations.length})
          </h4>

          {linkedLocations.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg py-8 text-center">
              <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Doanh nghiệp này chưa có địa điểm nào liên kết Google Maps
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Vào trang doanh nghiệp &gt; &quot;Nhập từ Google Maps&quot; để thêm địa điểm
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {linkedLocations.map((location) => {
                const crawled = crawledSources.find(
                  (ds) => ds.businessLocationId === location.id,
                );
                return (
                  <div
                    key={location.id}
                    className="flex items-start justify-between gap-4 border border-border rounded-lg p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="font-medium text-foreground">{location.name}</p>
                        {location.rating != null && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400">
                            ★ {location.rating}
                            {location.userRatingCount != null &&
                              ` (${location.userRatingCount} lượt)`}
                          </span>
                        )}
                      </div>
                      {location.address && (
                        <p className="text-sm text-muted-foreground mt-1">{location.address}</p>
                      )}
                      {crawled && (
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={crawled.status} />
                          {crawled.totalRecords != null && (
                            <span className="text-xs text-muted-foreground">
                              {crawled.totalRecords} đánh giá
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={crawled ? "outline" : "default"}
                      onClick={() => void handleCrawl(location.id, location.name)}
                      disabled={crawlMutation.isPending}
                      className="shrink-0"
                    >
                      {crawlMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Đang thu thập...
                        </>
                      ) : crawled && crawled.status === "COMPLETED" ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Cào lại
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Cào đánh giá
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {crawledSources.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">
              Nguồn dữ liệu đã thu thập ({crawledSources.length})
            </h4>
            <div className="space-y-2">
              {crawledSources.map((ds: DataSourceResponse) => (
                <div
                  key={ds.id}
                  className="flex items-center justify-between gap-4 border border-border rounded-lg px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{ds.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <StatusBadge status={ds.status} />
                      {ds.totalRecords != null && <span>Tổng: {ds.totalRecords}</span>}
                      {ds.validRecords != null && <span>Hợp lệ: {ds.validRecords}</span>}
                      {ds.errorRecords != null && <span>Lỗi: {ds.errorRecords}</span>}
                    </div>
                  </div>
                  <Trash2 className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
