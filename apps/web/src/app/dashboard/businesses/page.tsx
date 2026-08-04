"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Building2, Search, Plus, MapPin } from "lucide-react";
import { useFetchBusinesses, useDeleteBusiness, useCreateBusiness } from "@/hooks/use-businesses";
import { CreateBusinessRequest } from "@/lib/types";
import { BusinessTable } from "@/components/business/business-table";
import { CreateBusinessDialog } from "@/components/business/form-dialogs";
import { BusinessDeleteDialog } from "@/components/business/delete-dialogs";

export default function BusinessesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const { data, isLoading } = useFetchBusinesses({ search: searchTerm || undefined });
  const deleteMutation = useDeleteBusiness();
  const createMutation = useCreateBusiness();

  const businesses = data?.items || [];
  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);

  const handleDeleteConfirm = async () => {
    if (selectedBusinessId) {
      try {
        await deleteMutation.mutateAsync(selectedBusinessId);
        setDeleteDialogOpen(false);
        setSelectedBusinessId(null);
      } catch {
        setDeleteDialogOpen(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Doanh nghiệp</h1>
          <p className="text-sm text-muted-foreground">Quản lý các doanh nghiệp đang được phân tích</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/businesses/import">
            <Button variant="outline">
              <MapPin />
              Nhập từ Google Maps
            </Button>
          </Link>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus />
            Tạo doanh nghiệp
          </Button>
        </div>
      </div>

      {businesses.length === 0 && !isLoading && !searchTerm ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="Chưa có doanh nghiệp nào"
          description="Tạo doanh nghiệp đầu tiên để bắt đầu phân tích chiến lược"
          action={<Button onClick={() => setShowCreateDialog(true)}>Tạo doanh nghiệp</Button>}
        />
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm doanh nghiệp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <BusinessTable
            businesses={businesses}
            isLoading={isLoading}
            onDelete={(id) => {
              setSelectedBusinessId(id);
              setDeleteDialogOpen(true);
            }}
            isDeletingId={deleteMutation.isPending ? selectedBusinessId || undefined : undefined}
          />
        </>
      )}

      <CreateBusinessDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        isLoading={createMutation.isPending}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data as CreateBusinessRequest);
          setShowCreateDialog(false);
        }}
      />

      <BusinessDeleteDialog
        isOpen={deleteDialogOpen}
        businessName={selectedBusiness?.name}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedBusinessId(null);
        }}
      />
    </div>
  );
}
