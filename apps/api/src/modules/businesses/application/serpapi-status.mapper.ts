import type { SerpApiStatusResponse, SerpApiUsageItem as SerpApiUsageItemContract } from "@seeding/contracts";

export class SerpApiUsageItem implements SerpApiUsageItemContract {
    used!: number;
    limit!: number;
    warning!: boolean;
    exhausted!: boolean;
}

export class SerpApiStatusResponseDto implements SerpApiStatusResponse {
    enabled!: boolean;
    configured!: boolean;
    autocomplete?: SerpApiUsageItem;
    placeDetails?: SerpApiUsageItem;
}
