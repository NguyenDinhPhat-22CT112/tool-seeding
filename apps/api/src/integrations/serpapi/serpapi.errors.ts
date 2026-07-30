import { BadGatewayException, HttpException, HttpStatus, ServiceUnavailableException } from "@nestjs/common";

export class SerpApiNotConfiguredError extends ServiceUnavailableException {
    constructor() {
        super({
            code: "SERPAPI_DISABLED",
            message: "SerpAPI chưa được cấu hình",
        });
    }
}

export class SerpApiUpstreamError extends BadGatewayException {
    constructor(public readonly upstreamStatus: number | null, code = "SERPAPI_UNAVAILABLE") {
        super({
            code,
            message: "Không thể lấy dữ liệu doanh nghiệp từ SerpAPI",
        });
    }
}

export class SerpApiQuotaExceededError extends HttpException {
    constructor(scope: "GLOBAL" | "ORGANIZATION") {
        super({
            code: "SERPAPI_QUOTA_EXCEEDED",
            message: scope === "GLOBAL"
                ? "Hệ thống đã đạt giới hạn SerpAPI trong tháng"
                : "Organization đã đạt giới hạn SerpAPI trong tháng",
        }, HttpStatus.TOO_MANY_REQUESTS);
    }
}
