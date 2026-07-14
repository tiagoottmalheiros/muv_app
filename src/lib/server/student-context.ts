import { z } from "zod";

export const generationRequestSchema = z.object({
  lessonKey: z.enum(["step_1_diagnosis", "step_2_buyer_map", "step_3_filter_message", "step_4_triage_script"]),
  context: z.object({
    promptBase: z.record(z.string(), z.union([z.string().max(2000), z.boolean()])),
    xray: z.object({
      score: z.number().min(0).max(36),
      classification: z.string().max(100),
      leakLevel: z.string().max(100),
      bottleneck: z.string().max(100),
      answers: z.array(z.object({ questionId: z.number(), category: z.string(), answer: z.string().max(1000), score: z.number(), optionIndex: z.number() })).max(12),
    }),
    previousOutputs: z.record(z.string(), z.string().max(30000)),
  }),
});

export type GenerationRequest = z.infer<typeof generationRequestSchema>;

// In production, this contract will be populated server-side after validating
// Clerk and reading the authenticated profile's records from Supabase.
export function getDevelopmentContext(input: GenerationRequest["context"]) {
  return input;
}
