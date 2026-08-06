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
import { AnalysisSessionService } from "../application/analysis-session.service";
import {
  CreateAnalysisSessionDto,
  ListBusinessAnalysisSessionsQueryDto,
  ListAnalysisSessionsQueryDto,
  UpdateAnalysisSessionDto,
} from "../application/analysis-session.dto";
import {
  AnalysisSessionDetailResponse,
  AnalysisSessionListResponse,
} from "../application/analysis-session.mapper";

@ApiTags("Analysis Sessions")
@ApiTemporaryAuth()
@Controller("analysis-sessions")
export class AnalysisSessionsController {
  constructor(private readonly service: AnalysisSessionService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách đợt phân tích trong organization hiện tại" })
  @ApiOkResponse({ type: AnalysisSessionListResponse })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "Tham số lọc hoặc phân trang không hợp lệ",
  })
  list(@Ctx() ctx: RequestContext, @Query() query: ListAnalysisSessionsQueryDto) {
    return this.service.list(ctx, query);
  }

  @Post()
  @ApiOperation({ summary: "Tạo đợt phân tích mới (trạng thái DRAFT)" })
  @ApiCreatedResponse({ type: AnalysisSessionDetailResponse })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: "Không có quyền tạo đợt phân tích",
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Không tìm thấy doanh nghiệp",
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "Dữ liệu không hợp lệ hoặc doanh nghiệp đã ngừng hoạt động",
  })
  create(@Ctx() ctx: RequestContext, @Body() dto: CreateAnalysisSessionDto) {
    return this.service.create(ctx, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết đợt phân tích" })
  @ApiOkResponse({ type: AnalysisSessionDetailResponse })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Không tìm thấy đợt phân tích trong organization hiện tại",
  })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  getDetail(@Ctx() ctx: RequestContext, @Param("id", ResourceIdPipe) id: string) {
    return this.service.getDetail(ctx, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Cập nhật phạm vi/mô tả đợt phân tích (chỉ khi DRAFT)" })
  @ApiOkResponse({ type: AnalysisSessionDetailResponse })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Không tìm thấy đợt phân tích",
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: "Không có quyền sửa đợt phân tích",
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "Dữ liệu không hợp lệ hoặc session không ở trạng thái DRAFT",
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: "Session đã đổi trạng thái trong lúc cập nhật",
  })
  update(
    @Ctx() ctx: RequestContext,
    @Param("id", ResourceIdPipe) id: string,
    @Body() dto: UpdateAnalysisSessionDto,
  ) {
    // DTO không có field status; forbidNonWhitelisted=true sẽ trả 400 nếu client gửi field này.
    return this.service.update(ctx, id, dto);
  }

  @Post(":id/start-data-collection")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bắt đầu nhập dữ liệu (DRAFT → DATA_COLLECTION)" })
  @ApiOkResponse({ type: AnalysisSessionDetailResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto, description: "Không tìm thấy đợt phân tích" })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, description: "Không có quyền" })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: "Trạng thái không cho phép chuyển",
  })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "ID không hợp lệ hoặc doanh nghiệp đã ngừng hoạt động",
  })
  startDataCollection(
    @Ctx() ctx: RequestContext,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.startDataCollection(ctx, id);
  }

  @Post(":id/complete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Hoàn tất đợt phân tích (DATA_COLLECTION → COMPLETED)" })
  @ApiOkResponse({ type: AnalysisSessionDetailResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto, description: "Không tìm thấy đợt phân tích" })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, description: "Không có quyền" })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: "Trạng thái không cho phép chuyển",
  })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  complete(@Ctx() ctx: RequestContext, @Param("id", ResourceIdPipe) id: string) {
    return this.service.complete(ctx, id);
  }

  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Lưu trữ đợt phân tích" })
  @ApiOkResponse({ type: AnalysisSessionDetailResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto, description: "Không tìm thấy đợt phân tích" })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: "Không có quyền lưu trữ đợt phân tích này",
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: "Trạng thái không cho phép archive",
  })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  archive(@Ctx() ctx: RequestContext, @Param("id", ResourceIdPipe) id: string) {
    return this.service.archive(ctx, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Xoá vĩnh viễn đợt phân tích (cascade toàn bộ dữ liệu liên quan)" })
  @ApiOkResponse({ type: AnalysisSessionDetailResponse })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Không tìm thấy đợt phân tích",
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: "Chỉ Org Admin được xóa",
  })
  delete(@Ctx() ctx: RequestContext, @Param("id", ResourceIdPipe) id: string) {
    return this.service.delete(ctx, id);
  }
}

/**
 * Route lồng theo business: GET /businesses/:businessId/analysis-sessions (mục 3.2).
 * Tách controller riêng thay vì nhét thêm path vào AnalysisSessionsController,
 * để tránh 2 controller cùng khai báo trùng base path và dễ đọc route table hơn.
 */
@ApiTags("Businesses")
@ApiTemporaryAuth()
@Controller("businesses/:businessId/analysis-sessions")
export class BusinessAnalysisSessionsController {
  constructor(private readonly service: AnalysisSessionService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách đợt phân tích của doanh nghiệp" })
  @ApiOkResponse({ type: AnalysisSessionListResponse })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "ID, tham số lọc hoặc phân trang không hợp lệ",
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Không tìm thấy doanh nghiệp trong organization hiện tại",
  })
  listByBusiness(
    @Ctx() ctx: RequestContext,
    @Param("businessId", ResourceIdPipe) businessId: string,
    @Query() query: ListBusinessAnalysisSessionsQueryDto,
  ) {
    return this.service.listByBusiness(ctx, businessId, query);
  }
}
