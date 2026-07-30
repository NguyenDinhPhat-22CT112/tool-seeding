import { Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";

@Injectable()
export class ProcessingJobPolicy {
  canTrigger(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN" || ctx.role === "ANALYST";
  }

  canManage(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN" || ctx.role === "ANALYST";
  }

  canView(): boolean {
    return true;
  }

  assertCanTrigger(ctx: RequestContext): void {
    if (!this.canTrigger(ctx)) {
      throw new DomainError("FORBIDDEN");
    }
  }

  assertCanManage(ctx: RequestContext): void {
    if (!this.canManage(ctx)) {
      throw new DomainError("FORBIDDEN");
    }
  }
}
