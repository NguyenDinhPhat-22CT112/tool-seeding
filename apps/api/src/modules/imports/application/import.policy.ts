import { Injectable } from "@nestjs/common";
import { RequestContext } from "../../../shared/context/request-context";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";

@Injectable()
export class ImportPolicy {
  canImport(ctx: RequestContext): boolean {
    return ctx.role === "ORG_ADMIN" || ctx.role === "ANALYST";
  }

  assertCanImport(ctx: RequestContext): void {
    if (!this.canImport(ctx)) {
      throw new DomainError("FORBIDDEN");
    }
  }
}
