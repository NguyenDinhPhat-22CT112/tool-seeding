import {
  Body,
  Controller,
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
import { ApiErrorResponseDto } from "../../../common";
import { Ctx, RequestContext } from "../../../shared/context/request-context";
import { ApiTemporaryAuth } from "../../../shared/swagger/temporary-auth.decorator";
import { ResourceIdPipe } from "../../../shared/validation/resource-id.pipe";
import {
  CreateInsightDto,
  ListInsightsQueryDto,
  MergeInsightsDto,
  ReviewInsightDto,
  SplitInsightDto,
  UpdateInsightDto,
} from "../application/insight.dto";
import { InsightService } from "../application/insight.service";
import { InsightListResponse, InsightResponse } from "../application/insight.mapper";

@ApiTags("Insights")
@ApiTemporaryAuth()
@Controller("analysis-sessions/:sessionId/insights")
export class InsightsController {
  constructor(private readonly service: InsightService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách insight trong session" })
  @ApiOkResponse({ type: InsightListResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto, description: "Session không tồn tại" })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  list(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Query() query: ListInsightsQueryDto,
  ) {
    return this.service.list(ctx, sessionId, query);
  }

  @Post()
  @ApiOperation({ summary: "Tạo insight thủ công (trạng thái DRAFT)" })
  @ApiCreatedResponse({ type: InsightResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, description: "Không có quyền" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  create(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Body() dto: CreateInsightDto,
  ) {
    return this.service.create(ctx, sessionId, dto);
  }

  @Post("merge")
  @ApiOperation({ summary: "Gộp nhiều insight thành một (nguồn bị archive)" })
  @ApiCreatedResponse({ type: InsightResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: "Cần ≥2 insight, cùng session" })
  merge(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Body() dto: MergeInsightsDto,
  ) {
    return this.service.merge(ctx, sessionId, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết insight kèm evidence + review logs" })
  @ApiOkResponse({ type: InsightResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  getById(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.getById(ctx, sessionId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Cập nhật nội dung (chỉ DRAFT / NEEDS_REANALYSIS)" })
  @ApiOkResponse({ type: InsightResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto, description: "Insight đang chờ duyệt/đã duyệt" })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  update(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
    @Body() dto: UpdateInsightDto,
  ) {
    return this.service.update(ctx, sessionId, id, dto);
  }

  @Post(":id/submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Gửi duyệt (DRAFT/REJECTED/NEEDS_REANALYSIS → WAITING_REVIEW)" })
  @ApiOkResponse({ type: InsightResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto, description: "Trạng thái không cho phép" })
  submit(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.submit(ctx, sessionId, id);
  }

  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Duyệt insight (WAITING_REVIEW → APPROVED)" })
  @ApiOkResponse({ type: InsightResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, description: "Cần quyền duyệt" })
  @ApiConflictResponse({ type: ApiErrorResponseDto, description: "Trạng thái không cho phép" })
  approve(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
    @Body() dto: ReviewInsightDto,
  ) {
    return this.service.approve(ctx, sessionId, id, dto);
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Từ chối insight (bắt buộc có lý do)" })
  @ApiOkResponse({ type: InsightResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: "Thiếu lý do từ chối" })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  reject(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
    @Body() dto: ReviewInsightDto,
  ) {
    return this.service.reject(ctx, sessionId, id, dto);
  }

  @Post(":id/reanalysis")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Trả về để phân tích lại (bắt buộc có lý do)" })
  @ApiOkResponse({ type: InsightResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  requestReanalysis(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
    @Body() dto: ReviewInsightDto,
  ) {
    return this.service.requestReanalysis(ctx, sessionId, id, dto);
  }

  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Lưu trữ insight (kết thúc, chỉ đọc)" })
  @ApiOkResponse({ type: InsightResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  archive(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.archive(ctx, sessionId, id);
  }

  @Post(":id/split")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Tách insight thành nhiều insight (nguồn bị archive)" })
  @ApiOkResponse({ type: InsightResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: "Mỗi phần phải có evidence" })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  split(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
    @Body() dto: SplitInsightDto,
  ) {
    return this.service.split(ctx, sessionId, id, dto);
  }
}
