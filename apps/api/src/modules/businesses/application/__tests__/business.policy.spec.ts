import { BusinessPolicy } from "../business.policy";
import { RequestContext } from "../../../../shared/context/request-context";

function ctx(role: RequestContext["role"]): RequestContext {
  return { organizationId: "org_1", userId: "user_1", role };
}

describe("BusinessPolicy", () => {
  const policy = new BusinessPolicy();

  it("chỉ Org Admin được tạo/sửa business", () => {
    expect(policy.canCreate(ctx("ORG_ADMIN"))).toBe(true);
    expect(policy.canCreate(ctx("ANALYST"))).toBe(false);

    expect(policy.canUpdate(ctx("ORG_ADMIN"))).toBe(true);
    expect(policy.canUpdate(ctx("ANALYST"))).toBe(false);
  });

  it("Viewer không được sửa/tạo nhưng vẫn xem được", () => {
    expect(policy.canCreate(ctx("VIEWER"))).toBe(false);
    expect(policy.canUpdate(ctx("VIEWER"))).toBe(false);
    expect(policy.canView()).toBe(true);
  });

  it("assertCanUpdate throw khi Reviewer cố sửa business", () => {
    expect(() => policy.assertCanUpdate(ctx("INSIGHT_REVIEWER"))).toThrow();
  });
});
