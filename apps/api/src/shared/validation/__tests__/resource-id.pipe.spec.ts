import { BadRequestException } from "@nestjs/common";
import { ResourceIdPipe } from "../resource-id.pipe";

describe("ResourceIdPipe", () => {
  const pipe = new ResourceIdPipe();

  it.each(["cm123abc", "business_1", "session-01"])(
    "chấp nhận resource ID hợp lệ: %s",
    (id) => {
      expect(pipe.transform(id)).toBe(id);
    },
  );

  it.each(["", "a/b", "id có khoảng trắng", "a".repeat(101)])(
    "từ chối resource ID không hợp lệ",
    (id) => {
      expect(() => pipe.transform(id)).toThrow(BadRequestException);
    },
  );
});
