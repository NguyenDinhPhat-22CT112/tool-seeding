import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@seeding/database";
import {
  SerpApiQuotaExceededError as SharedQuotaError,
  SerpApiSku,
  SerpApiUsageDb,
  SerpApiUsageLimits,
  SerpApiUsageTracker,
} from "@seeding/serpapi-client";
import { serpApiConfig, type SerpApiConfig } from "./serpapi.config";
import { SerpApiQuotaExceededError } from "./serpapi.errors";
import type { SerpApiStatusResponse } from "@seeding/contracts";

export type SerpApiTrackedSku = SerpApiSku;

@Injectable()
export class SerpApiUsageService {
    private readonly tracker: SerpApiUsageTracker;

    constructor(
        private readonly prisma: PrismaService,
        @Inject(serpApiConfig.KEY)
        private readonly config: SerpApiConfig,
    ) {
        this.tracker = new SerpApiUsageTracker(this.toUsageDb(this.prisma), {
            AUTOCOMPLETE_REQUESTS: {
                global: config.autocompleteMonthlyLimit,
                organization: config.autocompleteOrgMonthlyLimit,
            },
            PLACE_DETAILS_ENTERPRISE: {
                global: config.placeDetailsMonthlyLimit,
                organization: config.placeDetailsOrgMonthlyLimit,
            },
            REVIEWS_REQUESTS: {
                global: config.reviewsMonthlyLimit,
                organization: config.reviewsOrgMonthlyLimit,
            },
        });
    }

    /** Bridge Prisma → SerpApiUsageDb (overloaded $transaction của Prisma không khớp interface). */
    private toUsageDb(prisma: PrismaService): SerpApiUsageDb {
        return {
            $transaction: <R>(fn: (tx: SerpApiUsageDb) => Promise<R>) =>
                prisma.$transaction((tx) => fn(tx as unknown as SerpApiUsageDb)),
            externalApiUsage: prisma.externalApiUsage,
        };
    }

    async consume(organizationId: string, sku: SerpApiTrackedSku, now = new Date()): Promise<void> {
        try {
            await this.tracker.consume(organizationId, sku, now);
        } catch (error) {
            if (error instanceof SharedQuotaError) {
                throw new SerpApiQuotaExceededError(error.scope);
            }
            throw error;
        }
    }

    async getStatus(organizationId: string, now = new Date()): Promise<SerpApiStatusResponse> {
        const used = await this.tracker.getUsedCounts(organizationId, now);

        return {
            enabled: this.config.enabled,
            configured: this.config.enabled && Boolean(this.config.apiKey),
            autocomplete: usageItem(used.AUTOCOMPLETE_REQUESTS, this.config.autocompleteOrgMonthlyLimit),
            placeDetails: usageItem(used.PLACE_DETAILS_ENTERPRISE, this.config.placeDetailsOrgMonthlyLimit),
            reviews: usageItem(used.REVIEWS_REQUESTS, this.config.reviewsOrgMonthlyLimit),
        };
    }
}

function usageItem(used: number, limit: number) {
    return {
        used,
        limit,
        warning: used >= Math.ceil(limit * 0.8),
        exhausted: used >= limit,
    };
}

export type { SerpApiUsageLimits };
