import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@seeding/database";
import { serpApiConfig } from "./serpapi.config";
import { SerpApiQuotaExceededError } from "./serpapi.errors";
import type { SerpApiStatusResponse } from "@seeding/contracts";

const PROVIDER_NAME = "SERPAPI";

export type SerpApiTrackedSku = "AUTOCOMPLETE_REQUESTS" | "PLACE_DETAILS_ENTERPRISE";

@Injectable()
export class SerpApiUsageService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(serpApiConfig.KEY)
        private readonly config: typeof serpApiConfig extends (...args: any[]) => infer R ? R : never,
    ) {}

    async consume(organizationId: string, sku: SerpApiTrackedSku, now = new Date()): Promise<void> {
        const period = toUtcMonth(now);
        const limits = sku === "AUTOCOMPLETE_REQUESTS"
            ? {
                global: this.config.autocompleteMonthlyLimit,
                organization: this.config.autocompleteOrgMonthlyLimit,
            }
            : {
                global: this.config.placeDetailsMonthlyLimit,
                organization: this.config.placeDetailsOrgMonthlyLimit,
            };

        await this.prisma.$transaction(async (tx) => {
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

    async getStatus(organizationId: string, now = new Date()): Promise<SerpApiStatusResponse> {
        const period = toUtcMonth(now);
        const rows = await this.prisma.externalApiUsage.findMany({
            where: {
                scopeKey: `ORG:${organizationId}`,
                provider: PROVIDER_NAME,
                period,
                sku: {
                    in: ["AUTOCOMPLETE_REQUESTS", "PLACE_DETAILS_ENTERPRISE"],
                },
            },
            select: { sku: true, requestCount: true },
        });

        const used = new Map(rows.map((row) => [row.sku, row.requestCount]));

        return {
            enabled: this.config.enabled,
            configured: this.config.enabled && Boolean(this.config.apiKey),
            autocomplete: usageItem(used.get("AUTOCOMPLETE_REQUESTS") ?? 0, this.config.autocompleteOrgMonthlyLimit),
            placeDetails: usageItem(used.get("PLACE_DETAILS_ENTERPRISE") ?? 0, this.config.placeDetailsOrgMonthlyLimit),
        };
    }
}

function toUtcMonth(value: Date) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function usageItem(used: number, limit: number) {
    return {
        used,
        limit,
        warning: used >= Math.ceil(limit * 0.8),
        exhausted: used >= limit,
    };
}
