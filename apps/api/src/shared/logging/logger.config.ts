import { Params } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const isProduction = process.env.NODE_ENV === "production";

/** Cấu hình Pino cho API — request context serializer theo A3. */
export function createLoggerConfig(): Params {
  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
      transport: isProduction
        ? undefined
        : {
            target: "pino-pretty",
            options: { colorize: true, singleLine: true },
          },
      genReqId: (req: IncomingMessage) => {
        const incoming = req.headers["x-request-id"];
        if (typeof incoming === "string" && incoming.length > 0 && incoming.length <= 100) {
          return incoming;
        }
        return randomUUID();
      },
      customProps: (req: IncomingMessage) => {
        const request = req as IncomingMessage & {
          requestContext?: { organizationId?: string; userId?: string };
        };
        return {
          organizationId: request.requestContext?.organizationId,
          userId: request.requestContext?.userId,
        };
      },
      customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
        `${req.method ?? "?"} ${req.url ?? "?"} ${res.statusCode}`,
      customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
        if (err ?? res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      serializers: {
        req: (req: IncomingMessage) => ({
          method: req.method,
          path: req.url,
        }),
        res: (res: ServerResponse) => ({
          statusCode: res.statusCode,
        }),
      },
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers['x-api-key']",
        ],
        remove: true,
      },
    },
  };
}
