import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { serpApiConfig } from "./serpapi.config";
import { SerpApiHttpClient } from "./serpapi-http.client";
import { SERPAPI_CLIENT } from "./serpapi.types";
import { SerpApiUsageService } from "./serpapi-usage.service";
import { SerpApiGatewayService } from "./serpapi-gateway.service";

@Module({
    imports: [ConfigModule.forFeature(serpApiConfig)],
    providers: [
        SerpApiHttpClient,
        {
            provide: SERPAPI_CLIENT,
            useExisting: SerpApiHttpClient,
        },
        SerpApiUsageService,
        SerpApiGatewayService,
    ],
    exports: [SERPAPI_CLIENT, SerpApiGatewayService],
})
export class SerpApiModule {}
