import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SerpApiPreviewResponse, SerpApiAutocompleteResponse } from "../application/business-location.mapper";
import { BusinessSerpApiService } from "../application/business-serpapi.service";
import { SerpApiPreviewDto, SerpApiAutocompleteDto } from "../application/serpapi.dto";
import { SerpApiStatusResponseDto } from "../application/serpapi-status.mapper";
import { Ctx, RequestContext } from "../../../shared/context/request-context";
import { ApiTemporaryAuth } from "../../../shared/swagger/temporary-auth.decorator";

@ApiTags("SerpApi")
@Controller("serpapi")
@ApiTemporaryAuth()
export class SerpApiController {
    constructor(private readonly service: BusinessSerpApiService) {}

    @Get("status")
    @ApiOperation({ summary: "Kiểm tra trạng thái kết nối SerpApi" })
    @ApiOkResponse({ type: SerpApiStatusResponseDto })
    async status(@Ctx() ctx: RequestContext) {
        return this.service.status(ctx);
    }

    @Post("autocomplete")
    @ApiOperation({ summary: "Tìm kiếm địa điểm trên Google Maps qua SerpApi" })
    @ApiOkResponse({ type: SerpApiAutocompleteResponse })
    @ApiBody({ type: SerpApiAutocompleteDto })
    async autocomplete(
        @Ctx() ctx: RequestContext,
        @Body() dto: SerpApiAutocompleteDto,
    ) {
        return this.service.autocomplete(ctx, dto.input, dto.sessionToken);
    }

    @Post("preview")
    @ApiOperation({ summary: "Xem chi tiết địa điểm từ Google Maps qua SerpApi" })
    @ApiOkResponse({ type: SerpApiPreviewResponse })
    @ApiBody({ type: SerpApiPreviewDto })
    async preview(
        @Ctx() ctx: RequestContext,
        @Body() dto: SerpApiPreviewDto,
    ) {
        return this.service.preview(ctx, dto.placeId, dto.sessionToken);
    }
}
