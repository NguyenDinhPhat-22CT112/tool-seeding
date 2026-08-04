"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/common/skeleton";
import { LocationTable } from "@/components/business/location-table";
import { EditBusinessDialog } from "@/components/business/form-dialogs";
import { BusinessDeleteDialog } from "@/components/business/delete-dialogs";
import {
  useFetchBusiness,
  useFetchLocations,
  useUpdateBusiness,
  useDeleteBusiness,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from "@/hooks/use-businesses";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";

export default function BusinessDetailPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params?.id as string;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteBusinessDialogOpen, setDeleteBusinessDialogOpen] = useState(false);

  const { data: business, isLoading: businessLoading } = useFetchBusiness(businessId);
  const { data: locations = [], isLoading: locationsLoading } = useFetchLocations(businessId);
  const updateBusinessMutation = useUpdateBusiness(businessId);
  const deleteBusinessMutation = useDeleteBusiness();
  const createLocationMutation = useCreateLocation(businessId);
  const updateLocationMutation = useUpdateLocation(businessId);
  const deleteLocationMutation = useDeleteLocation(businessId);

  const handleDeleteBusiness = async () => {
    try {
      await deleteBusinessMutation.mutateAsync(businessId);
      router.push("/dashboard/businesses");
    } catch {
      setDeleteBusinessDialogOpen(false);
    }
  };

  if (businessLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Quay lại
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Không tìm thấy doanh nghiệp</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{business.name}</h1>
            {business.industry && (
              <p className="text-muted-foreground mt-1">{business.industry}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setEditDialogOpen(true)}>
            <Pencil />
            Sửa
          </Button>
          <Button
            variant="outline"
            className="text-red-400 hover:text-red-300"
            onClick={() => setDeleteBusinessDialogOpen(true)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Trạng thái</p>
          <span
            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
              business.isActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
            }`}
          >
            {business.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
          </span>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Số cơ sở</p>
          <p className="text-2xl font-bold text-foreground">{locations.length}</p>
        </div>
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Website</p>
          {business.website ? (
            <a
              href={business.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline break-all"
            >
              {business.website}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa cập nhật</p>
          )}
        </div>
      </div>

      {business.description && (
        <div className="border border-border rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Mô tả</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{business.description}</p>
        </div>
      )}

      <LocationTable
        locations={locations}
        isLoading={locationsLoading}
        onUpdate={async (locationId, data) => {
          if (locationId === "__create__") {
            await createLocationMutation.mutateAsync(data);
          } else {
            await updateLocationMutation.mutateAsync({ locationId, data });
          }
        }}
        onDelete={async (locationId) => {
          await deleteLocationMutation.mutateAsync(locationId);
        }}
      />

      <EditBusinessDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        business={business}
        isLoading={updateBusinessMutation.isPending}
        onSubmit={async (data) => {
          await updateBusinessMutation.mutateAsync(data);
          setEditDialogOpen(false);
        }}
      />

      <BusinessDeleteDialog
        isOpen={deleteBusinessDialogOpen}
        businessName={business.name}
        isLoading={deleteBusinessMutation.isPending}
        onConfirm={handleDeleteBusiness}
        onCancel={() => setDeleteBusinessDialogOpen(false)}
      />
    </div>
  );
}
