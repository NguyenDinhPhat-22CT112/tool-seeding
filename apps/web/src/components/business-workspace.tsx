"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  Edit3,
  Globe2,
  LayoutDashboard,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import type {
  AnalysisSessionListItemResponse,
  AnalysisSessionListResponse,
  BusinessDetailResponse,
  BusinessListItemResponse,
  BusinessListResponse,
  BusinessLocationResponse,
} from "@seeding/contracts";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DialogName =
  | "manual"
  | "edit"
  | "location"
  | "session"
  | null;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  DATA_COLLECTION: "Đang thu thập",
  PROCESSING: "Đang xử lý",
  ANALYZING: "Đang phân tích",
  INSIGHT_REVIEW: "Đang duyệt insight",
  STRATEGY_BUILDING: "Đang xây chiến lược",
  COMPLETED: "Hoàn tất",
  ARCHIVED: "Đã lưu trữ",
};

export function BusinessWorkspace() {
  const queryClient = useQueryClient();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    null,
  );
  const [dialog, setDialog] = useState<DialogName>(null);
  const [locationToEdit, setLocationToEdit] =
    useState<BusinessLocationResponse | null>(null);
  const [search, setSearch] = useState("");

  const businessesQuery = useQuery({
    queryKey: ["businesses", search],
    queryFn: () =>
      apiClient.get<BusinessListResponse>(
        `/businesses?pageSize=100${
          search ? `&search=${encodeURIComponent(search)}` : ""
        }`,
      ),
  });

  useEffect(() => {
    const first = businessesQuery.data?.items[0];
    if (!selectedBusinessId && first) setSelectedBusinessId(first.id);
  }, [businessesQuery.data, selectedBusinessId]);

  const selectedBusinessQuery = useQuery({
    queryKey: ["business", selectedBusinessId],
    queryFn: () =>
      apiClient.get<BusinessDetailResponse>(
        `/businesses/${selectedBusinessId}`,
      ),
    enabled: Boolean(selectedBusinessId),
  });

  const businesses = businessesQuery.data?.items ?? [];
  const activeCount = businesses.filter((item) => item.isActive).length;
  const sessionCount = businesses.reduce(
    (total, item) => total + item.sessionCount,
    0,
  );

  function refreshBusinesses(id?: string) {
    void queryClient.invalidateQueries({ queryKey: ["businesses"] });
    if (id) {
      setSelectedBusinessId(id);
      void queryClient.invalidateQueries({ queryKey: ["business", id] });
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7f4] text-[#162019]">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="min-w-0 flex-1 px-5 py-5 lg:px-8 lg:py-7">
          <header className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#758078]">
                Không gian làm việc
              </p>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#17201a] md:text-3xl">
                Doanh nghiệp
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="h-11 rounded-xl bg-[#164f35] px-4 shadow-[0_8px_20px_rgba(22,79,53,0.16)] hover:bg-[#103e2a]"
                onClick={() => setDialog("manual")}
              >
                <Plus size={17} />
                Tạo thủ công
              </Button>
              <div className="ml-1 grid size-10 place-items-center rounded-full bg-[#e6b85c] text-sm font-bold text-[#44300a]">
                AD
              </div>
            </div>
          </header>

          <div className="mx-auto mt-7 max-w-[1500px]">
            <section className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                icon={<Building2 size={19} />}
                label="Doanh nghiệp"
                value={businesses.length}
                note={`${activeCount} đang hoạt động`}
                tone="green"
              />
              <MetricCard
                icon={<Activity size={19} />}
                label="Đợt phân tích"
                value={sessionCount}
                note="trong toàn bộ doanh nghiệp"
                tone="gold"
              />
            </section>

            <section className="mt-5 grid min-h-[680px] gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[22px] border border-[#e2e6df] bg-white shadow-[0_12px_40px_rgba(28,40,31,0.055)]">
                <div className="border-b border-[#edf0eb] p-4">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b948c]"
                      size={17}
                    />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="h-11 w-full rounded-xl border border-[#e0e5df] bg-[#f9faf8] pl-10 pr-3 text-sm outline-none transition focus:border-[#7aa18c] focus:bg-white focus:ring-4 focus:ring-[#dfece5]"
                      placeholder="Tìm doanh nghiệp..."
                      aria-label="Tìm doanh nghiệp"
                    />
                  </div>
                </div>

                <div className="max-h-[620px] space-y-2 overflow-y-auto p-3">
                  {businessesQuery.isLoading ? (
                    <BusinessListSkeleton />
                  ) : businesses.length === 0 ? (
                    <EmptyBusinesses
                      onCreate={() => setDialog("manual")}
                    />
                  ) : (
                    businesses.map((business) => (
                      <BusinessRow
                        key={business.id}
                        business={business}
                        selected={business.id === selectedBusinessId}
                        onClick={() => setSelectedBusinessId(business.id)}
                      />
                    ))
                  )}
                </div>
              </div>

              {selectedBusinessQuery.data ? (
                <BusinessDetailPanel
                  business={selectedBusinessQuery.data}
                  onEdit={() => setDialog("edit")}
                  onAddManualLocation={() => {
                    setLocationToEdit(null);
                    setDialog("location");
                  }}
                  onEditLocation={(location) => {
                    setLocationToEdit(location);
                    setDialog("location");
                  }}
                  onCreateSession={() => setDialog("session")}
                  onRefresh={() => refreshBusinesses(selectedBusinessQuery.data.id)}
                />
              ) : (
                <DetailPlaceholder loading={selectedBusinessQuery.isLoading} />
              )}
            </section>
          </div>
        </main>
      </div>

      {dialog === "manual" && (
        <BusinessFormDialog
          title="Tạo doanh nghiệp"
          description="Bắt đầu bằng thông tin cốt lõi. Bạn có thể bổ sung hồ sơ sau."
          onClose={() => setDialog(null)}
          onSaved={(business) => {
            setDialog(null);
            refreshBusinesses(business.id);
          }}
        />
      )}

      {dialog === "edit" && selectedBusinessQuery.data && (
        <BusinessFormDialog
          title="Chỉnh sửa hồ sơ"
          description="Thông tin này sẽ được dùng làm ngữ cảnh cho các đợt phân tích mới."
          business={selectedBusinessQuery.data}
          onClose={() => setDialog(null)}
          onSaved={(business) => {
            setDialog(null);
            refreshBusinesses(business.id);
          }}
        />
      )}

      {dialog === "location" && selectedBusinessId && (
        <LocationFormDialog
          businessId={selectedBusinessId}
          location={locationToEdit}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            void queryClient.invalidateQueries({
              queryKey: ["locations", selectedBusinessId],
            });
          }}
        />
      )}

      {dialog === "session" && selectedBusinessId && (
        <SessionDialog
          businessId={selectedBusinessId}
          onClose={() => setDialog(null)}
          onCreated={() => {
            setDialog(null);
            void queryClient.invalidateQueries({
              queryKey: ["sessions", selectedBusinessId],
            });
            refreshBusinesses(selectedBusinessId);
          }}
        />
      )}
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-[238px] shrink-0 border-r border-[#e2e5df] bg-[#fbfcfa] px-4 py-6 lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-2">
        <div className="grid size-10 place-items-center rounded-[13px] bg-[#164f35] text-white shadow-[0_8px_18px_rgba(22,79,53,0.18)]">
          <Sparkles size={20} />
        </div>
        <div>
          <p className="text-[17px] font-bold tracking-[-0.03em]">Seedsight</p>
          <p className="text-[11px] font-medium text-[#849087]">Strategy workspace</p>
        </div>
      </div>

      <nav className="mt-9 space-y-1.5">
        <NavItem icon={<LayoutDashboard size={18} />} label="Tổng quan" />
        <NavItem icon={<Building2 size={18} />} label="Doanh nghiệp" active />
        <NavItem icon={<Target size={18} />} label="Đợt phân tích" />
        <NavItem icon={<Database size={18} />} label="Nguồn dữ liệu" disabled />
        <NavItem icon={<Sparkles size={18} />} label="Insight" disabled />
      </nav>

      <div className="mt-auto rounded-2xl border border-[#dce5de] bg-[#edf5f0] p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#24563f]">
          <Check size={16} />
          Module 1 sẵn sàng
        </div>
        <p className="text-xs leading-5 text-[#637469]">
          Hồ sơ doanh nghiệp và đợt phân tích đã được kết nối.
        </p>
      </div>

      <button className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#647068] hover:bg-[#f0f2ef]">
        <Settings size={17} />
        Cài đặt
      </button>
      <div className="mt-3 flex gap-3 px-3 text-[11px] text-[#78837b]">
        <a href="/terms" className="hover:text-[#164f35]">Điều khoản</a>
        <a href="/privacy" className="hover:text-[#164f35]">Riêng tư</a>
      </div>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  active,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
        active
          ? "bg-[#e5f0e9] text-[#164f35]"
          : "text-[#667168] hover:bg-[#f1f3f0] hover:text-[#26342a]",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      {icon}
      {label}
      {active && <span className="ml-auto size-1.5 rounded-full bg-[#2e7b54]" />}
    </button>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  note: string;
  tone: "green" | "gold" | "blue";
}) {
  const tones = {
    green: "bg-[#e5f1ea] text-[#236344]",
    gold: "bg-[#fff1d5] text-[#89601b]",
    blue: "bg-[#e5eef7] text-[#315f82]",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#e2e6df] bg-white px-5 py-4 shadow-[0_8px_25px_rgba(28,40,31,0.035)]">
      <div className={cn("grid size-11 place-items-center rounded-xl", tones[tone])}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-[#7b867e]">{label}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-xl font-semibold tracking-[-0.03em]">{value}</span>
          <span className="text-xs text-[#929b94]">{note}</span>
        </div>
      </div>
    </div>
  );
}

function BusinessRow({
  business,
  selected,
  onClick,
}: {
  business: BusinessListItemResponse;
  selected: boolean;
  onClick: () => void;
}) {
  const initials = business.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
        selected
          ? "border-[#bcd3c5] bg-[#eef5f1] shadow-[0_5px_16px_rgba(30,77,50,0.06)]"
          : "border-transparent hover:border-[#e4e8e2] hover:bg-[#f9faf8]",
      )}
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e9ece7] text-sm font-bold text-[#526057]">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{business.name}</p>
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              business.isActive ? "bg-[#45a06d]" : "bg-[#aeb5af]",
            )}
          />
        </div>
        <p className="mt-1 truncate text-xs text-[#7f8981]">
          {business.industry ?? "Chưa xác định ngành"} · {business.sessionCount} đợt phân tích
        </p>
      </div>
      <ChevronRight
        size={17}
        className={cn(
          "text-[#a5ada7] transition",
          selected && "translate-x-0.5 text-[#47745b]",
        )}
      />
    </button>
  );
}

