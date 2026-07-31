import { createHash } from "node:crypto";
import type { Prisma } from "@seeding/database";
import type {
  FeedbackProcessingStatus,
  PaginatedResponse,
} from "@seeding/contracts";

export type { FeedbackProcessingStatus };

export interface FeedbackEntity {
  id: string;
  analysisSessionId: string;
  dataSourceId: string;
  externalId: string | null;
  contentHash: string | null;
  rawContent: string;
  normalizedContent: string | null;
  reviewerName: string | null;
  rating: number | null;
  language: string | null;
  sourceUrl: string | null;
  publishedAt: Date | null;
  notes: string | null;
  processingStatus: FeedbackProcessingStatus;
  duplicateOfId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateFeedbackData = {
  analysisSessionId: string;
  dataSourceId: string;
  rawContent: string;
  contentHash: string;
  reviewerName?: string | null;
  rating?: number | null;
  language?: string | null;
  sourceUrl?: string | null;
  publishedAt?: Date | null;
  notes?: string | null;
};

export type UpdateFeedbackData = Partial<{
  rating: number | null;
  notes: string | null;
}>;

export interface ListFeedbackFilter {
  analysisSessionId: string;
  organizationId: string;
  processingStatus?: FeedbackProcessingStatus;
  page: number;
  pageSize: number;
}

export type Paginated<T> = PaginatedResponse<T>;

export function computeContentHash(rawContent: string): string {
  const normalized = rawContent.trim().normalize("NFC");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export interface FeedbackRepository {
  create(data: CreateFeedbackData): Promise<FeedbackEntity>;

  createMany(data: CreateFeedbackData[], tx?: Prisma.TransactionClient): Promise<number>;

  findByIdInSession(
    id: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<FeedbackEntity | null>;

  list(filter: ListFeedbackFilter): Promise<Paginated<FeedbackEntity>>;

  update(
    id: string,
    analysisSessionId: string,
    organizationId: string,
    data: UpdateFeedbackData,
  ): Promise<FeedbackEntity | null>;

  exclude(
    id: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<FeedbackEntity | null>;
}

export const FEEDBACK_REPOSITORY = Symbol("FEEDBACK_REPOSITORY");
