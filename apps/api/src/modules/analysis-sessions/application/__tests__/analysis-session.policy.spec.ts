import { AnalysisSessionPolicy } from "../analysis-session.policy";
import { RequestContext } from "../../../../shared/context/request-context";

function ctx(role: RequestContext["role"], userId = "user_1"): RequestContext {
  return { organizationId: "org_1", userId, role };
}

describe("AnalysisSessionPolicy", () => {
  const policy = new AnalysisSessionPolicy();

  it("Org Admin và Analyst được tạo session, Reviewer/Viewer thì không", () => {
    expect(policy.canCreate(ctx("ORG_ADMIN"))).toBe(true);
    expect(policy.canCreate(ctx("ANALYST"))).toBe(true);
    expect(policy.canCreate(ctx("INSIGHT_REVIEWER"))).toBe(false);
    expect(policy.canCreate(ctx("VIEWER"))).toBe(false);
  });

  it("assertCanCreate throw ForbiddenActionError khi Viewer cố tạo session", () => {
    expect(() => policy.assertCanCreate(ctx("VIEWER"))).toThrow();
  });

  it("Analyst chỉ archive được session do chính mình tạo", () => {
    const session = { createdBy: "user_1" };
    expect(() =>
      policy.assertCanArchive(ctx("ANALYST", "user_1"), session),
    ).not.toThrow();
    expect(() =>
      policy.assertCanArchive(ctx("ANALYST", "user_2"), session),
    ).toThrow();
  });

  it("Org Admin archive được session của bất kỳ ai", () => {
    const session = { createdBy: "user_999" };
    expect(() =>
      policy.assertCanArchive(ctx("ORG_ADMIN", "user_1"), session),
    ).not.toThrow();
  });

  it("mọi role đều xem được (theo dõi session)", () => {
    expect(policy.canView()).toBe(true);
  });
});
