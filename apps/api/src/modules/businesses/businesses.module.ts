import { Module } from "@nestjs/common";
import { BusinessService } from "./application/business.service";
import { BusinessPolicy } from "./application/business.policy";
import { BUSINESS_REPOSITORY } from "./domain/business.types";
import { PrismaBusinessRepository } from "./infrastructure/prisma-business.repository";
import { BusinessesController } from "./presentation/businesses.controller";
import { SerpApiModule } from "../../integrations/serpapi";
import { BusinessSerpApiService } from "./application/business-serpapi.service";
import { BusinessLocationService } from "./application/business-location.service";
import { SerpApiController } from "./presentation/serpapi.controller";

@Module({
  imports: [SerpApiModule],
  controllers: [
    BusinessesController,
    SerpApiController,
  ],
  providers: [
    BusinessService,
    BusinessPolicy,
    BusinessSerpApiService,
    BusinessLocationService,
    { provide: BUSINESS_REPOSITORY, useClass: PrismaBusinessRepository },
  ],
  exports: [BusinessService],
})
export class BusinessesModule { }
