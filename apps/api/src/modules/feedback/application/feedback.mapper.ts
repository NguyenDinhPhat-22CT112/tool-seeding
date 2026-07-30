import type { FeedbackListItemResponse, FeedbackResponse } from "@seeding/contracts";
import { FeedbackEntity } from "../domain/feedback.types";

export class FeedbackMapper {
  static toResponse(entity: FeedbackEntity): FeedbackResponse {
    return {
      id: entity.id,
      analysisSessionId: entity.analysisSessionId,
      dataSourceId: entity.dataSourceId,
      externalId: entity.externalId,
      contentHash: entity.contentHash,
      rawContent: entity.rawContent,
      normalizedContent: entity.normalizedContent,
      reviewerName: entity.reviewerName,
      rating: entity.rating,
      language: entity.language,
      sourceUrl: entity.sourceUrl,
      publishedAt: entity.publishedAt?.toISOString() ?? null,
      notes: entity.notes,
      processingStatus: entity.processingStatus,
      duplicateOfId: entity.duplicateOfId,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  static toListItem(entity: FeedbackEntity): FeedbackListItemResponse {
    return {
      id: entity.id,
      rawContent: entity.rawContent,
      rating: entity.rating,
      reviewerName: entity.reviewerName,
      processingStatus: entity.processingStatus,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
