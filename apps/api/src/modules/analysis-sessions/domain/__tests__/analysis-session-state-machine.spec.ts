import { AnalysisSessionStateMachine } from "../analysis-session-state-machine";

describe("AnalysisSessionStateMachine", () => {
  it("cho phép DRAFT -> DATA_COLLECTION (bắt đầu nhập dữ liệu)", () => {
    expect(AnalysisSessionStateMachine.canTransition("DRAFT", "DATA_COLLECTION")).toBe(true);
  });

  it("KHÔNG cho phép nhảy tùy ý từ DRAFT sang ANALYZING (đúng yêu cầu mục 4)", () => {
    expect(AnalysisSessionStateMachine.canTransition("DRAFT", "ANALYZING")).toBe(false);
  });

  it("cho phép DRAFT -> ARCHIVED và DATA_COLLECTION -> ARCHIVED", () => {
    expect(AnalysisSessionStateMachine.canTransition("DRAFT", "ARCHIVED")).toBe(true);
    expect(AnalysisSessionStateMachine.canTransition("DATA_COLLECTION", "ARCHIVED")).toBe(true);
  });

  it("cho phép COMPLETED -> ARCHIVED nhưng không cho ARCHIVED đi tiếp đâu cả", () => {
    expect(AnalysisSessionStateMachine.canTransition("COMPLETED", "ARCHIVED")).toBe(true);
    expect(AnalysisSessionStateMachine.canTransition("ARCHIVED", "DRAFT")).toBe(false);
    expect(AnalysisSessionStateMachine.canTransition("ARCHIVED", "COMPLETED")).toBe(false);
  });

  it("không cho phép chuyển ngược trạng thái (ví dụ PROCESSING -> DATA_COLLECTION)", () => {
    expect(AnalysisSessionStateMachine.canTransition("PROCESSING", "DATA_COLLECTION")).toBe(false);
  });

  it("assertCanTransition throw đúng khi transition không hợp lệ", () => {
    expect(() =>
      AnalysisSessionStateMachine.assertCanTransition("DRAFT", "COMPLETED"),
    ).toThrow();
  });

  it("ARCHIVED là read-only, các trạng thái khác thì không", () => {
    expect(AnalysisSessionStateMachine.isReadOnly("ARCHIVED")).toBe(true);
    expect(AnalysisSessionStateMachine.isReadOnly("COMPLETED")).toBe(false);
    expect(AnalysisSessionStateMachine.isReadOnly("DATA_COLLECTION")).toBe(false);
  });

  it("COMPLETED và ARCHIVED không nhận thêm dữ liệu mới", () => {
    expect(AnalysisSessionStateMachine.acceptsNewData("COMPLETED")).toBe(false);
    expect(AnalysisSessionStateMachine.acceptsNewData("ARCHIVED")).toBe(false);
    expect(AnalysisSessionStateMachine.acceptsNewData("DATA_COLLECTION")).toBe(true);
    expect(AnalysisSessionStateMachine.acceptsNewData("DRAFT")).toBe(true);
  });
});
