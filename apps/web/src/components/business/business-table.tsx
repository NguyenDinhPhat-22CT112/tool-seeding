"use client";

import Link from "next/link";
import { BusinessListItemResponse } from "@/lib/types";
import { Skeleton } from "@/components/common/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronRight, Trash2 } from "lucide-react";

interface BusinessTableProps {
  businesses: BusinessListItemResponse[];
  isLoading?: boolean;
  onDelete?: (businessId: string) => void;
  isDeletingId?: string;
}

export function BusinessTable({
  businesses,
  isLoading = false,
  onDelete,
  isDeletingId,
}: BusinessTableProps) {
  if (isLoading) {
    return (
      <div className="border border-muted-foreground/10 rounded-lg overflow-hidden">
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="border border-dashed border-muted-foreground/20 rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Không tìm thấy doanh nghiệp</p>
      </div>
    );
  }

  return (
    <div className="border border-muted-foreground/10 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30 border-b border-muted-foreground/10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Tên</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Số đợt phân tích</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted-foreground/10">
            {businesses.map((business) => (
              <tr key={business.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{business.name}</div>
                  {business.industry && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{business.industry}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {business.sessionCount}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      business.isActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {business.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/businesses/${business.id}`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        <span>Xem</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400 hover:text-red-300 gap-1"
                      onClick={() => onDelete?.(business.id)}
                      disabled={isDeletingId === business.id}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Xóa</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
