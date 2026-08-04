import { Module } from "@nestjs/common";
import { ConfigModule, ConfigType } from "@nestjs/config";
import { SerpApiClient as SharedSerpApiClient } from "@seeding/serpapi-client";
import { serpApiConfig } from "./serpapi.config";
import { SerpApiClientAdapter } from "./serpapi-client.adapter";
import { SERPAPI_CLIENT } from "./serpapi.types";
import { SerpApiUsageService } from "./serpapi-usage.service";
import { SerpApiGatewayService } from "./serpapi-gateway.service";

@Module({
    imports: [ConfigModule.forFeature(serpApiConfig)],
    providers: [
        {
            provide: SharedSerpApiClient,
            inject: [serpApiConfig.KEY],
            useFactory: (config: ConfigType<typeof serpApiConfig>) =>
                new SharedSerpApiClient({
                    enabled: config.enabled,
                    apiKey: config.apiKey,
                    baseUrl: config.baseUrl,
                    timeoutMs: config.timeoutMs,
                    languageCode: config.languageCode,
                    regionCode: config.regionCode,
                }),
        },
        SerpApiClientAdapter,
        {
            provide: SERPAPI_CLIENT,
            useExisting: SerpApiClientAdapter,
        },
        SerpApiUsageService,
        SerpApiGatewayService,
    ],
    exports: [SERPAPI_CLIENT, SerpApiGatewayService, SharedSerpApiClient],
})
export class SerpApiModule {}
