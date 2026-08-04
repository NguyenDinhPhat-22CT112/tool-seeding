"use client";

import { useState } from "react";
import { BusinessLocationResponse, CreateBusinessLocationRequest } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/common/skeleton";
import { LocationForm } from "@/components/business/location-form";
import { LocationDeleteDialog } from "@/components/business/delete-dialogs";
import { MapPin, Pencil, Trash2 } from "lucide-react";

interface LocationTableProps {
  locations: BusinessLocationResponse[];
  isLoading?: boolean;
  onUpdate?: (id: string, data: CreateBusinessLocationRequest) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isDeletingId?: string;
  onCreated?: () => void;
}

export function LocationTable({
  locations,
  isLoading = false,
  onUpdate,
  onDelete,
  isDeletingId,
  onCreated,
}: LocationTableProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<BusinessLocationResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessLocationResponse | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const handleCreate = async (data: CreateBusinessLocationRequest) => {
    setIsMutating(true);
    try {
      await onUpdate?.("__create__", data);
      setShowCreateDialog(false);
      onCreated?.();
    } catch {
      throw new Error("Không thể tạo cơ sở");
    } finally {
      setIsMutating(false);
    }
  };

  const handleEdit = async (data: CreateBusinessLocationRequest) => {
    if (!editingLocation) return;
    setIsMutating(true);
    try {
      await onUpdate?.(editingLocation.id, data);
      setEditingLocation(null);
    } catch {
      throw new Error("Không thể cập nhật cơ sở");
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Các cơ sở</h3>
          <p className="text-sm text-muted-foreground">
            {locations.length} cơ sở được liên kết với doanh nghiệp này
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <MapPin />
          Thêm cơ sở
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-10 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Chưa có cơ sở nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((location) => (
            <div
              key={location.id}
              className="flex items-start justify-between gap-4 border border-border rounded-lg p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{location.name}</p>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      location.source === "SERPAPI"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {location.source === "SERPAPI" ? "Từ SerpApi" : "Thủ công"}
                  </span>
                </div>
                {location.address && (
                  <p className="text-sm text-muted-foreground mt-1">{location.address}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                  {location.phone && <span>{location.phone}</span>}
                  {location.website && (
                    <span className="truncate max-w-64">{location.website}</span>
                  )}
                  {location.rating != null && (
                    <span>
                      Đánh giá: {location.rating}
                      {location.userRatingCount != null && ` (${location.userRatingCount} lượt)`}
                    </span>
                  )}
                  {location.primaryType && <span>{location.primaryType}</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setEditingLocation(location)}
                  aria-label="Chỉnh sửa"
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => setDeleteTarget(location)}
                  disabled={isDeletingId === location.id}
                  aria-label="Xóa"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Thêm cơ sở mới"
        description="Thêm cơ sở cho doanh nghiệp"
      >
        <LocationForm
          isLoading={isMutating}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateDialog(false)}
        />
      </Dialog>

      <Dialog
        isOpen={!!editingLocation}
        onClose={() => setEditingLocation(null)}
        title="Cập nhật cơ sở"
        description="Cập nhật thông tin cơ sở"
      >
        {editingLocation && (
          <LocationForm
            location={editingLocation}
            isLoading={isMutating}
            onSubmit={handleEdit}
            onCancel={() => setEditingLocation(null)}
          />
        )}
      </Dialog>

      <LocationDeleteDialog
        isOpen={!!deleteTarget}
        locationName={deleteTarget?.name}
        isLoading={isDeletingId === deleteTarget?.id}
        onConfirm={async () => {
          if (deleteTarget) {
            await onDelete?.(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
