import { DataSourcePolicy } from "../data-source.policy";
import { RequestContext } from "../../../../shared/context/request-context";

function ctx(role: RequestContext["role"]): RequestContext {
  return { organizationId: "org_1", userId: "user_1", role };
}

describe("DataSourcePolicy", () => {
  const policy = new DataSourcePolicy();

  it("Org Admin và Analyst được tạo data source", () => {
    expect(policy.canCreate(ctx("ORG_ADMIN"))).toBe(true);
    expect(policy.canCreate(ctx("ANALYST"))).toBe(true);
    expect(policy.canCreate(ctx("INSIGHT_REVIEWER"))).toBe(false);
    expect(policy.canCreate(ctx("VIEWER"))).toBe(false);
  });

  it("assertCanCreate throw khi Viewer cố tạo", () => {
    expect(() => policy.assertCanCreate(ctx("VIEWER"))).toThrow();
  });

  it("mọi role đều xem được", () => {
    expect(policy.canView()).toBe(true);
  });
});
