import { Injectable } from "@nestjs/common";
import { Prisma, PrismaService } from "@seeding/database";
import {
  AIGenerationEntity,
  AIGenerationStatus,
  ContentOrigin,
  ContentRepository,
  ContentStatus,
  ContentVersionEntity,
  ContentVersionSource,
  CreateAIGenerationData,
  CreateContentFromAIGenerationData,
  CreateContentVersionData,
  CreateManualContentData,
  ListContentsFilter,
  Paginated,
  PromptPurpose,
  PromptTemplateEntity,
  SeedingContentDetailEntity,
  SeedingContentEntity,
} from "../domain/content.types";

function asStringArray(value: Prisma.JsonValue | null): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function asJsonArray<T>(value: Prisma.JsonValue | null): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toContentEntity(row: {
  id: string;
  organizationId: string;
  analysisSessionId: string;
  strategyVersionId: string;
  origin: string;
  status: string;
  platform: string;
  contentType: string;
  title: string;
  currentVersionId: string | null;
  contentHash: string | null;
  tags: Prisma.JsonValue;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}): SeedingContentEntity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    analysisSessionId: row.analysisSessionId,
    strategyVersionId: row.strategyVersionId,
    origin: row.origin as ContentOrigin,
    status: row.status as ContentStatus,
    platform: row.platform,
    contentType: row.contentType,
    title: row.title,
    currentVersionId: row.currentVersionId,
    contentHash: row.contentHash,
    tags: asStringArray(row.tags),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
  };
}

function toVersionEntity(row: {
  id: string;
  contentId: string;
  versionNumber: number;
  title: string;
  body: string;
  contentTheme: string | null;
  source: string;
  aiGenerationId: string | null;
  editReason: string | null;
  editedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  reviewComment: string | null;
  createdAt: Date;
}): ContentVersionEntity {
  return {
    id: row.id,
    contentId: row.contentId,
    versionNumber: row.versionNumber,
    title: row.title,
    body: row.body,
    contentTheme: row.contentTheme,
    source: row.source as ContentVersionSource,
    aiGenerationId: row.aiGenerationId,
    editReason: row.editReason,
    editedBy: row.editedBy,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    reviewComment: row.reviewComment,
    createdAt: row.createdAt,
  };
}

function toContentDetailEntity(
  row: {
    id: string;
    organizationId: string;
    analysisSessionId: string;
    strategyVersionId: string;
    origin: string;
    status: string;
    platform: string;
    contentType: string;
    title: string;
    currentVersionId: string | null;
    contentHash: string | null;
    tags: Prisma.JsonValue;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
  } & {
    currentVersion?: {
      id: string;
      contentId: string;
      versionNumber: number;
      title: string;
      body: string;
      contentTheme: string | null;
      source: string;
      aiGenerationId: string | null;
      editReason: string | null;
      editedBy: string | null;
      reviewedBy: string | null;
      reviewedAt: Date | null;
      approvedBy: string | null;
      approvedAt: Date | null;
      reviewComment: string | null;
      createdAt: Date;
    } | null;
  },
): SeedingContentDetailEntity {
  const entity = toContentEntity(row);
  return {
    ...entity,
    currentVersion: row.currentVersion ? toVersionEntity(row.currentVersion) : null,
  };
}

