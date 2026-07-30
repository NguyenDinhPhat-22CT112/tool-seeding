import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import {
  ApiConflictResponse,
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
import { ListProcessingJobsQueryDto } from "../application/processing-job.dto";
import { ProcessingJobService } from "../application/processing-job.service";

@ApiTags("Processing Jobs")
@ApiTemporaryAuth()
@Controller("processing-jobs")
export class ProcessingJobsController {
  constructor(private readonly service: ProcessingJobService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách processing jobs" })
  @ApiOkResponse({ description: "Danh sách phân trang" })
  list(@Ctx() ctx: RequestContext, @Query() query: ListProcessingJobsQueryDto) {
    return this.service.list(ctx, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết processing job" })
  @ApiOkResponse({ description: "Job detail" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getById(@Ctx() ctx: RequestContext, @Param("id", ResourceIdPipe) id: string) {
    return this.service.getById(ctx, id);
  }

  @Post(":id/retry")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Retry job FAILED" })
  @ApiOkResponse({ description: "Job đã reset và enqueue lại" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  retry(@Ctx() ctx: RequestContext, @Param("id", ResourceIdPipe) id: string) {
    return this.service.retry(ctx, id);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Hủy job PENDING hoặc RUNNING" })
  @ApiOkResponse({ description: "Job đã hủy" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  cancel(@Ctx() ctx: RequestContext, @Param("id", ResourceIdPipe) id: string) {
    return this.service.cancel(ctx, id);
  }
}
