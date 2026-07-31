import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ApiErrorResponseDto } from "../../../common";
import { Ctx, RequestContext } from "../../../shared/context/request-context";
import { ApiTemporaryAuth } from "../../../shared/swagger/temporary-auth.decorator";
import { ResourceIdPipe } from "../../../shared/validation/resource-id.pipe";
import { AiAnalysisService } from "../application/ai-analysis.service";

@ApiTags("AI Analysis")
@ApiTemporaryAuth()
@Controller("analysis-sessions/:sessionId/feedback/:feedbackId/analyses")
export class AiAnalysisController {
  constructor(private readonly service: AiAnalysisService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách kết quả AI phân tích feedback" })
  @ApiOkResponse({ description: "Danh sách các lần phân tích" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  list(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("feedbackId", ResourceIdPipe) feedbackId: string,
  ) {
    return this.service.listByFeedback(feedbackId, sessionId, ctx.organizationId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết một lần phân tích AI" })
  @ApiOkResponse({ description: "Kết quả phân tích" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getOne(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Param("feedbackId", ResourceIdPipe) feedbackId: string,
    @Param("id", ResourceIdPipe) id: string,
  ) {
    return this.service.getOne(feedbackId, id, sessionId, ctx.organizationId);
  }
}
