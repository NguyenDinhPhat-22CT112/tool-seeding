import { Injectable } from "@nestjs/common";
import { PrismaService } from "@seeding/database";
import {
  FeedbackAnalysisEntity,
  FeedbackAnalysisRepository,
  Sentiment,
} from "../domain/feedback-analysis.types";

function toEntity(row: {
  id: string;
  feedbackId: string;
  runNo: number;
  status: string;
  sentiment: string | null;
  sentimentScore: number | null;
  topics: unknown;
  painPoints: unknown;
  questions: unknown;
  priority: number | null;
  confidence: number | null;
  evidence: unknown;
  aiModel: string | null;
  promptVersion: string | null;
  rawResponse: unknown;
  errorMessage: string | null;
  analyzedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): FeedbackAnalysisEntity {
  return {
    id: row.id,
    feedbackId: row.feedbackId,
    runNo: row.runNo,
    status: row.status as FeedbackAnalysisEntity["status"],
    sentiment: row.sentiment as Sentiment | null,
    sentimentScore: row.sentimentScore,
    topics: Array.isArray(row.topics) ? row.topics : [],
    painPoints: Array.isArray(row.painPoints) ? row.painPoints : [],
    questions: Array.isArray(row.questions) ? row.questions : [],
    priority: row.priority,
    confidence: row.confidence,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    aiModel: row.aiModel,
    promptVersion: row.promptVersion,
    errorMessage: row.errorMessage,
    analyzedAt: row.analyzedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaFeedbackAnalysisRepository implements FeedbackAnalysisRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<FeedbackAnalysisEntity | null> {
    const row = await this.prisma.feedbackAnalysis.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async findByFeedbackId(
    feedbackId: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<FeedbackAnalysisEntity[]> {
    const rows = await this.prisma.feedbackAnalysis.findMany({
      where: {
        feedbackId,
        feedback: {
          analysisSessionId,
          analysisSession: { organizationId },
        },
      },
      orderBy: { runNo: "desc" },
    });
    return rows.map(toEntity);
  }

  async findOneByFeedbackId(
    feedbackId: string,
    analysisId: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<FeedbackAnalysisEntity | null> {
    const row = await this.prisma.feedbackAnalysis.findFirst({
      where: {
        id: analysisId,
        feedbackId,
        feedback: {
          analysisSessionId,
          analysisSession: { organizationId },
        },
      },
    });
    return row ? toEntity(row) : null;
  }
}
