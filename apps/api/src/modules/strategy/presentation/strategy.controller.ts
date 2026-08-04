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
  CreateStrategyRevisionDto,
  ListStrategyVersionsQueryDto,
  ReviewStrategyVersionDto,
  UpdateStrategyVersionDto,
} from "../application/strategy.dto";
import {
  StrategyResponse,
  StrategyVersionListResponse,
  StrategyVersionResponse,
} from "../application/strategy.mapper";
import { StrategyService } from "../application/strategy.service";

@ApiTags("Strategy")
@ApiTemporaryAuth()
@Controller("analysis-sessions/:sessionId/strategy")
export class StrategyController {
  constructor(private readonly service: StrategyService) {}

  @Get()
  @ApiOperation({ summary: "Chiến lược hiện tại của session (kèm version đang active)" })
  @ApiOkResponse({ type: StrategyResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto, description: "Session/chiến lược không tồn tại" })
  getStrategy(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
  ) {
    return this.service.getStrategy(ctx, sessionId);
  }

  @Get("versions")
  @ApiOperation({ summary: "Danh sách các version của chiến lược" })
  @ApiOkResponse({ type: StrategyVersionListResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  listVersions(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Query() query: ListStrategyVersionsQueryDto,
  ) {
    return this.service.listVersions(ctx, sessionId, query);
  }

  @Post("versions")
  @ApiOperation({ summary: "Tạo revision từ version đang chốt (APPROVED/LOCKED → version DRAFT mới)" })
  @ApiCreatedResponse({ type: StrategyVersionResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, description: "Không có quyền" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto, description: "Version hiện tại chưa APPROVED/LOCKED" })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  createRevision(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Body() dto: CreateStrategyRevisionDto,
  ) {
    return this.service.createRevision(ctx, sessionId, dto);
  }

  @Get("versions/:versionId")
  @ApiOperation({ summary: "Chi tiết một version (kèm insight links)" })
  @ApiOkResponse({ type: StrategyVersionResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getVersion(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("versionId", ResourceIdPipe) versionId: string,
  ) {
    return this.service.getVersion(ctx, sessionId, versionId);
  }

  @Patch("versions/:versionId")
  @ApiOperation({ summary: "Cập nhật nội dung version (chỉ AI_DRAFT/DRAFT/NEEDS_REVISION)" })
  @ApiOkResponse({ type: StrategyVersionResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, description: "Không có quyền" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto, description: "Version đã chốt, không sửa được" })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  updateVersion(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("versionId", ResourceIdPipe) versionId: string,
    @Body() dto: UpdateStrategyVersionDto,
  ) {
    return this.service.updateVersion(ctx, sessionId, versionId, dto);
  }

  @Post("versions/:versionId/submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Gửi duyệt (AI_DRAFT/DRAFT/NEEDS_REVISION → WAITING_APPROVAL)" })
  @ApiOkResponse({ type: StrategyVersionResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  submit(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("versionId", ResourceIdPipe) versionId: string,
  ) {
    return this.service.submitVersion(ctx, sessionId, versionId);
  }

  @Post("versions/:versionId/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Duyệt chiến lược (WAITING_APPROVAL → APPROVED)" })
  @ApiOkResponse({ type: StrategyVersionResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, description: "Cần quyền duyệt" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  approve(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("versionId", ResourceIdPipe) versionId: string,
  ) {
    return this.service.approveVersion(ctx, sessionId, versionId);
  }

  @Post("versions/:versionId/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Từ chối chiến lược (bắt buộc có lý do)" })
  @ApiOkResponse({ type: StrategyVersionResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: "Thiếu lý do từ chối" })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  reject(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("versionId", ResourceIdPipe) versionId: string,
    @Body() dto: ReviewStrategyVersionDto,
  ) {
    return this.service.rejectVersion(ctx, sessionId, versionId, dto);
  }

  @Post("versions/:versionId/revision")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Yêu cầu sửa lại từ APPROVED (bắt buộc có lý do)" })
  @ApiOkResponse({ type: StrategyVersionResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  requestRevision(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("versionId", ResourceIdPipe) versionId: string,
    @Body() dto: ReviewStrategyVersionDto,
  ) {
    return this.service.requestRevision(ctx, sessionId, versionId, dto);
  }

  @Post("versions/:versionId/lock")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Khóa version đã duyệt (APPROVED → LOCKED)" })
  @ApiOkResponse({ type: StrategyVersionResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  lock(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("versionId", ResourceIdPipe) versionId: string,
  ) {
    return this.service.lockVersion(ctx, sessionId, versionId);
  }

  @Post("versions/:versionId/archive")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Lưu trữ version (kết thúc, chỉ đọc)" })
  @ApiOkResponse({ type: StrategyVersionResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  archive(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("versionId", ResourceIdPipe) versionId: string,
  ) {
    return this.service.archiveVersion(ctx, sessionId, versionId);
  }
}
