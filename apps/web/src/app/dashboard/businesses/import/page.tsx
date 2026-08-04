"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/common/skeleton";
import {
  useSerpApiStatus,
  useSerpApiAutocomplete,
  useSerpApiPreview,
  useCreateBusinessFromSerpApi,
} from "@/hooks/use-serpapi";
import { SerpApiPrediction, SerpApiPreview } from "@/lib/types";
import { Search, MapPin, Star, Check } from "lucide-react";

export default function BusinessImportPage() {
  const router = useRouter();
  const { data: status, isLoading: statusLoading } = useSerpApiStatus();
  const autocompleteMutation = useSerpApiAutocomplete();
  const previewMutation = useSerpApiPreview();
  const createMutation = useCreateBusinessFromSerpApi();

  const [searchTerm, setSearchTerm] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [predictions, setPredictions] = useState<SerpApiPrediction[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [preview, setPreview] = useState<SerpApiPreview | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    setError("");
    setHasSearched(true);
    setPreview(null);
    setSelectedPlaceId(null);

    const token = sessionToken || crypto.randomUUID();

    try {
      const res = await autocompleteMutation.mutateAsync({
        input: searchTerm,
        sessionToken: token,
      });
      setPredictions(res.predictions);
      setSessionToken(res.sessionToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tìm kiếm";
      setError(message);
    }
  };

  const handleSelect = async (placeId: string) => {
    setSelectedPlaceId(placeId);
    setError("");
    try {
      const result = await previewMutation.mutateAsync({ placeId, sessionToken });
      setPreview(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể xem trước";
      setError(message);
    }
  };

  const handleCreate = async () => {
    if (!preview) return;
    setError("");
    try {
      const res = await createMutation.mutateAsync({
        placeId: preview.placeId,
        sessionToken,
        includeLocation: true,
        name: preview.displayName,
        address: preview.formattedAddress,
        phone: preview.nationalPhoneNumber,
        website: preview.websiteUri,
      });
      router.push(`/dashboard/businesses/${res.business.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tạo doanh nghiệp";
      setError(message);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  if (statusLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!status?.enabled) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nhập từ Google Maps</h1>
        <EmptyState
          icon={<MapPin className="h-12 w-12" />}
          title="Tính năng chưa được bật"
          description="Tích hợp SerpApi chưa được cấu hình cho tổ chức này"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nhập từ Google Maps</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tìm kiếm doanh nghiệp trên Google Maps và tạo tự động trong Seedsight
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSearch();
            }}
            placeholder="Tìm tên doanh nghiệp, ví dụ: Highlands Coffee Hai Ba Trung..."
            className={`${inputClass} pl-10`}
          />
        </div>
        <Button
          onClick={() => {
            void handleSearch();
          }}
          disabled={autocompleteMutation.isPending || !searchTerm.trim()}
        >
          {autocompleteMutation.isPending ? "Đang tìm..." : "Tìm kiếm"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {hasSearched && !autocompleteMutation.isPending && predictions.length === 0 && !preview && (
        <p className="text-sm text-muted-foreground">Không tìm thấy kết quả phù hợp</p>
      )}

      {predictions.length > 0 && (
        <div className="border border-border rounded-lg divide-y divide-border">
          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              onClick={() => {
                void handleSelect(prediction.placeId);
              }}
              disabled={previewMutation.isPending}
              className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                selectedPlaceId === prediction.placeId ? "bg-muted/50" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{prediction.displayName}</p>
                  {prediction.formattedAddress && (
                    <p className="text-sm text-muted-foreground truncate">
                      {prediction.formattedAddress}
                    </p>
                  )}
                </div>
                {selectedPlaceId === prediction.placeId && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {preview && (
        <div className="border border-border rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{preview.displayName}</h2>
            {preview.formattedAddress && (
              <p className="text-sm text-muted-foreground mt-1">{preview.formattedAddress}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {preview.rating != null && (
              <span className="inline-flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                {preview.rating}
                {preview.userRatingCount != null && ` (${preview.userRatingCount} lượt đánh giá)`}
              </span>
            )}
            {preview.primaryType && <span>{preview.primaryType}</span>}
            {preview.nationalPhoneNumber && <span>{preview.nationalPhoneNumber}</span>}
            {preview.websiteUri && (
              <a
                href={preview.websiteUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Website
              </a>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setPreview(null);
                setSelectedPlaceId(null);
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={() => {
                void handleCreate();
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Đang tạo..." : "Tạo doanh nghiệp"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
