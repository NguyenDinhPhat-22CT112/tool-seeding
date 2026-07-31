import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import { Ctx, RequestContext } from "../../../shared/context/request-context";
import { ApiTemporaryAuth } from "../../../shared/swagger/temporary-auth.decorator";
import { ResourceIdPipe } from "../../../shared/validation/resource-id.pipe";
import { ApiErrorResponseDto } from "../../../common";
import { BusinessService } from "../application/business.service";
import { BusinessSerpApiService } from "../application/business-serpapi.service";
import { BusinessLocationService } from "../application/business-location.service";
import {
  CreateBusinessDto,
  ListBusinessesQueryDto,
  UpdateBusinessDto,
} from "../application/business.dto";
import {
  BusinessDetailResponse,
  BusinessListResponse,
} from "../application/business.mapper";
import {
  BusinessLocationListResponse,
  BusinessLocationResponse,
  CreateBusinessFromSerpApiResponse,
} from "../application/business-location.mapper";
import {
  CreateBusinessFromSerpApiDto,
  AddBusinessLocationFromSerpApiDto,
} from "../application/serpapi.dto";
import { UpdateBusinessLocationDto } from "../application/business-location.dto";

@ApiTags("Businesses")
@ApiTemporaryAuth()
@Controller("businesses")
export class BusinessesController {
  constructor(
    private readonly service: BusinessService,
    private readonly serpapi: BusinessSerpApiService,
    private readonly locations: BusinessLocationService,
  ) {}

  // -------------------------------------------------------------------
  // Business CRUD
  // -------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: "Danh sách doanh nghiệp trong organization hiện tại",
  })
  @ApiOkResponse({ type: BusinessListResponse })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "Tham số lọc hoặc phân trang không hợp lệ",
  })
  list(@Ctx() ctx: RequestContext, @Query() query: ListBusinessesQueryDto) {
    return this.service.list(ctx, query);
  }

  @Post()
  @ApiOperation({ summary: "Tạo doanh nghiệp" })
  @ApiCreatedResponse({ type: BusinessDetailResponse })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: "Chỉ Organization Admin được tạo doanh nghiệp",
  })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  create(@Ctx() ctx: RequestContext, @Body() dto: CreateBusinessDto) {
    return this.service.create(ctx, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết doanh nghiệp" })
  @ApiOkResponse({ type: BusinessDetailResponse })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Không tìm thấy doanh nghiệp trong organization hiện tại",
  })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  getDetail(@Ctx() ctx: RequestContext, @Param("id", ResourceIdPipe) id: string) {
    return this.service.getDetail(ctx, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Cập nhật hồ sơ doanh nghiệp đang hoạt động" })
  @ApiOkResponse({ type: BusinessDetailResponse })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Không tìm thấy doanh nghiệp trong organization hiện tại",
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: "Không có quyền cập nhật doanh nghiệp",
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "Doanh nghiệp không ở trạng thái cho phép cập nhật",
  })
  update(
    @Ctx() ctx: RequestContext,
    @Param("id", ResourceIdPipe) id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.service.update(ctx, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Xoá doanh nghiệp" })
  @ApiOkResponse({ type: BusinessDetailResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  delete(@Ctx() ctx: RequestContext, @Param("id", ResourceIdPipe) id: string) {
    return this.service.deactivate(ctx, id);
  }

  // -------------------------------------------------------------------
  // Import từ SerpApi
  // -------------------------------------------------------------------

  @Post("from-serpapi")
  @ApiOperation({
    summary: "Tạo doanh nghiệp mới từ kết quả SerpAPI",
    description:
      "Dùng placeId lấy từ POST /serpapi/preview để tạo business. " +
      "Nếu includeLocation=true, tự động tạo kèm location với dữ liệu từ SerpApi.",
  })
  @ApiCreatedResponse({ type: CreateBusinessFromSerpApiResponse })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  async importFromSerpApi(
    @Ctx() ctx: RequestContext,
    @Body() dto: CreateBusinessFromSerpApiDto,
  ) {
    return this.serpapi.createBusiness(ctx, dto);
  }

  // -------------------------------------------------------------------
  // Locations
  // -------------------------------------------------------------------

  @Get(":businessId/locations")
  @ApiOperation({ summary: "Danh sách địa điểm của doanh nghiệp" })
  @ApiOkResponse({ type: BusinessLocationListResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  listLocations(
    @Ctx() ctx: RequestContext,
    @Param("businessId", ResourceIdPipe) businessId: string,
  ) {
    return this.locations.list(ctx, businessId);
  }

  @Get(":businessId/locations/:locationId")
  @ApiOperation({ summary: "Chi tiết địa điểm doanh nghiệp" })
  @ApiOkResponse({ type: BusinessLocationResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getLocation(
    @Ctx() ctx: RequestContext,
    @Param("businessId", ResourceIdPipe) businessId: string,
    @Param("locationId", ResourceIdPipe) locationId: string,
  ) {
    return this.locations.get(ctx, businessId, locationId);
  }

  @Patch(":businessId/locations/:locationId")
  @ApiOperation({
    summary: "Cập nhật hồ sơ hoặc trạng thái địa điểm",
  })
  @ApiOkResponse({ type: BusinessLocationResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  updateLocation(
    @Ctx() ctx: RequestContext,
    @Param("businessId", ResourceIdPipe) businessId: string,
    @Param("locationId", ResourceIdPipe) locationId: string,
    @Body() dto: UpdateBusinessLocationDto,
  ) {
    return this.locations.update(ctx, businessId, locationId, dto);
  }

  @Post(":businessId/locations/from-serpapi")
  @ApiOperation({
    summary: "Thêm địa điểm từ SerpAPI vào doanh nghiệp hiện có",
    description:
      "Dùng placeId lấy từ POST /serpapi/preview để thêm location. " +
      "Không tạo business mới — chỉ thêm vào business đã tồn tại.",
  })
  @ApiCreatedResponse({ type: BusinessLocationResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  addLocationFromSerpApi(
    @Ctx() ctx: RequestContext,
    @Param("businessId", ResourceIdPipe) businessId: string,
    @Body() dto: AddBusinessLocationFromSerpApiDto,
  ) {
    return this.serpapi.addLocation(ctx, businessId, dto);
  }
}
