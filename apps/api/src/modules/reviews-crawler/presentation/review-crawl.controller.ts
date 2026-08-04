import { Body, Controller, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
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
import { TriggerReviewCrawlDto } from "../application/review-crawl.dto";
import { TriggerReviewCrawlResponseDto } from "../application/review-crawl.mapper";
import { ReviewCrawlService } from "../application/review-crawl.service";

@ApiTags("Review Crawling")
@ApiTemporaryAuth()
@Controller("analysis-sessions/:sessionId/review-crawl")
export class ReviewCrawlController {
  constructor(private readonly service: ReviewCrawlService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Kích hoạt crawl Google Reviews cho một địa điểm (idempotent)" })
  @ApiCreatedResponse({ type: TriggerReviewCrawlResponseDto, description: "Job REVIEW_CRAWLING đã tạo và enqueue" })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  trigger(
    @Ctx() ctx: RequestContext,
    @Param("sessionId", ResourceIdPipe) sessionId: string,
    @Body() dto: TriggerReviewCrawlDto,
  ) {
    return this.service.trigger(ctx, sessionId, dto);
  }
}
