import { Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { ForbiddenActionError } from "../../../shared/exceptions/domain.exceptions";

/**
 * Ma trận quyền — đúng bảng ở mục 7 tài liệu Giai đoạn 1.
 * "Sửa Business: Analyst nếu được cấp" — Giai đoạn 1 CHƯA có cơ chế cấp quyền chi tiết
 * theo từng business, nên tạm thời Analyst KHÔNG được sửa (an toàn hơn là mở rộng nhầm).
 * Đánh dấu rõ TODO để không quên khi làm phân quyền chi tiết.
 */
@Injectable()
export class BusinessPolicy {
  canCreate(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN";
  }

  canUpdate(ctx: RequestContext): boolean {
    // TODO(RBAC chi tiết): Analyst "nếu được cấp" — cần bảng phân quyền theo business.
    return ctx.role === "ORG_ADMIN";
  }

  canView(): boolean {
    // Mọi role đã đăng nhập trong org đều xem được (Org Admin/Analyst/Reviewer/Viewer).
    return true;
  }

  canDeactivateOrRestore(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN";
  }

  assertCanCreate(ctx: RequestContext) {
    if (!this.canCreate(ctx)) {
      throw new ForbiddenActionError("Chỉ Org Admin được tạo doanh nghiệp");
    }
  }

  assertCanUpdate(ctx: RequestContext) {
    if (!this.canUpdate(ctx)) {
      throw new ForbiddenActionError("Bạn không có quyền sửa doanh nghiệp này");
    }
  }

  assertCanDeactivateOrRestore(ctx: RequestContext) {
    if (!this.canDeactivateOrRestore(ctx)) {
      throw new ForbiddenActionError(
        "Chỉ Org Admin được ngừng hoạt động / khôi phục doanh nghiệp",
      );
    }
  }
}
