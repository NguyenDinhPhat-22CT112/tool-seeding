import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { memoryStorage } from "multer";
import type { Response } from "express";
import { ApiErrorResponseDto } from "../../../common";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";
import { Ctx, RequestContext } from "../../../shared/context/request-context";
import { ApiTemporaryAuth } from "../../../shared/swagger/temporary-auth.decorator";
import { ResourceIdPipe } from "../../../shared/validation/resource-id.pipe";
import { MAX_FILE_SIZE_BYTES } from "../../../shared/security/file-validator";
import { MapImportColumnsDto } from "../application/import.dto";
import { ImportService } from "../application/import.service";

@ApiTags("Imports")
@ApiTemporaryAuth()
@Controller("analysis-sessions/:sessionId/imports")
export class ImportsController {
  constructor(private readonly service: ImportService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @ApiOperation({ summary: "Upload file Excel/CSV" })
  @ApiCreatedResponse({ description: "File uploaded, headers parsed" })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  upload(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new DomainError("IMPORT_PARSE_ERROR", "File upload bắt buộc");
    }
    return this.service.upload(ctx, sessionId, file);
  }

  @Get()
  @ApiOperation({ summary: "Danh sách import batches trong session" })
  @ApiOkResponse({ description: "Danh sách import batches" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  list(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
  ) {
    return this.service.list(ctx, sessionId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Trạng thái import batch" })
  @ApiOkResponse({ description: "Import batch detail" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getBatch(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.getBatch(ctx, sessionId, id);
  }

  @Post(":id/mapping")
  @ApiOperation({ summary: "Map cột nguồn → target" })
  @ApiOkResponse({ description: "Mapping saved" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  mapColumns(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
    @Body() dto: MapImportColumnsDto,
  ) {
    return this.service.mapColumns(ctx, sessionId, id, dto);
  }

  @Post(":id/preview")
  @ApiOperation({ summary: "Preview 5-10 rows theo mapping" })
  @ApiOkResponse({ description: "Preview rows" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  preview(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.preview(ctx, sessionId, id);
  }

  @Post(":id/confirm")
  @ApiOperation({ summary: "Confirm import — validate và lưu rows hợp lệ" })
  @ApiOkResponse({ description: "Import completed" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  confirm(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.confirm(ctx, sessionId, id);
  }

  @Get(":id/errors")
  @ApiOperation({ summary: "Download error CSV file" })
  @ApiOkResponse({ description: "Error CSV stream" })
  downloadErrors(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
    @Res() res: Response,
  ) {
    return this.service.downloadErrors(ctx, sessionId, id, res);
  }
}
