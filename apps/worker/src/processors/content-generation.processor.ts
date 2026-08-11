import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { renderTemplate } from "@seeding/ai-core";
import { AiAnalysisService } from "../services/ai-analysis.service";
import { JobRepositoryService } from "../services/job-repository.service";
import { globalFileLogger } from "../common/file-logger";

/** Tạo chuỗi JSON mô tả nội dung chiến lược để đưa vào prompt. */
function buildStrategyContent(version: {
  context?: string | null;
  objectives?: unknown;
  targetSegments?: unknown;
  priorityProblems?: unknown;
  mainMessages?: unknown;
  responsePrinciples?: unknown;
  contentThemes?: unknown;
  risks?: unknown;
  kpis?: unknown;
  additionalNotes?: string | null;
}): string {
  return JSON.stringify({
    context: version.context ?? "",
    objectives: version.objectives ?? [],
    targetSegments: version.targetSegments ?? [],
    priorityProblems: version.priorityProblems ?? [],
    mainMessages: version.mainMessages ?? [],
    responsePrinciples: version.responsePrinciples ?? [],
    contentThemes: version.contentThemes ?? [],
    risks: version.risks ?? [],
    kpis: version.kpis ?? [],
    additionalNotes: version.additionalNotes ?? "",
  });
}

/** Tạo chuỗi hồ sơ doanh nghiệp để đưa vào prompt. */
function buildBusinessProfile(business: {
  name: string;
  description?: string | null;
  industry?: string | null;
  brandVoice?: string | null;
  allowedTopics?: unknown;
  bannedTopics?: unknown;
}): string {
  return JSON.stringify({
    name: business.name,
    description: business.description ?? "",
    industry: business.industry ?? "",
    brandVoice: business.brandVoice ?? "",
    allowedTopics: business.allowedTopics ?? [],
    bannedTopics: business.bannedTopics ?? [],
  });
}

@Injectable()
export class ContentGenerationProcessor {
  private readonly logger = new Logger(ContentGenerationProcessor.name);

  constructor(
    private readonly aiAnalysis: AiAnalysisService,
    private readonly jobRepo: JobRepositoryService,
  ) {
    this.logger.log("ContentGenerationProcessor initialized");
  }

  async process(job: Job): Promise<void> {
    const data = job.data as {
      version: number;
      processingJobId: string;
      analysisSessionId: string;
      organizationId: string;
      jobType: string;
      pipelineId?: string | null;
      aiGenerationId: string;
    };

    const { processingJobId, analysisSessionId, organizationId, aiGenerationId } = data;
    const startedAt = Date.now();

    await globalFileLogger.log("INFO", "ContentGenerationProcessor.process called", {
      processingJobId,
      analysisSessionId,
      organizationId,
      aiGenerationId,
      bullmqJobId: job.id,
    });

    this.logger.log({ processingJobId, aiGenerationId }, "AI content generation started");

    await this.jobRepo.markRunning(processingJobId, job.id!);

    const gen = await this.jobRepo.findContentGenerationContext(aiGenerationId);
    if (!gen) {
      await this.jobRepo.markFailed(processingJobId, "AIGeneration not found");
      return;
    }
    if (gen.status !== "PENDING") {
      await this.jobRepo.markFailed(processingJobId, `AIGeneration not pending (${gen.status})`);
      return;
    }

    const version = gen.strategyVersion;
    const business = gen.analysisSession.business;
    const prompt = gen.promptTemplate;
    const existingContent = gen.content?.currentVersion;

    const variables = {
      platform: "google_maps",
      contentType: "review_reply",
      variantCount: "3",
      brandVoice: business.brandVoice ?? "Tự nhiên, chân thật",
      allowedTopics: Array.isArray(business.allowedTopics)
        ? business.allowedTopics.join(", ")
        : "",
      bannedTopics: Array.isArray(business.bannedTopics)
        ? business.bannedTopics.join(", ")
        : "",
      strategyContent: buildStrategyContent(version),
      businessProfile: buildBusinessProfile(business),
      existingContent: existingContent ? existingContent.body : "",
    };

    let promptRendered: string;
    try {
      promptRendered = renderTemplate(prompt.templateBody, variables);
    } catch (err) {
      const message = (err as Error).message;
      await this.jobRepo.markFailed(processingJobId, `Prompt render failed: ${message}`);
      await this.jobRepo.markAIGenerationFailed(aiGenerationId);
      return;
    }

    const callStarted = Date.now();
    try {
      const result = await this.aiAnalysis.generateContent({
        platform: "google_maps",
        contentType: "review_reply",
        variantCount: 3,
        brandVoice: business.brandVoice,
        allowedTopics: Array.isArray(business.allowedTopics)
          ? (business.allowedTopics as string[])
          : [],
        bannedTopics: Array.isArray(business.bannedTopics)
          ? (business.bannedTopics as string[])
          : [],
        strategyContent: variables.strategyContent,
        businessProfile: variables.businessProfile,
        promptVersion: `v${prompt.version}`,
      });

      const durationMs = Date.now() - callStarted;

      const candidates = result.output.items.map((item: { title: string; body: string }, index: number) => ({
        variantIndex: index,
        title: item.title,
        body: item.body,
      }));

      await this.jobRepo.completeAIGeneration({
        aiGenerationId,
        promptRendered,
        aiProvider: result.provider,
        aiModel: result.model,
        promptVersion: result.promptVersion,
        candidates,
        rawResponse: result.rawResponse,
      });

      await this.jobRepo.createUsageLog({
        analysisSessionId,
        organizationId,
        jobType: "CONTENT_GENERATION",
        provider: result.provider,
        model: result.model,
        promptVersion: result.promptVersion,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
        estimatedCost: 0,
        durationMs,
        status: "success",
        requestedAt: new Date(callStarted),
        completedAt: new Date(),
      });

      await this.jobRepo.markCompleted(processingJobId);

      await globalFileLogger.log("INFO", "ContentGenerationProcessor completed", {
        processingJobId,
        aiGenerationId,
        candidateCount: candidates.length,
        durationMs,
      });
      this.logger.log(
        { processingJobId, aiGenerationId, candidateCount: candidates.length, durationMs },
        "AI content generation completed",
      );
    } catch (err) {
      const message = (err as Error).message;
      await this.jobRepo.markFailed(processingJobId, message);
      await this.jobRepo.markAIGenerationFailed(aiGenerationId);
      await this.jobRepo.createUsageLog({
        analysisSessionId,
        organizationId,
        jobType: "CONTENT_GENERATION",
        provider: "unknown",
        model: "unknown",
        promptVersion: "v1",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        durationMs: Date.now() - callStarted,
        status: "failed",
        errorMessage: message,
        requestedAt: new Date(callStarted),
        completedAt: new Date(),
      });
      this.logger.error({ processingJobId, error: message }, "AI content generation failed");
    }
  }
}
