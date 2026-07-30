import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@seeding/contracts";

@Controller("health")
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
