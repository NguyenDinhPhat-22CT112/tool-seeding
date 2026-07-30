import { Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { ForbiddenActionError } from "../../../shared/exceptions/domain.exceptions";

@Injectable()
export class AnalysisSessionPolicy {
  canCreate(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN" || ctx.role === "ANALYST";
  }

  canEditDraft(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN" || ctx.role === "ANALYST";
  }

  canView(): boolean {
    return true; // mọi role trong org đều theo dõi được
  }

  canArchive(ctx: RequestContext): boolean {
    // "Archive Session: Có theo policy" cho Analyst — Giai đoạn 1 cho phép Analyst archive
    // session do chính họ tạo; ORG_ADMIN archive được mọi session.
    return ctx.role === "ORG_ADMIN" || ctx.role === "ANALYST";
  }

  assertCanCreate(ctx: RequestContext) {
    if (!this.canCreate(ctx)) {
      throw new ForbiddenActionError("Bạn không có quyền tạo đợt phân tích");
    }
  }

  assertCanEditDraft(ctx: RequestContext) {
    if (!this.canEditDraft(ctx)) {
      throw new ForbiddenActionError(
        "Bạn không có quyền sửa đợt phân tích này",
      );
    }
  }

  assertCanArchive(ctx: RequestContext, session: { createdBy: string | null }) {
    if (ctx.role === "ORG_ADMIN") return;
    if (ctx.role === "ANALYST" && session.createdBy === ctx.userId) return;
    throw new ForbiddenActionError(
      "Bạn không có quyền lưu trữ (archive) đợt phân tích này",
    );
  }
}
