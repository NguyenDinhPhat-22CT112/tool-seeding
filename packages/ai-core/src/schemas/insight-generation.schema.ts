import { z } from "zod";

export const insightEvidenceSchema = z.object({
  feedbackId: z.string().min(1),
  excerpt: z.string().min(1),
  relevance: z.number().min(0).max(1),
});

export const insightOutputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.number().int().min(1).max(5),
  confidence: z.number().min(0).max(1),
  origin: z.enum(["OBSERVED", "INFERRED", "ASSUMED"]),
  frequencyCount: z.number().int().min(0),
  frequencyPct: z.number().min(0).max(100),
  evidence: z.array(insightEvidenceSchema).default([]),
});

export const insightGenerationOutputSchema = z.object({
  insights: z.array(insightOutputSchema).min(1),
});

export type InsightGenerationOutput = z.infer<typeof insightGenerationOutputSchema>;
export type InsightOutput = z.infer<typeof insightOutputSchema>;
