import type { PaginatedResponse } from "@seeding/contracts";

export type Sentiment = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";

export type AnalysisRunStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "NEEDS_RETRY";

export interface FeedbackAnalysisEntity {
  id: string;
  feedbackId: string;
  runNo: number;
  status: AnalysisRunStatus;
  sentiment: Sentiment | null;
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
  analyzedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackAnalysisRepository {
  findById(id: string): Promise<FeedbackAnalysisEntity | null>;

  findByFeedbackId(
    feedbackId: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<FeedbackAnalysisEntity[]>;

  findOneByFeedbackId(
    feedbackId: string,
    analysisId: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<FeedbackAnalysisEntity | null>;
}

export const FEEDBACK_ANALYSIS_REPOSITORY = Symbol("FEEDBACK_ANALYSIS_REPOSITORY");
