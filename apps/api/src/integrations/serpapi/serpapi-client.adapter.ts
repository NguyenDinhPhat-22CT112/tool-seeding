import { Inject, Injectable } from "@nestjs/common";
import {
  SerpApiClient as SharedSerpApiClient,
  SerpApiClientError,
} from "@seeding/serpapi-client";
import type {
  SerpApiAutocompleteInput,
  SerpApiClient,
  SerpApiDetailsInput,
  SerpApiReviewsInput,
} from "./serpapi.types";
import { SerpApiNotConfiguredError, SerpApiUpstreamError } from "./serpapi.errors";

/**
 * Adapter map lỗi framework-agnostic của shared client thành NestJS exception.
 * Worker dùng shared client trực tiếp; API đi qua adapter để giữ nguyên
 * HTTP status / error code đã có.
 */
@Injectable()
export class SerpApiClientAdapter implements SerpApiClient {
  constructor(
    @Inject(SharedSerpApiClient) private readonly client: SharedSerpApiClient,
  ) {}

  autocomplete(input: SerpApiAutocompleteInput) {
    return this.wrap(() => this.client.autocomplete(input));
  }

  getPlacePreview(input: SerpApiDetailsInput) {
    return this.wrap(() => this.client.getPlacePreview(input));
  }

  getReviewsPage(input: SerpApiReviewsInput) {
    return this.wrap(() => this.client.getReviewsPage(input));
  }

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (!(error instanceof SerpApiClientError)) throw error;
      if (error.code === "SERPAPI_DISABLED") {
        throw new SerpApiNotConfiguredError();
      }
      throw new SerpApiUpstreamError(error.upstreamStatus, error.code);
    }
  }
}
