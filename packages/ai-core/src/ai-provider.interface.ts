import type { FeedbackAnalysisOutput } from "./schemas/feedback-analysis.schema";
import type { InsightGenerationOutput } from "./schemas/insight-generation.schema";
import type { StrategyGenerationOutput } from "./schemas/strategy-generation.schema";
import type { ContentGenerationOutput } from "./schemas/content-generation.schema";

export interface AnalyzeFeedbackInput {
  feedbackId: string;
  content: string;
  businessName: string;
  industry?: string | null;
  objective?: string | null;
  rating?: number | null;
  promptVersion?: string;
}

export interface GenerateInsightsInput {
  businessName: string;
  industry?: string | null;
  objective?: string | null;
  analyses: Array<{
    feedbackId: string;
    content: string;
    sentiment?: string | null;
    sentimentScore?: number | null;
    topics: string[];
    painPoints: string[];
    questions: string[];
    priority?: number | null;
    confidence?: number | null;
  }>;
  promptVersion?: string;
}

export interface GenerateStrategyInput {
  businessName: string;
  objective?: string | null;
  insights: Array<{
    id: string;
    title: string;
    description: string;
    priority: number;
    confidence: number;
    frequencyPct: number;
    status: string;
  }>;
  promptVersion?: string;
}

export interface GenerateContentInput {
  platform: string;
  contentType: string;
  variantCount: number;
  brandVoice?: string | null;
  allowedTopics: string[];
  bannedTopics: string[];
  strategyContent: string;
  businessProfile: string;
  promptVersion?: string;
}

export interface AICompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AnalyzeFeedbackResult {
  output: FeedbackAnalysisOutput;
  model: string;
  provider: string;
  promptVersion: string;
  usage: AICompletionUsage;
  rawResponse: unknown;
  durationMs: number;
}

export interface GenerateInsightsResult {
  output: InsightGenerationOutput;
  model: string;
  provider: string;
  promptVersion: string;
  usage: AICompletionUsage;
  rawResponse: unknown;
  durationMs: number;
}

export interface GenerateStrategyResult {
  output: StrategyGenerationOutput;
  model: string;
  provider: string;
  promptVersion: string;
  usage: AICompletionUsage;
  rawResponse: unknown;
  durationMs: number;
}

export interface GenerateContentResult {
  output: ContentGenerationOutput;
  model: string;
  provider: string;
  promptVersion: string;
  usage: AICompletionUsage;
  rawResponse: unknown;
  durationMs: number;
}

export interface AIProvider {
  readonly name: string;
  analyzeFeedback(input: AnalyzeFeedbackInput): Promise<AnalyzeFeedbackResult>;
  generateInsights(input: GenerateInsightsInput): Promise<GenerateInsightsResult>;
  generateStrategy(input: GenerateStrategyInput): Promise<GenerateStrategyResult>;
  generateContent(input: GenerateContentInput): Promise<GenerateContentResult>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly type?: "SCHEMA_INVALID" | "TIMEOUT" | "NETWORK" | "PROVIDER_ERROR",
    public readonly httpStatus?: number,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