@Injectable()
export class PrismaContentRepository implements ContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdInOrg(
    id: string,
    organizationId: string,
  ): Promise<SeedingContentDetailEntity | null> {
    const row = await this.prisma.seedingContent.findFirst({
      where: { id, organizationId },
      include: { currentVersion: true },
    });
    return row ? toContentDetailEntity(row) : null;
  }

  async findByIdInSession(
    id: string,
    analysisSessionId: string,
    organizationId: string,
  ): Promise<SeedingContentDetailEntity | null> {
    const row = await this.prisma.seedingContent.findFirst({
      where: { id, analysisSessionId, organizationId },
      include: { currentVersion: true },
    });
    return row ? toContentDetailEntity(row) : null;
  }

  async list(filter: ListContentsFilter): Promise<Paginated<SeedingContentEntity>> {
    const where: Prisma.SeedingContentWhereInput = {
      analysisSessionId: filter.analysisSessionId,
      organizationId: filter.organizationId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.origin ? { origin: filter.origin } : {}),
      ...(filter.platform ? { platform: filter.platform } : {}),
      ...(filter.contentType ? { contentType: filter.contentType } : {}),
      ...(filter.q
        ? { OR: [{ title: { contains: filter.q, mode: "insensitive" } }] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.seedingContent.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.seedingContent.count({ where }),
    ]);
    return {
      items: rows.map((row) => toContentEntity(row)),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async createManual(
    data: CreateManualContentData,
  ): Promise<SeedingContentDetailEntity> {
    let contentId = "";
    await this.prisma.$transaction(async (tx) => {
      const content = await tx.seedingContent.create({
        data: {
          organizationId: data.organizationId,
          analysisSessionId: data.analysisSessionId,
          strategyVersionId: data.strategyVersionId,
          origin: "HUMAN_WRITTEN",
          status: "DRAFT",
          platform: data.platform,
          contentType: data.contentType,
          title: data.title,
          tags: data.tags,
          createdBy: data.createdBy,
          contentHash: this.hashContent(data.body),
        },
      });
      contentId = content.id;
      const version = await tx.contentVersion.create({
        data: {
          contentId: content.id,
          versionNumber: 1,
          title: data.title,
          body: data.body,
          contentTheme: null,
          source: "HUMAN_EDIT",
          editedBy: data.createdBy,
        },
      });
      await tx.seedingContent.update({
        where: { id: content.id },
        data: { currentVersionId: version.id },
      });
    });
    return (await this.findByIdInOrg(contentId, data.organizationId))!;
  }

  async createFromAIGeneration(
    data: CreateContentFromAIGenerationData,
  ): Promise<SeedingContentDetailEntity> {
    const gen = await this.prisma.aIGeneration.findFirst({
      where: { id: data.aiGenerationId, organizationId: data.organizationId },
    });
    if (!gen) {
      throw new Error("AIGeneration not found");
    }
    const candidates = asJsonArray<{ variantIndex: number; title: string; body: string }>(
      gen.candidates,
    );
    const candidate = candidates.find((c) => c.variantIndex === data.candidateIndex);
    if (!candidate) {
      throw new Error("Candidate not found");
    }

    let contentId = "";
    await this.prisma.$transaction(async (tx) => {
      const content = await tx.seedingContent.create({
        data: {
          organizationId: data.organizationId,
          analysisSessionId: data.analysisSessionId,
          strategyVersionId: data.strategyVersionId,
          origin: "AI_GENERATED",
          status: "DRAFT",
          platform: "google_maps",
          contentType: "review_reply",
          title: candidate.title,
          tags: [],
          createdBy: data.createdBy,
          contentHash: this.hashContent(candidate.body),
        },
      });
      contentId = content.id;
      const version = await tx.contentVersion.create({
        data: {
          contentId: content.id,
          versionNumber: 1,
          title: candidate.title,
          body: candidate.body,
          contentTheme: null,
          source: "AI_GENERATE",
          aiGenerationId: data.aiGenerationId,
          editedBy: "AI",
        },
      });
      await tx.seedingContent.update({
        where: { id: content.id },
        data: { currentVersionId: version.id },
      });
      await tx.aIGeneration.update({
        where: { id: data.aiGenerationId },
        data: {
          status: "COMPLETED",
          selectedCandidateIndex: data.candidateIndex,
          contentId: content.id,
        },
      });
    });
    return (await this.findByIdInOrg(contentId, data.organizationId))!;
  }

  async createVersion(
    contentId: string,
    organizationId: string,
    data: CreateContentVersionData,
    tx?: Prisma.TransactionClient,
  ): Promise<ContentVersionEntity | null> {
    const client = tx ?? this.prisma;
    const content = await client.seedingContent.findFirst({
      where: { id: contentId, organizationId },
    });
    if (!content) return null;
    const aggregate = await client.contentVersion.aggregate({
      where: { contentId },
      _max: { versionNumber: true },
    });
    const versionNumber = (aggregate._max.versionNumber ?? 0) + 1;
    const version = await client.contentVersion.create({
      data: {
        contentId,
        versionNumber,
        title: data.title,
        body: data.body,
        contentTheme: data.contentTheme,
        source: data.source,
        aiGenerationId: data.aiGenerationId ?? null,
        editReason: data.editReason ?? null,
        editedBy: data.editedBy ?? null,
      },
    });
    await client.seedingContent.update({
      where: { id: contentId },
      data: {
        currentVersionId: version.id,
        title: data.title,
        contentHash: this.hashContent(data.body),
      },
    });
    return toVersionEntity(version);
  }

  async createVersionFromAIGeneration(
    contentId: string,
    organizationId: string,
    data: CreateContentVersionData,
    tx?: Prisma.TransactionClient,
  ): Promise<ContentVersionEntity | null> {
    const client = tx ?? this.prisma;
    const content = await client.seedingContent.findFirst({
      where: { id: contentId, organizationId },
    });
    if (!content) return null;
    const aggregate = await client.contentVersion.aggregate({
      where: { contentId },
      _max: { versionNumber: true },
    });
    const versionNumber = (aggregate._max.versionNumber ?? 0) + 1;
    const version = await client.contentVersion.create({
      data: {
        contentId,
        versionNumber,
        title: data.title,
        body: data.body,
        contentTheme: data.contentTheme,
        source: data.source,
        aiGenerationId: data.aiGenerationId ?? null,
        editReason: data.editReason ?? null,
        editedBy: data.editedBy ?? null,
      },
    });
    await client.seedingContent.update({
      where: { id: contentId },
      data: {
        currentVersionId: version.id,
        title: data.title,
        contentHash: this.hashContent(data.body),
      },
    });
    await client.aIGeneration.update({
      where: { id: data.aiGenerationId! },
      data: { status: "COMPLETED", contentId },
    });
    return toVersionEntity(version);
  }

  async updateVersion(
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
  ): Promise<ContentVersionEntity | null> {
    const client = tx ?? this.prisma;
    const { count } = await client.contentVersion.updateMany({
      where: { id: versionId, contentId, content: { organizationId } },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.body !== undefined ? { body: data.body } : {}),
        ...(data.editReason !== undefined ? { editReason: data.editReason } : {}),
        ...(data.editedBy !== undefined ? { editedBy: data.editedBy } : {}),
        ...(data.reviewedBy !== undefined ? { reviewedBy: data.reviewedBy } : {}),
        ...(data.reviewedAt !== undefined ? { reviewedAt: data.reviewedAt } : {}),
        ...(data.approvedBy !== undefined ? { approvedBy: data.approvedBy } : {}),
        ...(data.approvedAt !== undefined ? { approvedAt: data.approvedAt } : {}),
        ...(data.reviewComment !== undefined ? { reviewComment: data.reviewComment } : {}),
      },
    });
    if (count === 0) return null;
    const row = await client.contentVersion.findFirst({ where: { id: versionId } });
    return row ? toVersionEntity(row) : null;
  }

  async transitionContent(
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
  ): Promise<SeedingContentEntity | null> {
    const client = tx ?? this.prisma;
    const { count } = await client.seedingContent.updateMany({
      where: { id, organizationId, status: opts.expectedStatus },
      data: {
        status: opts.nextStatus,
        ...(opts.fields?.archivedAt !== undefined ? { archivedAt: opts.fields.archivedAt } : {}),
        ...(opts.fields?.approvedBy !== undefined ? { approvedBy: opts.fields.approvedBy } : {}),
        ...(opts.fields?.approvedAt !== undefined ? { approvedAt: opts.fields.approvedAt } : {}),
        ...(opts.fields?.lockedAt !== undefined ? { lockedAt: opts.fields.lockedAt } : {}),
        ...(opts.fields?.reviewedBy !== undefined ? { reviewedBy: opts.fields.reviewedBy } : {}),
        ...(opts.fields?.reviewedAt !== undefined ? { reviewedAt: opts.fields.reviewedAt } : {}),
        ...(opts.fields?.reviewComment !== undefined ? { reviewComment: opts.fields.reviewComment } : {}),
      },
    });
    if (count === 0) return null;
    const row = await client.seedingContent.findFirst({ where: { id, organizationId } });
    return row ? toContentEntity(row) : null;
  }

  async repointCurrentVersion(
    contentId: string,
    organizationId: string,
    versionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.seedingContent.update({
      where: { id: contentId },
      data: { currentVersionId: versionId },
    });
  }

  async updateContent(
    id: string,
    organizationId: string,
    data: Partial<{
      title: string;
      contentHash: string;
      tags: string[];
      archivedAt: Date;
    }>,
    tx?: Prisma.TransactionClient,
  ): Promise<SeedingContentEntity | null> {
    const client = tx ?? this.prisma;
    const { count } = await client.seedingContent.updateMany({
      where: { id, organizationId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.contentHash !== undefined ? { contentHash: data.contentHash } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.archivedAt !== undefined ? { archivedAt: data.archivedAt } : {}),
      },
    });
    if (count === 0) return null;
    const row = await client.seedingContent.findFirst({ where: { id, organizationId } });
    return row ? toContentEntity(row) : null;
  }

  async countVersions(contentId: string, organizationId: string): Promise<number> {
    return this.prisma.contentVersion.count({
      where: { contentId, content: { organizationId } },
    });
  }

  async listVersions(filter: {
    contentId: string;
    organizationId: string;
  }): Promise<ContentVersionEntity[]> {
    const { contentId, organizationId } = filter;
    const rows = await this.prisma.contentVersion.findMany({
      where: { contentId, content: { organizationId } },
      orderBy: { versionNumber: "desc" },
    });
    return rows.map((row) => toVersionEntity(row));
  }

  async findVersionByIdInOrg(
    id: string,
    organizationId: string,
  ): Promise<ContentVersionEntity | null> {
    const row = await this.prisma.contentVersion.findFirst({
      where: { id, content: { organizationId } },
    });
    return row ? toVersionEntity(row) : null;
  }

  async countDuplicateHash(
    analysisSessionId: string,
    platform: string,
    contentHash: string,
    excludeContentId?: string,
  ): Promise<number> {
    return this.prisma.seedingContent.count({
      where: {
        analysisSessionId,
        platform,
        contentHash,
        ...(excludeContentId ? { id: { not: excludeContentId } } : {}),
        archivedAt: null,
      },
    });
  }

  async findAIGenerationByIdInOrg(
    id: string,
    organizationId: string,
  ): Promise<AIGenerationEntity | null> {
    const row = await this.prisma.aIGeneration.findFirst({
      where: { id, organizationId },
    });
    return row ? toAIGenerationEntity(row) : null;
  }

  async createAIGeneration(
    data: CreateAIGenerationData,
  ): Promise<AIGenerationEntity> {
    const row = await this.prisma.aIGeneration.create({
      data: {
        organizationId: data.organizationId,
        analysisSessionId: data.analysisSessionId,
        strategyVersionId: data.strategyVersionId,
        promptTemplateId: data.promptTemplateId,
        promptRendered: "",
        aiProvider: "",
        aiModel: "",
        status: "PENDING",
        requestedBy: data.requestedBy,
      },
    });
    return toAIGenerationEntity(row);
  }

  async markAIGenerationSelected(
    id: string,
    selectedCandidateIndex: number,
    contentId: string,
  ): Promise<AIGenerationEntity | null> {
    const row = await this.prisma.aIGeneration.update({
      where: { id },
      data: { selectedCandidateIndex, contentId },
    });
    return toAIGenerationEntity(row);
  }

  async linkAIGenerationToContent(
    id: string,
    contentId: string,
  ): Promise<AIGenerationEntity | null> {
    const row = await this.prisma.aIGeneration.update({
      where: { id },
      data: { contentId },
    });
    return toAIGenerationEntity(row);
  }

  async findActiveContentGeneration(
    analysisSessionId: string,
    organizationId: string,
  ): Promise<AIGenerationEntity | null> {
    const row = await this.prisma.aIGeneration.findFirst({
      where: {
        analysisSessionId,
        organizationId,
        status: { in: ["PENDING", "COMPLETED"] },
      },
      orderBy: { createdAt: "desc" },
    });
    return row ? toAIGenerationEntity(row) : null;
  }

  async findPromptTemplateById(id: string): Promise<PromptTemplateEntity | null> {
    const row = await this.prisma.promptTemplate.findFirst({
      where: { id, isActive: true },
    });
    return row ? toPromptTemplateEntity(row) : null;
  }

  async listPromptTemplates(filter: {
    platform?: string;
    contentType?: string;
    purpose?: PromptPurpose;
    includeInactive?: boolean;
  }): Promise<PromptTemplateEntity[]> {
    const rows = await this.prisma.promptTemplate.findMany({
      where: {
        ...(filter.platform ? { platform: filter.platform } : {}),
        ...(filter.contentType ? { contentType: filter.contentType } : {}),
        ...(filter.purpose ? { purpose: filter.purpose } : {}),
        ...(filter.includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => toPromptTemplateEntity(row));
  }

  async createPromptTemplate(data: {
    name: string;
    platform: string | null;
    contentType: string;
    purpose: PromptPurpose;
    templateBody: string;
    createdBy: string | null;
  }): Promise<PromptTemplateEntity> {
    const row = await this.prisma.promptTemplate.create({
      data: {
        name: data.name,
        platform: data.platform,
        contentType: data.contentType,
        purpose: data.purpose,
        templateBody: data.templateBody,
        version: 1,
        createdBy: data.createdBy,
      },
    });
    return toPromptTemplateEntity(row);
  }

  async createPromptTemplateVersion(data: {
    name: string;
    platform: string | null;
    contentType: string;
    purpose: PromptPurpose;
    templateBody: string;
    createdBy: string | null;
  }): Promise<PromptTemplateEntity> {
    const aggregate = await this.prisma.promptTemplate.aggregate({
      _max: { version: true },
    });
    const version = (aggregate._max.version ?? 0) + 1;
    const row = await this.prisma.promptTemplate.create({
      data: {
        name: data.name,
        platform: data.platform,
        contentType: data.contentType,
        purpose: data.purpose,
        templateBody: data.templateBody,
        version,
        createdBy: data.createdBy,
      },
    });
    return toPromptTemplateEntity(row);
  }

  private hashContent(body: string): string {
    const normalized = body.trim().replace(/\s+/g, " ");
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }
}

function toAIGenerationEntity(row: {
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
  parameters: Prisma.JsonValue;
  candidates: Prisma.JsonValue;
  selectedCandidateIndex: number | null;
  status: string;
  rawResponse: Prisma.JsonValue | null;
  requestedBy: string | null;
  createdAt: Date;
}): AIGenerationEntity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    analysisSessionId: row.analysisSessionId,
    strategyVersionId: row.strategyVersionId,
    contentId: row.contentId,
    promptTemplateId: row.promptTemplateId,
    promptRendered: row.promptRendered,
    promptVersion: row.promptVersion,
    aiProvider: row.aiProvider,
    aiModel: row.aiModel,
    parameters: (row.parameters ?? {}) as Record<string, unknown>,
    candidates: asJsonArray<{ variantIndex: number; title: string; body: string }>(row.candidates),
    selectedCandidateIndex: row.selectedCandidateIndex,
    status: row.status as AIGenerationStatus,
    rawResponse: row.rawResponse,
    requestedBy: row.requestedBy,
    createdAt: row.createdAt,
  };
}

function toPromptTemplateEntity(row: {
  id: string;
  name: string;
  platform: string | null;
  contentType: string;
  purpose: string;
  templateBody: string;
  version: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
}): PromptTemplateEntity {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    contentType: row.contentType,
    purpose: row.purpose as PromptPurpose,
    templateBody: row.templateBody,
    version: row.version,
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}
