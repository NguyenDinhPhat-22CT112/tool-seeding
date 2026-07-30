import { Body, Controller, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateBusinessFromSerpApiResponse } from "../application/business-location.mapper";
import { BusinessSerpApiService } from "../application/business-serpapi.service";
import { CreateBusinessFromSerpApiDto } from "../application/serpapi.dto";
import { Ctx, RequestContext } from "../../../shared/context/request-context";
import { ApiTemporaryAuth } from "../../../shared/swagger/temporary-auth.decorator";

@ApiTags("Businesses (Import)")
@Controller("businesses/from-serpapi")
@ApiTemporaryAuth()
export class BusinessSerpApiImportController {
    constructor(private readonly service: BusinessSerpApiService) {}

    @Post()
    @ApiOperation({ summary: "Tạo doanh nghiệp mới từ kết quả SerpAPI" })
    @ApiCreatedResponse({ type: CreateBusinessFromSerpApiResponse })
    async importFromSerpApi(
        @Ctx() ctx: RequestContext,
        @Body() dto: CreateBusinessFromSerpApiDto,
    ) {
        return this.service.createBusiness(ctx, dto);
    }
}
