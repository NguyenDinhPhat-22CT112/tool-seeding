import { Inject, Injectable } from "@nestjs/common";
import { SERPAPI_CLIENT, type SerpApiClient } from "./serpapi.types";
import { SerpApiUsageService } from "./serpapi-usage.service";
import type { SerpApiPrediction, SerpApiPreview } from "@seeding/contracts";

@Injectable()
export class SerpApiGatewayService {
    private readonly inFlightPreviews = new Map<string, Promise<SerpApiPreview>>();

    constructor(
        @Inject(SERPAPI_CLIENT)
        private readonly client: SerpApiClient,
        private readonly usage: SerpApiUsageService,
    ) {}

    getStatus(organizationId: string) {
        return this.usage.getStatus(organizationId);
    }

    async autocomplete(organizationId: string, input: string, sessionToken: string): Promise<SerpApiPrediction[]> {
        await this.usage.consume(organizationId, "AUTOCOMPLETE_REQUESTS");
        return this.client.autocomplete({ input, sessionToken });
    }

    async getPreview(organizationId: string, placeId: string, sessionToken?: string): Promise<SerpApiPreview> {
        const key = `${organizationId}:${placeId}`;
        const existingRequest = this.inFlightPreviews.get(key);
        if (existingRequest) return existingRequest;

        const request = this.fetchPreview(organizationId, placeId, sessionToken).finally(() => {
            this.inFlightPreviews.delete(key);
        });
        this.inFlightPreviews.set(key, request);
        return request;
    }

    private async fetchPreview(organizationId: string, placeId: string, sessionToken?: string): Promise<SerpApiPreview> {
        await this.usage.consume(organizationId, "PLACE_DETAILS_ENTERPRISE");
        return this.client.getPlacePreview({
            placeId,
            sessionToken,
        });
    }
}
