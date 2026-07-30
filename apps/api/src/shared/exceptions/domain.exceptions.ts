import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpException,
} from "@nestjs/common";
import { ERROR_CODES, ErrorCode } from "./error-codes";

/** Base domain error — tự động map code → HTTP status + message. */
export class DomainError extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    detail?: string,
  ) {
    const { status, message } = ERROR_CODES[code];
    super({ code, message: detail ?? message, error: message }, status);
  }
}

/** Không tìm thấy resource TRONG PHẠM VI organization hiện tại (tránh lộ thông tin tồn tại/không tồn tại ở org khác). */
export class ResourceNotFoundError extends NotFoundException {
  constructor(resource: string, id: string) {
    super(`Không tìm thấy ${resource} với id "${id}"`);
  }
}

/** Vi phạm điều kiện chuyển trạng thái / ràng buộc nghiệp vụ. */
export class InvalidStateTransitionError extends ConflictException {
  constructor(message: string) {
    super(message);
  }
}

/** Người dùng không có quyền thực hiện hành động (đã xác thực nhưng không đủ role/policy). */
export class ForbiddenActionError extends ForbiddenException {
  constructor(message: string) {
    super(message);
  }
}

/** Dữ liệu đầu vào hợp lệ về format nhưng sai về nghiệp vụ (không phải lỗi validate DTO). */
export class BusinessRuleViolationError extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
