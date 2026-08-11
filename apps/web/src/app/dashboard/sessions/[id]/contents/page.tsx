"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useFetchContents,
  useFetchPromptTemplates,
} from "@/hooks/use-contents";
import { useFetchStrategyVersions } from "@/hooks/use-strategy";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/common/skeleton";
import { Button } from "@/components/ui/button";
import { FileCode2, FileText, ArrowLeft } from "lucide-react";
import { GenerateContentDialog } from "@/components/contents/generate-dialog";
import { ManualContentForm } from "@/components/contents/manual-content-form";
import { ContentList } from "@/components/contents/content-list";

export default function ContentsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [showGenerate, setShowGenerate] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [filter, setFilter] = useState<{ status?: string; origin?: string }>({});

  const { data: contents, isLoading, isError, error } = useFetchContents(sessionId, filter);
  const { data: versionsData } = useFetchStrategyVersions(sessionId);
  const { data: promptTemplates } = useFetchPromptTemplates({ purpose: "GENERATE" });

  const versions = versionsData?.items || [];
  const approvedVersion = versions.find(
    (v) => v.status === "APPROVED" || v.status === "LOCKED",
  );
  const canCreate = !!approvedVersion;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/dashboard/sessions`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Nội dung</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nội dung seeding sinh từ chiến lược (AI hoặc viết thủ công)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push("/dashboard/prompt-templates")}>
            <FileCode2 />
            Quản lý template
          </Button>
          <Button variant="outline" onClick={() => setShowManual(true)} disabled={!canCreate}>
            Viết thủ công
          </Button>
          <Button onClick={() => setShowGenerate(true)} disabled={!canCreate}>
            <FileText />
            Tạo nội dung AI
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center space-y-3">
          <p className="font-semibold text-destructive">
            {error instanceof Error ? error.message : "Không tìm thấy đợt phân tích này hoặc Session ID không hợp lệ."}
          </p>
          <p className="text-sm text-muted-foreground">
            Vui lòng kiểm tra lại danh sách các đợt phân tích trong hệ thống.
          </p>
          <Button variant="outline" onClick={() => router.push("/dashboard/sessions")}>
            Quay lại danh sách đợt phân tích
          </Button>
        </div>
      ) : !canCreate ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Cần một chiến lược ở trạng thái <b>APPROVED/LOCKED</b> để tạo nội dung. Hoàn tất
          quá trình duyệt chiến lược trước.
        </div>
      ) : null}

      {!isError && (isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : contents && contents.items.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Chưa có nội dung nào"
          description="Tạo nội dung AI từ chiến lược hoặc viết nội dung thủ công"
        />
      ) : (
        <ContentList
          sessionId={sessionId}
          items={contents?.items || []}
          filter={filter}
          onFilterChange={setFilter}
        />
      ))}

      {canCreate && showGenerate && (
        <GenerateContentDialog
          open={showGenerate}
          onClose={() => setShowGenerate(false)}
          sessionId={sessionId}
          strategyVersionId={approvedVersion.id}
          promptTemplates={promptTemplates || []}
        />
      )}

      {canCreate && showManual && (
        <ManualContentForm
          open={showManual}
          onClose={() => setShowManual(false)}
          sessionId={sessionId}
          strategyVersionId={approvedVersion.id}
        />
      )}
    </div>
  );
}
