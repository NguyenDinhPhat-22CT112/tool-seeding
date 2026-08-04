/** Lỗi cơ bản của SerpApiClient — mang `code` để caller (API adapter / worker) quyết định xử lý. */
export class SerpApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly upstreamStatus: number | null = null,
  ) {
    super(message);
    this.name = "SerpApiClientError";
  }
}

/** Chưa bật / chưa có API key. */
export class SerpApiNotConfiguredError extends SerpApiClientError {
  constructor() {
    super("SerpAPI chưa được cấu hình", "SERPAPI_DISABLED");
    this.name = "SerpApiNotConfiguredError";
  }
}

/** Lỗi upstream (HTTP != 2xx, response có `error`, hoặc network failure). */
export class SerpApiUpstreamError extends SerpApiClientError {
  constructor(upstreamStatus: number | null, code = "SERPAPI_UNAVAILABLE") {
    super("Không thể lấy dữ liệu từ SerpAPI", code, upstreamStatus);
    this.name = "SerpApiUpstreamError";
  }
}
