import { z } from "zod";
import { OUTPUT_KEYS, type OutputKey } from "./types";

export const PROMPT_LABELS: Record<OutputKey, string> = {
  step_1_diagnosis: "Passo 1 · Diagnóstico",
  step_2_buyer_map: "Passo 2 · Comprador real",
  step_3_filter_message: "Passo 3 · Anúncio-filtro",
  step_4_triage_script: "Passo 4 · Triagem",
};

const promptTextSchema = z.string().trim().min(20, "O prompt precisa ter pelo menos 20 caracteres.").max(20000);

export const editablePromptConfigSchema = z.object({
  agentInstructions: promptTextSchema,
  contextPrompt: z.string().trim().max(30000),
  stagePrompts: z.object(
    Object.fromEntries(OUTPUT_KEYS.map((key) => [key, promptTextSchema])) as Record<OutputKey, typeof promptTextSchema>,
  ),
  model: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-zA-Z0-9._-]+$/, "Modelo inválido."),
  maxOutputTokens: z.number().int().min(256).max(8000),
  changeNotes: z.string().trim().max(500),
});

export type EditablePromptConfig = z.infer<typeof editablePromptConfigSchema>;
export type PromptConfigStatus = "draft" | "published" | "archived";
export type PromptConfig = EditablePromptConfig & {
  id: string;
  version: number;
  status: PromptConfigStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type PromptStudioState = {
  draft: PromptConfig;
  published: PromptConfig;
  history: PromptConfig[];
};
