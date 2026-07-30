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
  CreateFeedbackDto,
  ListFeedbackQueryDto,
  UpdateFeedbackDto,
} from "../application/feedback.dto";
import { FeedbackService } from "../application/feedback.service";

@ApiTags("Feedback")
@ApiTemporaryAuth()
@Controller("analysis-sessions/:sessionId/feedback")
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách feedback trong session" })
  @ApiOkResponse({ description: "Danh sách phân trang" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  list(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Query() query: ListFeedbackQueryDto,
  ) {
    return this.service.list(ctx, sessionId, query);
  }

  @Post()
  @ApiOperation({ summary: "Nhập feedback thủ công" })
  @ApiCreatedResponse({ description: "Feedback đã tạo" })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  create(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.service.create(ctx, sessionId, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết feedback" })
  @ApiOkResponse({ description: "Feedback detail" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getById(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.getById(ctx, sessionId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Cập nhật notes/rating (không sửa rawContent)" })
  @ApiOkResponse({ description: "Feedback đã cập nhật" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  update(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
    @Body() dto: UpdateFeedbackDto,
  ) {
    return this.service.update(ctx, sessionId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Loại feedback khỏi phân tích (EXCLUDED)" })
  @ApiOkResponse({ description: "Feedback đã loại" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  exclude(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.exclude(ctx, sessionId, id);
  }
}
