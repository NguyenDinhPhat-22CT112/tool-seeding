import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ApiErrorResponseDto } from "../../../common";
import { Ctx, RequestContext } from "../../../shared/context/request-context";
import { ApiTemporaryAuth } from "../../../shared/swagger/temporary-auth.decorator";
import { ResourceIdPipe } from "../../../shared/validation/resource-id.pipe";
import {
  BusinessLocationListResponse,
  BusinessLocationResponse,
} from "../application/business-location.mapper";
import { BusinessLocationService } from "../application/business-location.service";
import { BusinessSerpApiService } from "../application/business-serpapi.service";
import { AddBusinessLocationFromSerpApiDto } from "../application/serpapi.dto";
import {
  CreateBusinessLocationDto,
  UpdateBusinessLocationDto,
} from "../application/business-location.dto";

@ApiTags("Business Locations")
@ApiTemporaryAuth()
@Controller("businesses/:businessId/locations")
export class BusinessLocationsController {
  constructor(
    private readonly locations: BusinessLocationService,
    private readonly serpapi: BusinessSerpApiService,
  ) { }

  @Get()
  @ApiOperation({ summary: "Danh sách địa điểm của doanh nghiệp" })
  @ApiOkResponse({ type: BusinessLocationListResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  list(
    @Ctx() ctx: RequestContext,
    @Param("businessId", ResourceIdPipe) businessId: string,
  ) {
    return this.locations.list(ctx, businessId);
  }

  @Post()
  @ApiOperation({ summary: "Tạo địa điểm thủ công" })
  @ApiCreatedResponse({ type: BusinessLocationResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  create(
    @Ctx() ctx: RequestContext,
    @Param("businessId", ResourceIdPipe) businessId: string,
    @Body() dto: CreateBusinessLocationDto,
  ) {
    return this.locations.create(ctx, businessId, dto);
  }

  @Get(":locationId")
  @ApiOperation({ summary: "Chi tiết địa điểm doanh nghiệp" })
  @ApiOkResponse({ type: BusinessLocationResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  get(
    @Ctx() ctx: RequestContext,
    @Param("businessId", ResourceIdPipe) businessId: string,
    @Param("locationId", ResourceIdPipe) locationId: string,
  ) {
    return this.locations.get(ctx, businessId, locationId);
  }

  @Patch(":locationId")
  @ApiOperation({
    summary: "Cập nhật hồ sơ hoặc trạng thái địa điểm",
  })
  @ApiOkResponse({ type: BusinessLocationResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  update(
    @Ctx() ctx: RequestContext,
    @Param("businessId", ResourceIdPipe) businessId: string,
    @Param("locationId", ResourceIdPipe) locationId: string,
    @Body() dto: UpdateBusinessLocationDto,
  ) {
    return this.locations.update(ctx, businessId, locationId, dto);
  }

  @Post("from-serpapi")
  @ApiOperation({ summary: "Thêm địa điểm từ SerpAPI vào doanh nghiệp hiện có" })
  @ApiCreatedResponse({ type: BusinessLocationResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  addFromSerpApi(
    @Ctx() ctx: RequestContext,
    @Param("businessId", ResourceIdPipe) businessId: string,
    @Body() dto: AddBusinessLocationFromSerpApiDto,
  ) {
    return this.serpapi.addLocation(ctx, businessId, dto);
  }

  @Post(":locationId/disconnect-external")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Ngắt liên kết dữ liệu ngoài khỏi địa điểm" })
  @ApiOkResponse({ type: BusinessLocationResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  disconnectExternal(
    @Ctx() ctx: RequestContext,
    @Param("businessId", ResourceIdPipe) businessId: string,
    @Param("locationId", ResourceIdPipe) locationId: string,
  ) {
    return this.locations.disconnectExternal(ctx, businessId, locationId);
  }
}
