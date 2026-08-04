import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
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
import { CreateDataSourceDto, UpdateDataSourceDto } from "../application/data-source.dto";
import { DataSourceService } from "../application/data-source.service";

@ApiTags("Data Sources")
@ApiTemporaryAuth()
@Controller("analysis-sessions/:sessionId/data-sources")
export class DataSourcesController {
  constructor(private readonly service: DataSourceService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách nguồn dữ liệu trong session" })
  @ApiOkResponse({ description: "Danh sách data sources" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  list(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
  ) {
    return this.service.list(ctx, sessionId);
  }

  @Post()
  @ApiOperation({ summary: "Tạo nguồn dữ liệu mới" })
  @ApiCreatedResponse({ description: "Data source đã tạo" })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  create(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Body() dto: CreateDataSourceDto,
  ) {
    return this.service.create(ctx, sessionId, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết nguồn dữ liệu" })
  @ApiOkResponse({ description: "Data source detail" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  get(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.get(ctx, sessionId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Cập nhật nguồn dữ liệu" })
  @ApiOkResponse({ description: "Data source đã cập nhật" })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  update(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
    @Body() dto: UpdateDataSourceDto,
  ) {
    return this.service.update(ctx, sessionId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Xoá nguồn dữ liệu (chỉ khi chưa có feedback)" })
  @ApiOkResponse({ description: "Data source đã xoá" })
  @ApiConflictResponse({ type: ApiErrorResponseDto, description: "Nguồn dữ liệu đang chứa feedback" })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  remove(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.remove(ctx, sessionId, id);
  }
}
