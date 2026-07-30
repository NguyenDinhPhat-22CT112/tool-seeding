import { registerAs } from "@nestjs/config";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined) return fallback;
    return value.toLowerCase() === "true";
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const serpApiConfig = registerAs("serpApi", () => ({
    enabled: parseBoolean(process.env.SERPAPI_ENABLED, false),
    apiKey: process.env.SERPAPI_KEY,
    baseUrl: process.env.SERPAPI_BASE_URL ?? "https://serpapi.com",
    timeoutMs: parsePositiveInteger(process.env.SERPAPI_TIMEOUT_MS, 10000),
    languageCode: process.env.SERPAPI_LANGUAGE_CODE ?? "vi",
    regionCode: process.env.SERPAPI_REGION_CODE ?? "VN",
    autocompleteMonthlyLimit: parsePositiveInteger(process.env.SERPAPI_AUTOCOMPLETE_MONTHLY_LIMIT, 8000),
    autocompleteOrgMonthlyLimit: parsePositiveInteger(process.env.SERPAPI_AUTOCOMPLETE_ORG_MONTHLY_LIMIT, 200),
    placeDetailsMonthlyLimit: parsePositiveInteger(process.env.SERPAPI_MONTHLY_LIMIT, 800),
    placeDetailsOrgMonthlyLimit: parsePositiveInteger(process.env.SERPAPI_ORG_MONTHLY_LIMIT, 20),
}));
