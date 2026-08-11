import type { Prisma } from "@seeding/database";
import type {
  AIGenerationStatus,
  ContentOrigin,
  ContentStatus,
  ContentVersionSource,
  PaginatedResponse,
  PromptPurpose,
} from "@seeding/contracts";

export type {
  AIGenerationStatus,
  ContentOrigin,
  ContentStatus,
  ContentVersionSource,
  PromptPurpose,
};

export const CONTENT_STATUS = {
  DRAFT: "DRAFT",
  WAITING_APPROVAL: "WAITING_APPROVAL",
  NEEDS_REVISION: "NEEDS_REVISION",
  APPROVED: "APPROVED",
  LOCKED: "LOCKED",
  ARCHIVED: "ARCHIVED",
} as const satisfies Record<string, ContentStatus>;

export const AIGENERATION_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  DISCARDED: "DISCARDED",
} as const satisfies Record<string, AIGenerationStatus>;

export const PROMPT_PURPOSE = {
  GENERATE: "GENERATE",
  REWRITE: "REWRITE",
} as const satisfies Record<string, PromptPurpose>;

export interface SeedingContentEntity {
  id: string;
  organizationId: string;
  analysisSessionId: string;
  strategyVersionId: string;
  origin: ContentOrigin;
  status: ContentStatus;
  platform: string;
  contentType: string;
  title: string;
  currentVersionId: string | null;
  contentHash: string | null;
  tags: string[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface ContentVersionEntity {
  id: string;
  contentId: string;
  versionNumber: number;
  title: string;
  body: string;
  contentTheme: string | null;
  source: ContentVersionSource;
  aiGenerationId: string | null;
  editReason: string | null;
  editedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  reviewComment: string | null;
  createdAt: Date;
}

export interface SeedingContentDetailEntity extends SeedingContentEntity {
  currentVersion: ContentVersionEntity | null;
}

export interface AIGenerationEntity {
  id: string;
  organizationId: string;
  analysisSessionId: string;
  strategyVersionId: string;
  contentId: string | null;
  promptTemplateId: string;
  promptRendered: string;
  promptVersion: string | null;
  aiProvider: string;
  aiModel: string;
  parameters: Record<string, unknown>;
  candidates: Array<{ variantIndex: number; title: string; body: string }>;
  selectedCandidateIndex: number | null;
  status: AIGenerationStatus;
  rawResponse: unknown;
  requestedBy: string | null;
  createdAt: Date;
}

export interface PromptTemplateEntity {
  id: string;
  name: string;
  platform: string | null;
  contentType: string;
  purpose: PromptPurpose;
  templateBody: string;
  version: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
}

export type CreateAIGenerationData = {
  organizationId: string;
  analysisSessionId: string;
  strategyVersionId: string;
  promptTemplateId: string;
  requestedBy: string | null;
};

export type CreateManualContentData = {
  organizationId: string;
  analysisSessionId: string;
  strategyVersionId: string;
  title: string;
  body: string;
  platform: string;
  contentType: string;
  tags: string[];
  createdBy: string | null;
};

export type CreateContentFromAIGenerationData = {
  organizationId: string;
  analysisSessionId: string;
  strategyVersionId: string;
  aiGenerationId: string;
  candidateIndex: number;
  createdBy: string | null;
};

export type CreateContentVersionData = {
  title: string;
  body: string;
  contentTheme: string | null;
  source: ContentVersionSource;
  aiGenerationId?: string | null;
  editReason?: string | null;
  editedBy?: string | null;
};

export interface ListContentsFilter {
  analysisSessionId: string;
  organizationId: string;
  status?: ContentStatus;
  origin?: ContentOrigin;
  platform?: string;
  contentType?: string;
  q?: string;
  page: number;
  pageSize: number;
}

export interface ListVersionsFilter {
  contentId: string;
  organizationId: string;
}

export interface ContentRepository {
  findByIdInOrg(
    id: string,
    organizationId: string,
  ): Promise<SeedingContentDetailEntity | null>;

  findByIdInSession(
    id: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<SeedingContentDetailEntity | null>;

  list(filter: ListContentsFilter): Promise<Paginated<SeedingContentEntity>>;

  createManual(data: CreateManualContentData): Promise<SeedingContentDetailEntity>;

  createFromAIGeneration(
    data: CreateContentFromAIGenerationData,
  ): Promise<SeedingContentDetailEntity>;

  createVersion(
    contentId: string,
    organizationId: string,
    data: CreateContentVersionData,
    tx?: Prisma.TransactionClient,
  ): Promise<ContentVersionEntity | null>;

  /** Tạo ContentVersion mới từ candidate của AIGeneration (rewrite) và trỏ currentVersionId sang nó. */
  createVersionFromAIGeneration(
    contentId: string,
    organizationId: string,
    data: CreateContentVersionData,
    tx?: Prisma.TransactionClient,
  ): Promise<ContentVersionEntity | null>;

  updateVersion(
    contentId: string,
    versionId: string,
    organizationId: string,
    data: {
      title?: string;
      body?: string;
      editReason?: string | null;
      editedBy?: string | null;
      reviewedBy?: string | null;
      reviewedAt?: Date | null;
      approvedBy?: string | null;
      approvedAt?: Date | null;
      reviewComment?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<ContentVersionEntity | null>;

  transitionContent(
    id: string,
    organizationId: string,
    opts: {
      expectedStatus: ContentStatus;
      nextStatus: ContentStatus;
      fields?: Partial<{
        archivedAt: Date;
        approvedBy: string | null;
        approvedAt: Date | null;
        lockedAt: Date | null;
        reviewedBy: string;
        reviewedAt: Date;
        reviewComment: string;
      }>;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<SeedingContentEntity | null>;

  repointCurrentVersion(
    contentId: string,
    organizationId: string,
    versionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;

  updateContent(
    id: string,
    organizationId: string,
    data: Partial<{
      title: string;
      contentHash: string;
      tags: string[];
      archivedAt: Date;
    }>,
    tx?: Prisma.TransactionClient,
  ): Promise<SeedingContentEntity | null>;

  countVersions(contentId: string, organizationId: string): Promise<number>;

  listVersions(filter: ListVersionsFilter): Promise<ContentVersionEntity[]>;

  findVersionByIdInOrg(
    id: string,
    organizationId: string,
  ): Promise<ContentVersionEntity | null>;

  /** Chống trùng: đếm content cùng session + platform cùng hash (không phải chính nó). */
  countDuplicateHash(
    analysisSessionId: string,
    platform: string,
    contentHash: string,
    excludeContentId?: string,
  ): Promise<number>;

  /** Tìm AIGeneration trong org. */
  findAIGenerationByIdInOrg(
    id: string,
    organizationId: string,
  ): Promise<AIGenerationEntity | null>;

  createAIGeneration(data: CreateAIGenerationData): Promise<AIGenerationEntity>;

  markAIGenerationSelected(
    id: string,
    selectedCandidateIndex: number,
    contentId: string,
  ): Promise<AIGenerationEntity | null>;

  /** Gắn AIGeneration vào content có sẵn (rewrite) — chưa chọn candidate. */
  linkAIGenerationToContent(
    id: string,
    contentId: string,
  ): Promise<AIGenerationEntity | null>;

  findActiveContentGeneration(
    analysisSessionId: string,
    organizationId: string,
  ): Promise<AIGenerationEntity | null>;

  findPromptTemplateById(
    id: string,
  ): Promise<PromptTemplateEntity | null>;

  listPromptTemplates(filter: {
    platform?: string;
    contentType?: string;
    purpose?: PromptPurpose;
    includeInactive?: boolean;
  }): Promise<PromptTemplateEntity[]>;

  createPromptTemplate(data: {
    name: string;
    platform: string | null;
    contentType: string;
    purpose: PromptPurpose;
    templateBody: string;
    createdBy: string | null;
  }): Promise<PromptTemplateEntity>;

  createPromptTemplateVersion(data: {
    name: string;
    platform: string | null;
    contentType: string;
    purpose: PromptPurpose;
    templateBody: string;
    createdBy: string | null;
  }): Promise<PromptTemplateEntity>;
}

export type Paginated<T> = PaginatedResponse<T>;

export const CONTENT_REPOSITORY = Symbol("CONTENT_REPOSITORY");
