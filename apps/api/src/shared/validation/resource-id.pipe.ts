import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

const RESOURCE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

@Injectable()
export class ResourceIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (
      typeof value !== "string" ||
      value.length < 1 ||
      value.length > 100 ||
      !RESOURCE_ID_PATTERN.test(value)
    ) {
      throw new BadRequestException(
        "ID không hợp lệ: chỉ chấp nhận 1-100 ký tự chữ, số, dấu gạch ngang hoặc gạch dưới",
      );
    }
    return value;
  }
}
