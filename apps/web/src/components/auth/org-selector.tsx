"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { IamBootstrapResponse, IamMemberSummary, IamOrganizationSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/common/skeleton";
import { AlertCircle, Building2, User } from "lucide-react";

export function OrgSelector() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<IamBootstrapResponse | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<IamOrganizationSummary | null>(null);
  const [selectedMember, setSelectedMember] = useState<IamMemberSummary | null>(null);

  useEffect(() => {
    void fetchBootstrap();
  }, []);

  async function fetchBootstrap() {
    try {
      setLoading(true);
      const response = await apiClient.get<IamBootstrapResponse>("/iam/bootstrap", {
        skipAuth: true,
      });
      setData(response);

      const demoOrg = response.organizations.find((org) => org.id === "org_demo");
      if (demoOrg) {
        setSelectedOrg(demoOrg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách tổ chức");
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (!selectedOrg || !selectedMember) {
      setError("Vui lòng chọn tổ chức và người dùng");
      return;
    }

    setAuth({
      organizationId: selectedOrg.id,
      userId: selectedMember.userId,
      role: selectedMember.role,
      email: selectedMember.email || undefined,
      fullName: selectedMember.fullName,
    });

    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="mt-4 font-semibold">Không thể tải danh sách tổ chức</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || "Vui lòng thử lại sau."}
          </p>
          <Button
            onClick={() => {
              void fetchBootstrap();
            }}
            className="mt-4 w-full"
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!data.organizations.length) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">Không tìm thấy tổ chức</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Bạn chưa có quyền truy cập vào tổ chức nào.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">
            Nền tảng Phân tích Chiến lược Seeding
          </h1>
          <p className="mt-2 text-muted-foreground">
            Chọn tổ chức và vai trò để tiếp tục
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Tổ chức</h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {data.organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setSelectedOrg(org);
                  setSelectedMember(null);
                }}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  selectedOrg?.id === org.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-border/80"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Building2 className="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{org.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {org.members.length} thành viên
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedOrg && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Chọn vai trò</h2>
            <div className="grid gap-3 grid-cols-1">
              {selectedOrg.members.map((member) => (
                <button
                  key={member.userId}
                  onClick={() => setSelectedMember(member)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    selectedMember?.userId === member.userId
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <User className="mt-1 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">
                        {member.fullName || member.email || member.userId}
                      </p>
                      {member.email && (
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      )}
                      <div className="mt-2 inline-block rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        {member.role.replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedOrg && selectedMember && (
          <Button onClick={handleConfirm} size="lg" className="w-full">
            Vào Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
