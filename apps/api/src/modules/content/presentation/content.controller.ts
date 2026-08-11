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
  ContentLibraryQueryDto,
  CreateManualContentDto,
  CreatePromptTemplateDto,
  GenerateContentsDto,
  ListContentsQueryDto,
  ListPromptTemplatesQueryDto,
  ReviewContentDto,
  SaveAIGenerationDto,
  UpdateContentDto,
  UpdateContentTagsDto,
} from "../application/content.dto";
import {
  AIGenerationResponse,
  ContentVersionResponse,
  PromptTemplateResponse,
  SeedingContentDetail,
  SeedingContentListResponse,
} from "../application/content.mapper";
import { ContentService } from "../application/content.service";

@ApiTags("Content")
@ApiTemporaryAuth()
@Controller()
export class ContentController {
  constructor(private readonly service: ContentService) {}

  // ── List & Detail (session-scoped) ──

  @Get("analysis-sessions/:sessionId/contents")
  @ApiOperation({ summary: "Danh sách nội dung của phiên phân tích" })
  @ApiOkResponse({ type: SeedingContentListResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  list(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Query() query: ListContentsQueryDto,
  ) {
    return this.service.list(ctx, sessionId, query);
  }

  @Get("analysis-sessions/:sessionId/contents/:contentId")
  @ApiOperation({ summary: "Chi tiết nội dung (kèm version hiện tại)" })
  @ApiOkResponse({ type: SeedingContentDetail })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getDetail(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("contentId", ResourceIdPipe) contentId: string,
  ) {
    return this.service.getDetail(ctx, sessionId, contentId);
  }

  // ── AI Generation ──

  @Post("analysis-sessions/:sessionId/contents/generate")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Tạo job sinh nội dung AI (candidates, chưa lưu Content)" })
  @ApiCreatedResponse({ type: Object })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  generate(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Body() dto: GenerateContentsDto,
  ) {
    return this.service.generate(ctx, sessionId, dto);
  }

  @Get("ai-generations/:aiGenerationId")
  @ApiOperation({ summary: "Poll trạng thái + candidates của AIGeneration" })
  @ApiOkResponse({ type: AIGenerationResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getAIGeneration(
    @Ctx() ctx: RequestContext,
    @Param("aiGenerationId", ResourceIdPipe) aiGenerationId: string,
  ) {
    return this.service.getAIGeneration(ctx, aiGenerationId);
  }

  @Post("analysis-sessions/:sessionId/ai-generations/:aiGenerationId/save")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Chọn candidate → tạo Content (hoặc ContentVersion nếu rewrite)" })
  @ApiCreatedResponse({ type: SeedingContentDetail })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  saveAIGeneration(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("aiGenerationId", ResourceIdPipe) aiGenerationId: string,
    @Body() dto: SaveAIGenerationDto,
  ) {
    return this.service.saveAIGeneration(ctx, sessionId, aiGenerationId, dto);
  }

  // ── Manual Content ──

  @Post("analysis-sessions/:sessionId/contents/manual")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Tạo nội dung thủ công từ chiến lược" })
  @ApiCreatedResponse({ type: SeedingContentDetail })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  createManual(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Body() dto: CreateManualContentDto,
  ) {
    return this.service.createManual(ctx, sessionId, dto);
  }

  // ── Edit / Tags ──

  @Patch("analysis-sessions/:sessionId/contents/:contentId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Sửa nội dung — chỉ tạo ContentVersion mới khi body/title đổi" })
  @ApiOkResponse({ type: SeedingContentDetail })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  updateContent(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("contentId", ResourceIdPipe) contentId: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.service.updateContent(ctx, sessionId, contentId, dto);
  }

  @Patch("analysis-sessions/:sessionId/contents/:contentId/tags")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cập nhật tags (không sinh version mới)" })
  @ApiOkResponse({ type: SeedingContentDetail })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  updateTags(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("contentId", ResourceIdPipe) contentId: string,
    @Body() dto: UpdateContentTagsDto,
  ) {
    return this.service.updateTags(ctx, sessionId, contentId, dto.tags);
  }

  // ── Rewrite (AI) ──

  @Post("analysis-sessions/:sessionId/contents/:contentId/rewrite")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "AI Rewrite trên content có sẵn → AIGeneration (cần Save riêng)" })
  @ApiCreatedResponse({ type: AIGenerationResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  rewrite(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("contentId", ResourceIdPipe) contentId: string,
    @Body() dto: { promptTemplateId: string },
  ) {
    return this.service.rewrite(ctx, sessionId, contentId, dto);
  }

  // ── Workflow ──

  @Post("analysis-sessions/:sessionId/contents/:contentId/submit-review")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Gửi duyệt (DRAFT/NEEDS_REVISION → WAITING_APPROVAL)" })
  @ApiOkResponse({ type: SeedingContentDetail })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  submit(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("contentId", ResourceIdPipe) contentId: string,
  ) {
    return this.service.submit(ctx, sessionId, contentId);
  }

  @Post("analysis-sessions/:sessionId/contents/:contentId/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Duyệt nội dung (WAITING_APPROVAL → APPROVED)" })
  @ApiOkResponse({ type: SeedingContentDetail })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  approve(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("contentId", ResourceIdPipe) contentId: string,
  ) {
    return this.service.approve(ctx, sessionId, contentId);
  }

  @Post("analysis-sessions/:sessionId/contents/:contentId/request-revision")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Yêu cầu sửa lại (bắt buộc comment)" })
  @ApiOkResponse({ type: SeedingContentDetail })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  requestRevision(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("contentId", ResourceIdPipe) contentId: string,
    @Body() dto: ReviewContentDto,
  ) {
    return this.service.requestRevision(ctx, sessionId, contentId, dto);
  }

  @Post("analysis-sessions/:sessionId/contents/:contentId/lock")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Khóa nội dung đã duyệt (APPROVED → LOCKED)" })
  @ApiOkResponse({ type: SeedingContentDetail })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  lock(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("contentId", ResourceIdPipe) contentId: string,
  ) {
    return this.service.lock(ctx, sessionId, contentId);
  }

  @Post("analysis-sessions/:sessionId/contents/:contentId/unlock")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mở khóa (LOCKED → NEEDS_REVISION, bắt buộc comment)" })
  @ApiOkResponse({ type: SeedingContentDetail })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  unlock(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("contentId", ResourceIdPipe) contentId: string,
    @Body() dto: ReviewContentDto,
  ) {
    return this.service.unlock(ctx, sessionId, contentId, dto);
  }

  @Post("analysis-sessions/:sessionId/contents/:contentId/archive")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Lưu trữ nội dung (kết thúc, chỉ đọc)" })
  @ApiOkResponse({ type: SeedingContentDetail })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  archive(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("contentId", ResourceIdPipe) contentId: string,
  ) {
    return this.service.archive(ctx, sessionId, contentId);
  }

  // ── Versions ──

  @Get("contents/:contentId/versions")
  @ApiOperation({ summary: "Lịch sử các ContentVersion" })
  @ApiOkResponse({ type: [ContentVersionResponse] })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  listVersions(
    @Ctx() ctx: RequestContext,
    @Param("contentId", ResourceIdPipe) contentId: string,
  ) {
    return this.service.listVersions(ctx, contentId);
  }

  @Get("content-versions/:versionId")
  @ApiOperation({ summary: "Chi tiết một ContentVersion" })
  @ApiOkResponse({ type: ContentVersionResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getVersion(
    @Ctx() ctx: RequestContext,
    @Param("versionId", ResourceIdPipe) versionId: string,
  ) {
    return this.service.getVersion(ctx, versionId);
  }

  // ── Prompt Templates ──

  @Get("prompt-templates")
  @ApiOperation({ summary: "Danh sách prompt templates (hệ thống dùng chung)" })
  @ApiOkResponse({ type: [PromptTemplateResponse] })
  listPromptTemplates(
    @Ctx() ctx: RequestContext,
    @Query() query: ListPromptTemplatesQueryDto,
  ) {
    return this.service.listPromptTemplates(ctx, query);
  }

  @Post("prompt-templates")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Tạo prompt template" })
  @ApiCreatedResponse({ type: PromptTemplateResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  createPromptTemplate(
    @Ctx() ctx: RequestContext,
    @Body() dto: CreatePromptTemplateDto,
  ) {
    return this.service.createPromptTemplate(ctx, dto);
  }

  @Patch("prompt-templates/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Sửa prompt template → tạo version mới (không ghi đè)" })
  @ApiOkResponse({ type: PromptTemplateResponse })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  updatePromptTemplate(
    @Ctx() ctx: RequestContext,
    @Param("id", ResourceIdPipe) id: string,
    @Body() dto: CreatePromptTemplateDto,
  ) {
    return this.service.updatePromptTemplate(ctx, id, dto);
  }

  // ── Content Library ──

  @Get("content-library")
  @ApiOperation({ summary: "Thư viện nội dung (chỉ APPROVED/LOCKED)" })
  @ApiOkResponse({ type: SeedingContentListResponse })
  contentLibrary(
    @Ctx() ctx: RequestContext,
    @Query() query: ContentLibraryQueryDto,
  ) {
    return this.service.contentLibrary(ctx, query);
  }
}
