import { Inject, Injectable } from "@nestjs/common";
import { DomainError } from "../../../shared/exceptions/domain.exceptions";
import {
  FEEDBACK_ANALYSIS_REPOSITORY,
  FeedbackAnalysisRepository,
} from "../domain/feedback-analysis.types";
import {
  FeedbackAnalysisMapper,
  FeedbackAnalysisResponse,
} from "./feedback-analysis.mapper";

@Injectable()
export class AiAnalysisService {
  constructor(
    @Inject(FEEDBACK_ANALYSIS_REPOSITORY)
    private readonly repo: FeedbackAnalysisRepository,
  ) {}

  async listByFeedback(
    feedbackId: string,
    sessionId: string,
    organizationId: string,
  ): Promise<FeedbackAnalysisResponse[]> {
    const entities = await this.repo.findByFeedbackId(feedbackId, sessionId, organizationId);
    return entities.map(FeedbackAnalysisMapper.toResponse);
  }

  async getOne(
    feedbackId: string,
    analysisId: string,
    sessionId: string,
    organizationId: string,
  ): Promise<FeedbackAnalysisResponse> {
    const entity = await this.repo.findOneByFeedbackId(
      feedbackId,
      analysisId,
      sessionId,
      organizationId,
    );
    if (!entity) {
      throw new DomainError("AI_ANALYSIS_NOT_FOUND");
    }
    return FeedbackAnalysisMapper.toResponse(entity);
  }
}
