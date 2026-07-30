import { Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";

@Injectable()
export class FeedbackPolicy {
  canCreate(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN" || ctx.role === "ANALYST";
  }

  canUpdate(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN" || ctx.role === "ANALYST";
  }

  canDelete(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN" || ctx.role === "ANALYST";
  }

  canView(): boolean {
    return true;
  }

  assertCanCreate(ctx: RequestContext): void {
    if (!this.canCreate(ctx)) {
      throw new DomainError("FORBIDDEN");
    }
  }

  assertCanUpdate(ctx: RequestContext): void {
    if (!this.canUpdate(ctx)) {
      throw new DomainError("FORBIDDEN");
    }
  }

  assertCanDelete(ctx: RequestContext): void {
    if (!this.canDelete(ctx)) {
      throw new DomainError("FORBIDDEN");
    }
  }
}
