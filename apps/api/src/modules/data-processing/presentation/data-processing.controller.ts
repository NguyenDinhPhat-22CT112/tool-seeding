import { Controller, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ApiErrorResponseDto } from "../../../common";
import { Ctx, RequestContext } from "../../../shared/context/request-context";
import { ApiTemporaryAuth } from "../../../shared/swagger/temporary-auth.decorator";
import { ResourceIdPipe } from "../../../shared/validation/resource-id.pipe";
import { ProcessingJobService } from "../application/processing-job.service";

@ApiTags("Data Processing")
@ApiTemporaryAuth()
@Controller("analysis-sessions/:sessionId")
export class DataProcessingController {
  constructor(private readonly service: ProcessingJobService) {}

  @Post("process")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Kích hoạt pipeline xử lý dữ liệu (idempotent)" })
  @ApiCreatedResponse({ description: "Pipeline jobs đã tạo hoặc đang chạy" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  triggerProcess(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
  ) {
    return this.service.triggerProcess(ctx, sessionId);
  }

  @Post("insight-generation")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Kích hoạt AI sinh insights từ feedback analyses" })
  @ApiCreatedResponse({ description: "Insight generation job đã tạo" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  triggerInsightGeneration(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
  ) {
    return this.service.triggerInsightGeneration(ctx, sessionId);
  }

  @Post("strategy-generation")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Kích hoạt AI sinh chiến lược từ insights đã duyệt" })
  @ApiCreatedResponse({ description: "Strategy generation job đã tạo" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  triggerStrategyGeneration(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
  ) {
    return this.service.triggerStrategyGeneration(ctx, sessionId);
  }
}
