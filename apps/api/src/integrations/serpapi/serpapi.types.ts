import type { SerpApiPrediction, SerpApiPreview } from "@seeding/contracts";

export interface SerpApiAutocompleteInput {
    input: string;
    sessionToken: string;
}

export interface SerpApiDetailsInput {
    placeId: string;
    sessionToken?: string;
}

export interface SerpApiClient {
    autocomplete(input: SerpApiAutocompleteInput): Promise<SerpApiPrediction[]>;
    getPlacePreview(input: SerpApiDetailsInput): Promise<SerpApiPreview>;
}

export const SERPAPI_CLIENT = Symbol("SERPAPI_CLIENT");
