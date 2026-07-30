import { Body, Controller, Get, Param, Post } from "@nestjs/common";
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
import { CreateDataSourceDto } from "../application/data-source.dto";
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
}
