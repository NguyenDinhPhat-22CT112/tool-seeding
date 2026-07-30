import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
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
    @ApiOkResponse({ type: SerpApiStatusResponseDto })
    async status(@Ctx() ctx: RequestContext) {
        return this.service.status(ctx);
    }

    @Post("autocomplete")
    @ApiOkResponse({ type: SerpApiAutocompleteResponse })
    async autocomplete(
        @Ctx() ctx: RequestContext,
        @Body() dto: SerpApiAutocompleteDto,
    ) {
        return this.service.autocomplete(ctx, dto.input, dto.sessionToken);
    }

    @Post("preview")
    @ApiOkResponse({ type: SerpApiPreviewResponse })
    async preview(
        @Ctx() ctx: RequestContext,
        @Body() dto: SerpApiPreviewDto,
    ) {
        return this.service.preview(ctx, dto.placeId, dto.sessionToken);
    }
}
