import { Injectable, Logger } from "@nestjs/common";

/** MVP audit — structured log thay vì full AuditLog table (A11). */
@Injectable()
export class AuditService {
  private readonly logger = new Logger("Audit");

  log(event: {
    entityType: string;
    entityId: string;
    action: string;
    actorId: string;
    organizationId: string;
    detail?: Record<string, unknown>;
  }): void {
    this.logger.log({ ...event, timestamp: new Date().toISOString() });
  }
}
