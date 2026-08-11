import { z } from "zod";

export const contentCandidateSchema = z.object({
  contentTheme: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});

export const contentGenerationOutputSchema = z.object({
  items: z.array(contentCandidateSchema).min(1),
});

export type ContentGenerationOutput = z.infer<typeof contentGenerationOutputSchema>;
export type ContentCandidateOutput = z.infer<typeof contentCandidateSchema>;
