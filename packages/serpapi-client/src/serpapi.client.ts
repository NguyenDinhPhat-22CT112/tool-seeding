import type {
  SerpApiPrediction,
  SerpApiPreview,
  SerpApiBusinessStatus,
} from "@seeding/contracts";
import {
  SerpApiClientError,
  SerpApiNotConfiguredError,
  SerpApiUpstreamError,
} from "./serpapi.errors";
import type {
  SerpApiAutocompleteInput,
  SerpApiClientConfig,
  SerpApiClientLike,
  SerpApiDetailsInput,
  SerpApiReview,
  SerpApiReviewsInput,
  SerpApiReviewsPage,
} from "./serpapi.types";

function mapOpenState(openState?: string): SerpApiBusinessStatus {
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

/** Client HTTP thuần (không phụ thuộc NestJS) — dùng chung giữa API và worker. */
export class SerpApiClient implements SerpApiClientLike {
  constructor(private readonly config: SerpApiClientConfig) {}

  async autocomplete(input: SerpApiAutocompleteInput): Promise<SerpApiPrediction[]> {
    const searchQuery =
      input.input.toLowerCase().includes("việt nam") ||
      input.input.toLowerCase().includes("vietnam")
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

    const parsedTypes = extractTypes(place);
    const primaryType = parsedTypes[0] ?? null;

    return {
      provider: "SERPAPI",
      placeId: resolvedPlaceId,
      displayName,
      formattedAddress: typeof place.address === "string" ? place.address.trim() : null,
      types: parsedTypes,
      primaryType,
      businessStatus: mapOpenState(typeof place.open_state === "string" ? place.open_state : undefined),
      mapsUrl: place.links?.["directions"] ?? null,
      nationalPhoneNumber: typeof place.phone === "string" ? place.phone.trim() : null,
      websiteUri: typeof place.website === "string" ? place.website.trim() : null,
      rating: finiteNumberOrNull(place.rating),
      userRatingCount: integerOrNull(place.reviews),
    };
  }

  async getReviewsPage(input: SerpApiReviewsInput): Promise<SerpApiReviewsPage> {
    const placeId = input.placeId.trim();

    const params = new URLSearchParams({
      engine: "google_maps_reviews",
      place_id: placeId,
      google_domain: "google.com.vn",
      hl: this.config.languageCode,
      gl: this.config.regionCode.toLowerCase(),
      sort_by: input.sortBy ?? "date_of_rating",
    });

    if (input.nextToken) {
      params.set("next_page_token", input.nextToken);
    }

    const response = await this.request(params);

    const rawReviews: any[] = Array.isArray(response.reviews) ? response.reviews : [];
    const reviews: SerpApiReview[] = rawReviews
      .map((review) => parseReview(review))
      .filter((review): review is SerpApiReview => review !== null);

    const pagination = response.serpapi_pagination;
    const nextToken =
      typeof pagination?.next_page_token === "string"
        ? pagination.next_page_token
        : null;

    return {
      reviews,
      nextToken,
      totalReviews: integerOrNull(response.reviews_rating ?? response.total_reviews),
    };
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
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      if (!response.ok) {
        throw new SerpApiUpstreamError(response.status);
      }

      const data = (await response.json()) as any;
      if (data.error) {
        throw new SerpApiUpstreamError(null);
      }

      return data;
    } catch (error) {
      if (error instanceof SerpApiClientError) {
        throw error;
      }
      throw new SerpApiUpstreamError(null);
    }
  }
}

function extractTypes(place: any): string[] {
  const types = place.types ?? place.type ?? [];
  if (Array.isArray(types)) return types.map((t: any) => String(t).trim()).filter(Boolean);
  if (typeof types === "string") return [types.trim()].filter(Boolean);
  return [];
}

function parseReview(review: any): SerpApiReview | null {
  const rawText = review.snippet ?? review.review?.text ?? review.text;
  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    return null;
  }

  const reviewId = review.review_id ?? review.id ?? review.place_id;
  if (typeof reviewId !== "string" || reviewId.length === 0) {
    return null;
  }

  const rawDate = review.iso_date ?? review.date;
  let publishedAt: string | null = null;
  if (typeof rawDate === "string") {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      publishedAt = parsed.toISOString();
    }
  }

  return {
    reviewId,
    rating: integerOrNull(review.rating),
    text: rawText.trim(),
    reviewerName: typeof review.user?.name === "string" ? review.user.name.trim() : null,
    publishedAt,
    likeCount: integerOrNull(review.likes ?? review.like_count),
  };
}
