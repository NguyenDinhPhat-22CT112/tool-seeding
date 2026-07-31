import { z } from "zod";

export const targetSegmentSchema = z.object({
  segment: z.string().min(1),
  description: z.string().min(1),
});

export const contentThemeSchema = z.object({
  theme: z.string().min(1),
  description: z.string().min(1),
  examples: z.string().default(""),
});

export const kpiSchema = z.object({
  metric: z.string().min(1),
  target: z.string().min(1),
});

export const strategyGenerationOutputSchema = z.object({
  context: z.string().min(1),
  objectives: z.array(z.string()).min(1),
  targetSegments: z.array(targetSegmentSchema).default([]),
  priorityProblems: z.array(z.string()).default([]),
  mainMessages: z.array(z.string()).default([]),
  responsePrinciples: z.array(z.string()).default([]),
  contentThemes: z.array(contentThemeSchema).default([]),
  risks: z.array(z.string()).default([]),
  kpis: z.array(kpiSchema).default([]),
});

export type StrategyGenerationOutput = z.infer<typeof strategyGenerationOutputSchema>;
