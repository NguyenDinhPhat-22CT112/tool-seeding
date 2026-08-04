import type { SerpApiPrediction, SerpApiPreview } from "@seeding/contracts";

/** Cấu hình thuần (framework-agnostic) cho SerpApiClient. */
export interface SerpApiClientConfig {
  enabled: boolean;
  apiKey: string | undefined;
  baseUrl: string;
  timeoutMs: number;
  languageCode: string;
  regionCode: string;
}

export interface SerpApiAutocompleteInput {
  input: string;
  sessionToken: string;
}

export interface SerpApiDetailsInput {
  placeId: string;
  sessionToken?: string;
}

export type SerpApiReviewsSort =
  | "date_of_rating"
  | "rating_high"
  | "rating_low";

export interface SerpApiReviewsInput {
  placeId: string;
  /** Token phân trang từ response trước — lưu vào payload để resume khi job bị gián đoạn. */
  nextToken?: string | null;
  sortBy?: SerpApiReviewsSort;
}

export interface SerpApiReview {
  reviewId: string;
  rating: number | null;
  text: string;
  reviewerName: string | null;
  publishedAt: string | null;
  likeCount: number | null;
}

export interface SerpApiReviewsPage {
  reviews: SerpApiReview[];
  nextToken: string | null;
  totalReviews: number | null;
}

/** Port interface — API adapter và worker đều dùng chung. */
export interface SerpApiClientLike {
  autocomplete(input: SerpApiAutocompleteInput): Promise<SerpApiPrediction[]>;
  getPlacePreview(input: SerpApiDetailsInput): Promise<SerpApiPreview>;
  getReviewsPage(input: SerpApiReviewsInput): Promise<SerpApiReviewsPage>;
}