function BusinessDetailPanel({
  business,
  onEdit,
  onAddManualLocation,
  onEditLocation,
  onCreateSession,
  onRefresh,
}: {
  business: BusinessDetailResponse;
  onEdit: () => void;
  onAddManualLocation: () => void;
  onEditLocation: (location: BusinessLocationResponse) => void;
  onCreateSession: () => void;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const locationsQuery = useQuery({
    queryKey: ["locations", business.id],
    queryFn: () =>
      apiClient.get<{ items: BusinessLocationResponse[] }>(
        `/businesses/${business.id}/locations`,
      ),
  });
  const sessionsQuery = useQuery({
    queryKey: ["sessions", business.id],
    queryFn: () =>
      apiClient.get<AnalysisSessionListResponse>(
        `/businesses/${business.id}/analysis-sessions?pageSize=20`,
      ),
  });
  const statusMutation = useMutation({
    mutationFn: () =>
      business.isActive
        ? apiClient.post(`/businesses/${business.id}/deactivate`)
        : apiClient.post(`/businesses/${business.id}/restore`),
    onSuccess: onRefresh,
  });

  const sessionAction = useMutation({
    mutationFn: ({
      sessionId,
      action,
    }: {
      sessionId: string;
      action: "start-data-collection" | "complete" | "archive";
    }) => apiClient.post(`/analysis-sessions/${sessionId}/${action}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sessions", business.id] });
      onRefresh();
    },
  });

  const locationMutation = useMutation({
    mutationFn: (location: BusinessLocationResponse) =>
      apiClient.patch(
        `/businesses/${business.id}/locations/${location.id}`,
        { isActive: !location.isActive },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["locations", business.id] }),
  });

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#e2e6df] bg-white shadow-[0_12px_40px_rgba(28,40,31,0.055)]">
      <div className="relative overflow-hidden border-b border-[#edf0eb] p-6 md:p-7">
        <div className="absolute right-0 top-0 h-40 w-56 rounded-bl-[100px] bg-[radial-gradient(circle_at_top_right,#e5f0e9,transparent_70%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  business.isActive
                    ? "bg-[#e5f3ea] text-[#2c704c]"
                    : "bg-[#eef0ed] text-[#747d76]",
                )}
              >
                {business.isActive ? "Đang hoạt động" : "Đã tạm dừng"}
              </span>
              <span className="text-xs text-[#8a948d]">
                Cập nhật {formatDate(business.updatedAt)}
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] md:text-[28px]">
              {business.name}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#707b73]">
              {business.description ??
                "Hồ sơ nền tảng cho quá trình thu thập dữ liệu, phân tích khách hàng và xây dựng chiến lược."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-[#dde3dd] bg-white"
              onClick={onEdit}
              disabled={!business.isActive}
            >
              <Edit3 size={16} />
              Chỉnh sửa
            </Button>
            <button
              aria-label="Thêm tùy chọn"
              className="grid size-10 place-items-center rounded-xl border border-[#dde3dd] text-[#6f7971] hover:bg-[#f5f7f4]"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoPill icon={<Target size={16} />} label="Ngành" value={business.industry ?? "Chưa cập nhật"} />
          <InfoPill icon={<Globe2 size={16} />} label="Website" value={shortUrl(business.website) ?? "Chưa cập nhật"} />
          <InfoPill icon={<MapPin size={16} />} label="Địa chỉ hồ sơ" value={business.address ?? "Chưa cập nhật"} />
          <InfoPill icon={<Users size={16} />} label="Khách hàng" value={business.targetAudience[0]?.segment ?? "Chưa xác định"} />
        </div>
      </div>

      <div className="grid gap-6 p-6 md:p-7 2xl:grid-cols-[1.05fr_.95fr]">
        <section>
          <SectionHeading
            title="Địa điểm"
            note={`${locationsQuery.data?.items.length ?? 0} địa điểm`}
            action="Thêm địa điểm"
            onAction={onAddManualLocation}
          />
          <div className="mt-3 space-y-3">
            {locationsQuery.data?.items.length ? (
              locationsQuery.data.items.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  onToggle={() => locationMutation.mutate(location)}
                  onEdit={() => onEditLocation(location)}
                />
              ))
            ) : (
              <SoftEmpty
                icon={<MapPin size={19} />}
                title="Chưa có địa điểm"
                text="Tạo địa điểm thủ công cho doanh nghiệp này."
                action="Thêm địa điểm"
                onAction={onAddManualLocation}
              />
            )}
          </div>
        </section>

        <section>
          <SectionHeading
            title="Đợt phân tích"
            note={`${sessionsQuery.data?.total ?? 0} đợt`}
            action="Tạo đợt mới"
            onAction={onCreateSession}
          />
          <div className="mt-3 space-y-3">
            {sessionsQuery.data?.items.length ? (
              sessionsQuery.data.items.slice(0, 4).map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  busy={sessionAction.isPending}
                  onAction={(action) =>
                    sessionAction.mutate({ sessionId: session.id, action })
                  }
                />
              ))
            ) : (
              <SoftEmpty
                icon={<Activity size={19} />}
                title="Chưa có đợt phân tích"
                text="Tạo một đợt để xác định mục tiêu và bắt đầu thu thập dữ liệu."
                action="Tạo đợt đầu tiên"
                onAction={onCreateSession}
              />
            )}
          </div>
        </section>
      </div>

      {(statusMutation.error ||
        sessionAction.error ||
        locationMutation.error) && (
        <div className="px-6 pb-4 md:px-7">
          <MutationError
            error={
              statusMutation.error ??
              sessionAction.error ??
              locationMutation.error
            }
          />
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[#edf0eb] bg-[#fbfcfa] px-6 py-4 md:px-7">
        <p className="text-xs text-[#89928b]">
          ID hồ sơ: <span className="font-mono">{business.id.slice(0, 12)}…</span>
        </p>
        <button
          onClick={() => statusMutation.mutate()}
          disabled={statusMutation.isPending}
          className={cn(
            "text-xs font-semibold",
            business.isActive ? "text-[#9a4f49]" : "text-[#2d7450]",
          )}
        >
          {business.isActive ? "Tạm dừng doanh nghiệp" : "Khôi phục doanh nghiệp"}
        </button>
      </div>
    </div>
  );
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#e7ebe5] bg-[#fbfcfa] p-3">
      <div className="flex items-center gap-2 text-[11px] font-medium text-[#8a948d]">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 truncate text-sm font-medium text-[#334039]" title={value}>
        {value}
      </p>
    </div>
  );
}

function SectionHeading({
  title,
  note,
  action,
  onAction,
}: {
  title: string;
  note: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-[#929a94]">{note}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onAction}
          className="flex items-center gap-1 text-xs font-semibold text-[#2d7450] hover:text-[#174d34]"
        >
          <Plus size={14} />
          {action}
        </button>
      </div>
    </div>
  );
}

function LocationCard({
  location,
  onToggle,
  onEdit,
}: {
  location: BusinessLocationResponse;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <div className={cn("rounded-2xl border border-[#e5e9e3] p-4", !location.isActive && "opacity-60")}>
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f1eb] text-[#2f7050]">
          <MapPin size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{location.name}</p>
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-[#7d877f]">
            {location.address ?? "Chưa có địa chỉ"}
          </p>
          {(location.phone || location.website) && (
            <p className="mt-1 line-clamp-1 text-[11px] text-[#89928b]">
              {[location.phone, shortUrl(location.website)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-[#89928b]">
            <button onClick={onToggle} className="ml-auto font-semibold text-[#52645a] hover:text-[#174d34]">
              {location.isActive ? "Tạm ẩn" : "Kích hoạt"}
            </button>
            <button
              onClick={onEdit}
              className="font-semibold text-[#52645a] hover:text-[#174d34]"
            >
              Sửa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  busy,
  onAction,
}: {
  session: AnalysisSessionListItemResponse;
  busy: boolean;
  onAction: (action: "start-data-collection" | "complete" | "archive") => void;
}) {
  const next =
    session.status === "DRAFT"
      ? { label: "Bắt đầu", action: "start-data-collection" as const }
      : session.status === "DATA_COLLECTION"
        ? { label: "Hoàn tất", action: "complete" as const }
        : session.status !== "ARCHIVED"
          ? { label: "Lưu trữ", action: "archive" as const }
          : null;
  return (
    <div className="rounded-2xl border border-[#e5e9e3] p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff3dd] text-[#9a6c20]">
          <Clock3 size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{session.name}</p>
          <p className="mt-1 line-clamp-1 text-xs text-[#7d877f]">
            {session.objective ?? "Chưa có mục tiêu cụ thể"}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", statusClass(session.status))}>
              {STATUS_LABELS[session.status] ?? session.status}
            </span>
            {next && (
              <button
                disabled={busy}
                onClick={() => onAction(next.action)}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#2d7450]"
              >
                {next.label}
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SoftEmpty({
  icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d9dfd9] bg-[#fafbf9] px-5 py-7 text-center">
      <div className="mx-auto grid size-10 place-items-center rounded-xl bg-[#edf1ec] text-[#65736a]">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[#7c8780]">{text}</p>
      <button onClick={onAction} className="mt-3 text-xs font-semibold text-[#2d7450]">
        {action}
      </button>
    </div>
  );
}

function BusinessFormDialog({
  title,
  description,
  business,
  onClose,
  onSaved,
}: {
  title: string;
  description: string;
  business?: BusinessDetailResponse;
  onClose: () => void;
  onSaved: (business: BusinessDetailResponse) => void;
}) {
  const [form, setForm] = useState({
    name: business?.name ?? "",
    industry: business?.industry ?? "",
    website: business?.website ?? "",
    phone: business?.phone ?? "",
    address: business?.address ?? "",
    description: business?.description ?? "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      business
        ? apiClient.patch<BusinessDetailResponse>(`/businesses/${business.id}`, {
            ...form,
            website: form.website || null,
            phone: form.phone || null,
            address: form.address || null,
            description: form.description || null,
          })
        : apiClient.post<BusinessDetailResponse>("/businesses", {
            ...form,
            industry: form.industry || null,
            website: form.website || null,
            phone: form.phone || null,
            address: form.address || null,
            description: form.description || null,
          }),
    onSuccess: onSaved,
  });

  return (
    <Dialog title={title} description={description} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <Field label="Tên doanh nghiệp" required>
          <TextInput
            value={form.name}
            onChange={(value) => setForm({ ...form, name: value })}
            placeholder="Ví dụ: ABC Coffee"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ngành nghề">
            <TextInput
              value={form.industry}
              onChange={(value) => setForm({ ...form, industry: value })}
              placeholder="F&B, bán lẻ..."
            />
          </Field>
          <Field label="Điện thoại">
            <TextInput
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })}
              placeholder="090..."
            />
          </Field>
        </div>
        <Field label="Website">
          <TextInput
            value={form.website}
            onChange={(value) => setForm({ ...form, website: value })}
            placeholder="https://..."
            type="url"
          />
        </Field>
        <Field label="Địa chỉ">
          <TextInput
            value={form.address}
            onChange={(value) => setForm({ ...form, address: value })}
            placeholder="Địa chỉ chính"
          />
        </Field>
        <Field label="Mô tả ngắn">
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="min-h-24 w-full rounded-xl border border-[#dfe4de] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#77a088] focus:ring-4 focus:ring-[#e4f0e8]"
            placeholder="Doanh nghiệp cung cấp sản phẩm hoặc dịch vụ gì?"
          />
        </Field>
        <MutationError error={mutation.error} />
        <DialogActions onClose={onClose} busy={mutation.isPending} submitLabel={business ? "Lưu thay đổi" : "Tạo doanh nghiệp"} />
      </form>
    </Dialog>
  );
}

function LocationFormDialog({
  businessId,
  location,
  onClose,
  onSaved,
}: {
  businessId: string;
  location: BusinessLocationResponse | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: location?.name ?? "",
    address: location?.address ?? "",
    phone: location?.phone ?? "",
    website: location?.website ?? "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      location
        ? apiClient.patch(
            `/businesses/${businessId}/locations/${location.id}`,
            {
              name: form.name,
              address: form.address || null,
              phone: form.phone || null,
              website: form.website || null,
            },
          )
        : apiClient.post(`/businesses/${businessId}/locations`, {
            name: form.name,
            address: form.address || null,
            phone: form.phone || null,
            website: form.website || null,
          }),
    onSuccess: onSaved,
  });

  return (
    <Dialog
      title={location ? "Chỉnh sửa địa điểm" : "Thêm địa điểm thủ công"}
      description="Dữ liệu này do bạn quản lý và sẽ không bị Google Maps tự động ghi đè."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <Field label="Tên địa điểm" required>
          <TextInput
            value={form.name}
            onChange={(value) => setForm({ ...form, name: value })}
            required
          />
        </Field>
        <Field label="Địa chỉ">
          <TextInput
            value={form.address}
            onChange={(value) => setForm({ ...form, address: value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Điện thoại">
            <TextInput
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })}
            />
          </Field>
          <Field label="Website">
            <TextInput
              value={form.website}
              onChange={(value) => setForm({ ...form, website: value })}
              type="url"
            />
          </Field>
        </div>
        <MutationError error={mutation.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Đang lưu..."
              : location
                ? "Lưu thay đổi"
                : "Lưu địa điểm"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function SessionDialog({
  businessId,
  onClose,
  onCreated,
}: {
  businessId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [focusProduct, setFocusProduct] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post("/analysis-sessions", {
        businessId,
        name,
        objective: objective || null,
        focusProduct: focusProduct || null,
      }),
    onSuccess: onCreated,
  });
  return (
    <Dialog
      title="Tạo đợt phân tích"
      description="Xác định mục tiêu trước khi bắt đầu thu thập dữ liệu khách hàng."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <Field label="Tên đợt phân tích" required>
          <TextInput value={name} onChange={setName} placeholder="Ví dụ: Trải nghiệm khách hàng Q3" required />
        </Field>
        <Field label="Mục tiêu">
          <textarea
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            className="min-h-24 w-full rounded-xl border border-[#dfe4de] px-3 py-2.5 text-sm outline-none focus:border-[#77a088] focus:ring-4 focus:ring-[#e4f0e8]"
            placeholder="Bạn muốn hiểu điều gì từ khách hàng?"
          />
        </Field>
        <Field label="Sản phẩm hoặc dịch vụ trọng tâm">
          <TextInput value={focusProduct} onChange={setFocusProduct} placeholder="Sản phẩm cần phân tích" />
        </Field>
        <MutationError error={mutation.error} />
        <DialogActions onClose={onClose} busy={mutation.isPending} submitLabel="Tạo bản nháp" />
      </form>
    </Dialog>
  );
}

function Dialog({
  title,
  description,
  onClose,
  children,
  wide,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#111b15]/45 p-4 backdrop-blur-[3px]" role="dialog" aria-modal="true">
      <div className={cn("max-h-[92vh] w-full overflow-y-auto rounded-[24px] bg-white shadow-[0_28px_80px_rgba(10,24,15,0.28)]", wide ? "max-w-2xl" : "max-w-xl")}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#edf0eb] bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.025em]">{title}</h2>
            <p className="mt-1 text-sm text-[#778178]">{description}</p>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="grid size-9 place-items-center rounded-xl text-[#717b73] hover:bg-[#f1f3f0]">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#56635b]">
        {label} {required && <span className="text-[#b0554d]">*</span>}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      required={required}
      className="h-11 w-full rounded-xl border border-[#dfe4de] bg-white px-3 text-sm outline-none transition focus:border-[#77a088] focus:ring-4 focus:ring-[#e4f0e8]"
    />
  );
}

function DialogActions({
  onClose,
  busy,
  submitLabel,
}: {
  onClose: () => void;
  busy: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
        Hủy
      </Button>
      <Button type="submit" className="rounded-xl bg-[#164f35] px-5" disabled={busy}>
        {busy ? "Đang lưu..." : submitLabel}
      </Button>
    </div>
  );
}

function MutationError({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#fff0ee] px-3 py-2.5 text-xs leading-5 text-[#934c45]">
      <CircleAlert size={15} className="mt-0.5 shrink-0" />
      {error.message}
    </div>
  );
}

function EmptyBusinesses({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="px-4 py-16 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e8f0eb] text-[#3f7256]">
        <Building2 size={21} />
      </div>
      <p className="mt-4 text-sm font-semibold">Chưa có doanh nghiệp</p>
      <p className="mx-auto mt-1 max-w-[230px] text-xs leading-5 text-[#7b857d]">
        Thêm doanh nghiệp đầu tiên của bạn vào hệ thống.
      </p>
      <button onClick={onCreate} className="mt-4 text-xs font-semibold text-[#2d7450]">
        Thêm doanh nghiệp
      </button>
    </div>
  );
}

function BusinessListSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="flex animate-pulse gap-3 rounded-2xl p-3">
          <div className="size-11 rounded-xl bg-[#edf0ec]" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-2/3 rounded bg-[#edf0ec]" />
            <div className="h-2.5 w-1/2 rounded bg-[#f1f3f0]" />
          </div>
        </div>
      ))}
    </>
  );
}

function DetailPlaceholder({ loading }: { loading: boolean }) {
  return (
    <div className="grid place-items-center rounded-[22px] border border-[#e2e6df] bg-white p-8 text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf1ec] text-[#637168]">
          {loading ? <Activity className="animate-pulse" /> : <Building2 />}
        </div>
        <p className="mt-4 font-semibold">{loading ? "Đang tải hồ sơ..." : "Chọn một doanh nghiệp"}</p>
        <p className="mt-1 text-sm text-[#7d877f]">Thông tin chi tiết sẽ xuất hiện tại đây.</p>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function shortUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function statusClass(status: string): string {
  if (status === "COMPLETED") return "bg-[#e5f3ea] text-[#2c704c]";
  if (status === "DRAFT") return "bg-[#eef0ed] text-[#69736b]";
  if (status === "ARCHIVED") return "bg-[#efeeee] text-[#77706f]";
  return "bg-[#fff1d7] text-[#8c641d]";
}
