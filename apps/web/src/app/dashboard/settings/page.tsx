"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSerpApiStatus } from "@/hooks/use-serpapi";
import { Skeleton } from "@/components/common/skeleton";
import { Building2, User, KeyRound } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  ORG_ADMIN: "Quản trị viên",
  ANALYST: "Nhà phân tích",
  INSIGHT_REVIEWER: "Người duyệt insight",
  STRATEGY_MANAGER: "Quản lý chiến lược",
  VIEWER: "Người xem",
};

export default function SettingsPage() {
  const { auth } = useAuth();
  const { data: serpStatus, isLoading: serpLoading } = useSerpApiStatus();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Cài đặt</h1>
        <p className="text-sm text-muted-foreground mt-1">Thông tin tài khoản và tích hợp</p>
      </div>

      <div className="border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <User className="w-5 h-5" />
          Thông tin tài khoản
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tên</p>
            <p className="text-sm font-medium text-foreground">
              {auth?.fullName || "Chưa cập nhật"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <p className="text-sm font-medium text-foreground">{auth?.email || "Chưa cập nhật"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Vai trò</p>
            <p className="text-sm font-medium text-foreground">
              {ROLE_LABELS[auth?.role || ""] || auth?.role}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">ID người dùng</p>
            <p className="text-sm font-medium text-foreground break-all">{auth?.userId}</p>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="w-5 h-5" />
          Tích hợp SerpApi
        </h2>

        {serpLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Trạng thái</p>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  serpStatus?.enabled
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                }`}
              >
                {serpStatus?.enabled ? "Đã kích hoạt" : "Chưa kích hoạt"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Cấu hình</p>
              <p className="text-sm text-muted-foreground">
                {serpStatus?.configured ? "Đã cấu hình" : "Chưa cấu hình"}
              </p>
            </div>
            {serpStatus?.autocomplete && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Autocomplete</p>
                <p className={`text-sm ${serpStatus.autocomplete.exhausted ? "text-red-400" : "text-muted-foreground"}`}>
                  {serpStatus.autocomplete.used}/{serpStatus.autocomplete.limit} lượt
                </p>
              </div>
            )}
            {serpStatus?.placeDetails && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Chi tiết địa điểm</p>
                <p className={`text-sm ${serpStatus.placeDetails.exhausted ? "text-red-400" : "text-muted-foreground"}`}>
                  {serpStatus.placeDetails.used}/{serpStatus.placeDetails.limit} lượt
                </p>
              </div>
            )}
            {serpStatus?.reviews && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Thu thập đánh giá</p>
                <p className={`text-sm ${serpStatus.reviews.exhausted ? "text-red-400" : "text-muted-foreground"}`}>
                  {serpStatus.reviews.used}/{serpStatus.reviews.limit} lượt
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Tổ chức
        </h2>
        <p className="text-sm text-muted-foreground">
          ID tổ chức: <span className="font-medium text-foreground">{auth?.organizationId}</span>
        </p>
      </div>
    </div>
  );
}
