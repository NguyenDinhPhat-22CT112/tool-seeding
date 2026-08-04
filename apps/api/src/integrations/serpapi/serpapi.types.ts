import type {
  SerpApiAutocompleteInput,
  SerpApiClientLike,
  SerpApiDetailsInput,
  SerpApiReviewsInput,
} from "@seeding/serpapi-client";

export type { SerpApiAutocompleteInput, SerpApiDetailsInput, SerpApiReviewsInput };

/** Type mà API inject — chính là interface của shared client. */
export type SerpApiClient = SerpApiClientLike;

export const SERPAPI_CLIENT = Symbol("SERPAPI_CLIENT");
