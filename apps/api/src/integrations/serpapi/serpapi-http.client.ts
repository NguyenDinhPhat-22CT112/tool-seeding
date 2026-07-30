import { Inject, Injectable, Logger } from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import { serpApiConfig } from "./serpapi.config";
import { SerpApiNotConfiguredError, SerpApiUpstreamError } from "./serpapi.errors";
import { type SerpApiClient, type SerpApiAutocompleteInput, type SerpApiDetailsInput } from "./serpapi.types";
import type { SerpApiPrediction, SerpApiPreview } from "@seeding/contracts";

function mapOpenState(openState?: string): "UNKNOWN" | "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY" {
    if (!openState) return "UNKNOWN";
    const lower = openState.toLowerCase();
    if (lower.includes("permanently closed")) return "CLOSED_PERMANENTLY";
    if (lower.includes("temporarily closed")) return "CLOSED_TEMPORARILY";
    if (lower.includes("open") || lower.includes("closes")) return "OPERATIONAL";
    return "UNKNOWN";
}

function finiteNumberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function integerOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isInteger(value) ? value : null;
}

@Injectable()
export class SerpApiHttpClient implements SerpApiClient {
    private readonly logger = new Logger(SerpApiHttpClient.name);

    constructor(
        @Inject(serpApiConfig.KEY)
        private readonly config: ConfigType<typeof serpApiConfig>,
    ) {}

    async autocomplete(input: SerpApiAutocompleteInput): Promise<SerpApiPrediction[]> {
        const searchQuery = input.input.toLowerCase().includes("việt nam") || input.input.toLowerCase().includes("vietnam")
            ? input.input
            : `${input.input} Việt Nam`;

        const params = new URLSearchParams({
            engine: "google_maps",
            q: searchQuery,
            type: "search",
            google_domain: "google.com.vn",
            hl: this.config.languageCode,
            gl: this.config.regionCode.toLowerCase(),
        });

        const response = await this.request(params);

        const results: any[] = response.local_results ?? [];

        if (response.place_results && results.length === 0) {
            results.push(response.place_results);
        }

        return results.flatMap((result) => {
            const placeId = result.place_id ?? result.data_id;
            const displayName = result.title?.trim();

            if (!placeId || !displayName) return [];

            return [
                {
                    placeId,
                    displayName,
                    formattedAddress: result.address?.trim() ?? null,
                },
            ];
        });
    }

    async getPlacePreview(input: SerpApiDetailsInput): Promise<SerpApiPreview> {
        try {
            const placeId = input.placeId.trim();

            const params = new URLSearchParams({
                engine: "google_maps",
                type: "place",
                place_id: placeId,
                google_domain: "google.com.vn",
                hl: this.config.languageCode,
                gl: this.config.regionCode.toLowerCase(),
            });

            const response = await this.request(params);

            const place = response.place_results;
            if (!place) {
                throw new SerpApiUpstreamError(null, "SERPAPI_PLACE_NOT_FOUND");
            }

            const resolvedPlaceId = place.place_id ?? place.data_id ?? placeId;
            const displayName = place.title?.trim();
            if (!displayName) {
                throw new SerpApiUpstreamError(null);
            }

            let parsedTypes: string[] = [];
            if (Array.isArray(place.types)) {
                parsedTypes = place.types.map((t: any) => String(t).trim());
            } else if (typeof place.types === "string") {
                parsedTypes = [place.types.trim()];
            } else if (Array.isArray(place.type)) {
                parsedTypes = place.type.map((t: any) => String(t).trim());
            } else if (typeof place.type === "string") {
                parsedTypes = [place.type.trim()];
            }
            const primaryType = parsedTypes[0] ?? null;

            return {
                provider: "SERPAPI",
                placeId: resolvedPlaceId,
                displayName,
                formattedAddress: typeof place.address === "string" ? place.address.trim() : null,
                types: parsedTypes,
                primaryType: primaryType,
                businessStatus: mapOpenState(typeof place.open_state === "string" ? place.open_state : undefined),
                mapsUrl: place.links?.["directions"] ?? null,
                nationalPhoneNumber: typeof place.phone === "string" ? place.phone.trim() : null,
                websiteUri: typeof place.website === "string" ? place.website.trim() : null,
                rating: finiteNumberOrNull(place.rating),
                userRatingCount: integerOrNull(place.reviews),
            };
        } catch (error) {
            this.logger.error("Unhandled exception in getPlacePreview", error instanceof Error ? error.stack : error);
            throw error;
        }
    }

    private async request(params: URLSearchParams): Promise<any> {
        if (!this.config.enabled || !this.config.apiKey) {
            throw new SerpApiNotConfiguredError();
        }

        params.set("api_key", this.config.apiKey);

        const url = `${this.config.baseUrl}/search.json?${params.toString()}`;

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: { "Accept": "application/json" },
                signal: AbortSignal.timeout(this.config.timeoutMs),
            });

            if (!response.ok) {
                this.logger.warn(`SerpAPI responded with status ${response.status}`);
                throw new SerpApiUpstreamError(response.status);
            }

            const data = (await response.json()) as any;

            if (data.error) {
                this.logger.warn(`SerpAPI error: ${data.error}`);
                throw new SerpApiUpstreamError(null);
            }

            return data;
        } catch (error) {
            if (
                error instanceof SerpApiNotConfiguredError ||
                error instanceof SerpApiUpstreamError
            ) {
                throw error;
            }
            this.logger.error("SerpAPI request failed", error);
            throw new SerpApiUpstreamError(null);
        }
    }
}
