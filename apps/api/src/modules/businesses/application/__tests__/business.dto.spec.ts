import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateBusinessDto,
  ListBusinessesQueryDto,
  UpdateBusinessDto,
} from "../business.dto";

describe("Business DTO validation", () => {
  it("trim dữ liệu hợp lệ và loại chuỗi rỗng trong mảng string", async () => {
    const dto = plainToInstance(CreateBusinessDto, {
      name: "  ABC Coffee  ",
      industry: "  F&B  ",
      strengths: ["  Nhanh  ", " ", "Ổn định"],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      name: "ABC Coffee",
      industry: "F&B",
      strengths: ["Nhanh", "Ổn định"],
    });
  });

  it("không biến sai kiểu mảng thành []", async () => {
    const dto = plainToInstance(UpdateBusinessDto, {
      strengths: "không phải mảng",
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === "strengths")).toBe(true);
    expect(dto.strengths).toBe("không phải mảng");
  });

  it("từ chối null cho JSON array để tránh lỗi Prisma", async () => {
    const dto = plainToInstance(UpdateBusinessDto, {
      products: null,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === "products")).toBe(true);
  });

  it("chỉ chấp nhận true/false cho query isActive", async () => {
    const invalid = plainToInstance(ListBusinessesQueryDto, {
      isActive: "yes",
    });
    const valid = plainToInstance(ListBusinessesQueryDto, {
      isActive: "false",
    });

    expect(
      (await validate(invalid)).some((error) => error.property === "isActive"),
    ).toBe(true);
    await expect(validate(valid)).resolves.toHaveLength(0);
    expect(valid.isActive).toBe(false);
  });
});
