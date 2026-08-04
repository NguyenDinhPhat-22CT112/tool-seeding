/** Framework-agnostic quota tracker — dùng chung giữa API (adapter) và worker (crawler). */

export type SerpApiSku = "AUTOCOMPLETE_REQUESTS" | "PLACE_DETAILS_ENTERPRISE" | "REVIEWS_REQUESTS";

export interface SerpApiUsageLimits {
  global: number;
  organization: number;
}

/** Bề mặt Prisma tối thiểu cần cho quota tracking. */
export interface SerpApiUsageDb {
  $transaction<R>(fn: (tx: SerpApiUsageDb) => Promise<R>): Promise<R>;
  externalApiUsage: {
    upsert(args: {
      where: { scopeKey_provider_sku_period: { scopeKey: string; provider: string; sku: string; period: string } };
      create: { scopeKey: string; provider: string; sku: string; period: string; requestCount: number };
      update: { requestCount: { increment: number } };
    }): Promise<{ requestCount: number }>;
    findMany(args: {
      where: { scopeKey: string; provider: string; period: string; sku: { in: string[] } };
      select: { sku: true; requestCount: true };
    }): Promise<Array<{ sku: string; requestCount: number }>>;
  };
}

export class SerpApiQuotaExceededError extends Error {
  constructor(
    public readonly scope: "GLOBAL" | "ORGANIZATION",
  ) {
    super(
      scope === "GLOBAL"
        ? "Hệ thống đã đạt giới hạn SerpAPI trong tháng"
        : "Organization đã đạt giới hạn SerpAPI trong tháng",
    );
    this.name = "SerpApiQuotaExceededError";
  }
}

const PROVIDER_NAME = "SERPAPI";

function toUtcMonth(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Tăng requestCount theo SKU và ném `SerpApiQuotaExceededError` khi vượt hạn mức
 * (global hoặc organization). Không chứa logic NestJS — worker dùng trực tiếp,
 * API bọc qua adapter để trả về HTTP exception tương ứng.
 */
export class SerpApiUsageTracker {
  constructor(
    private readonly db: SerpApiUsageDb,
    private readonly limits: Record<SerpApiSku, SerpApiUsageLimits>,
  ) {}

  async consume(organizationId: string, sku: SerpApiSku, now = new Date()): Promise<void> {
    const period = toUtcMonth(now);
    const limits = this.limits[sku];

    await this.db.$transaction(async (tx) => {
      const global = await tx.externalApiUsage.upsert({
        where: {
          scopeKey_provider_sku_period: {
            scopeKey: "GLOBAL",
            provider: PROVIDER_NAME,
            sku,
            period,
          },
        },
        create: {
          scopeKey: "GLOBAL",
          provider: PROVIDER_NAME,
          sku,
          period,
          requestCount: 1,
        },
        update: { requestCount: { increment: 1 } },
      });

      if (global.requestCount > limits.global) {
        throw new SerpApiQuotaExceededError("GLOBAL");
      }

      const organization = await tx.externalApiUsage.upsert({
        where: {
          scopeKey_provider_sku_period: {
            scopeKey: `ORG:${organizationId}`,
            provider: PROVIDER_NAME,
            sku,
            period,
          },
        },
        create: {
          scopeKey: `ORG:${organizationId}`,
          provider: PROVIDER_NAME,
          sku,
          period,
          requestCount: 1,
        },
        update: { requestCount: { increment: 1 } },
      });

      if (organization.requestCount > limits.organization) {
        throw new SerpApiQuotaExceededError("ORGANIZATION");
      }
    });
  }

  async getUsedCounts(
    organizationId: string,
    now = new Date(),
  ): Promise<Record<SerpApiSku, number>> {
    const period = toUtcMonth(now);
    const rows = await this.db.externalApiUsage.findMany({
      where: {
        scopeKey: `ORG:${organizationId}`,
        provider: PROVIDER_NAME,
        period,
        sku: {
          in: ["AUTOCOMPLETE_REQUESTS", "PLACE_DETAILS_ENTERPRISE", "REVIEWS_REQUESTS"],
        },
      },
      select: { sku: true, requestCount: true },
    });

    const used: Record<SerpApiSku, number> = {
      AUTOCOMPLETE_REQUESTS: 0,
      PLACE_DETAILS_ENTERPRISE: 0,
      REVIEWS_REQUESTS: 0,
    };
    for (const row of rows) {
      if (row.sku in used) {
        used[row.sku as SerpApiSku] = row.requestCount;
      }
    }
    return used;
  }
}
