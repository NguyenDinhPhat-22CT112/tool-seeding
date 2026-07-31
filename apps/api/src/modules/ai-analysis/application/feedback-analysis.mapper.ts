import { FeedbackAnalysisEntity } from "../domain/feedback-analysis.types";

export interface FeedbackAnalysisResponse {
  id: string;
  feedbackId: string;
  runNo: number;
  status: string;
  sentiment: string | null;
  sentimentScore: number | null;
  topics: string[];
  painPoints: string[];
  questions: string[];
  priority: number | null;
  confidence: number | null;
  evidence: Array<{ text: string; relevance: number }>;
  aiModel: string | null;
  promptVersion: string | null;
  errorMessage: string | null;
  analyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class FeedbackAnalysisMapper {
  static toResponse(entity: FeedbackAnalysisEntity): FeedbackAnalysisResponse {
    return {
      id: entity.id,
      feedbackId: entity.feedbackId,
      runNo: entity.runNo,
      status: entity.status,
      sentiment: entity.sentiment,
      sentimentScore: entity.sentimentScore,
      topics: entity.topics,
      painPoints: entity.painPoints,
      questions: entity.questions,
      priority: entity.priority,
      confidence: entity.confidence,
      evidence: entity.evidence,
      aiModel: entity.aiModel,
      promptVersion: entity.promptVersion,
      errorMessage: entity.errorMessage,
      analyzedAt: entity.analyzedAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
