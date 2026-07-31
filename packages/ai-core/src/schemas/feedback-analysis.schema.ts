import { z } from "zod";

export const feedbackEvidenceSchema = z.object({
  text: z.string().min(1),
  relevance: z.number().min(0).max(1),
});

export const feedbackAnalysisOutputSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"]),
  sentimentScore: z.number().min(-1).max(1).optional(),
  topics: z.array(z.string()).default([]),
  painPoints: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
  priority: z.number().int().min(1).max(5),
  confidence: z.number().min(0).max(1),
  evidence: z.array(feedbackEvidenceSchema).default([]),
});

export type FeedbackAnalysisOutput = z.infer<typeof feedbackAnalysisOutputSchema>;
