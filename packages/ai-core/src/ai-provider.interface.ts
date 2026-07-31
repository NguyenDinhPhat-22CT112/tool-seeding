import type { FeedbackAnalysisOutput } from "./schemas/feedback-analysis.schema";

export interface AnalyzeFeedbackInput {
  feedbackId: string;
  content: string;
  businessName: string;
  industry?: string | null;
  objective?: string | null;
  rating?: number | null;
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

export interface AIProvider {
  readonly name: string;
  analyzeFeedback(input: AnalyzeFeedbackInput): Promise<AnalyzeFeedbackResult>;
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
