import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { randomUUID } from "node:crypto";
import { STATUS_CODES } from "node:http";
import type { ApiErrorResponse } from "@seeding/contracts";
import { DomainError } from "../../shared/exceptions/domain.exceptions";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{
      url: string;
      headers: Record<string, string | string[] | undefined>;
    }>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string | undefined;
    let message: string | string[] = "Internal server error";
    let error = "Internal Server Error";

    if (exception instanceof DomainError) {
      statusCode = exception.getStatus();
      error = STATUS_CODES[statusCode] ?? "HTTP Error";
      code = exception.code;
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res.message as string | string[]) ?? message;
        error = (res.error as string) ?? error;
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      error = STATUS_CODES[statusCode] ?? "HTTP Error";
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res.message as string | string[]) ?? message;
        error = (res.error as string) ?? error;
        code = typeof res.code === "string" ? res.code : undefined;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    } else {
      this.logger.error("Unhandled non-Error exception");
    }

    const incomingRequestId = request.headers["x-request-id"];
    const requestId =
      typeof incomingRequestId === "string" &&
      incomingRequestId.length > 0 &&
      incomingRequestId.length <= 100
        ? incomingRequestId
        : randomUUID();
    response.setHeader("x-request-id", requestId);

    const errorResponse: ApiErrorResponse = {
      statusCode,
      ...(code ? { code } : {}),
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    response.status(statusCode).json(errorResponse);
  }
}
