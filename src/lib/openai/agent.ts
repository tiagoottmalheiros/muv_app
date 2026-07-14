import "server-only";

import { createOpenAIClient } from "./client";
import type { EditablePromptConfig, PromptConfig } from "@/lib/prompt-config";
import { loadPublishedPromptConfig } from "@/lib/server/prompt-repository";
import { getDefaultPromptConfig } from "@/lib/server/stage-prompts";
import type { GenerationRequest } from "@/lib/server/student-context";

export async function generateWithMuvAgent(
  lessonKey: GenerationRequest["lessonKey"],
  context: GenerationRequest["context"],
  configOverride?: EditablePromptConfig | PromptConfig,
) {
  const openai = createOpenAIClient();
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
  const config = configOverride ?? (await loadRuntimePromptConfig());
  const startedAt = Date.now();
  const response = await openai.responses.create({
    model: config.model,
    instructions: `${config.agentInstructions}\n\nCONTEXTO PERMANENTE\n${config.contextPrompt}\n\nINSTRUÇÃO DA ETAPA\n${config.stagePrompts[lessonKey]}`,
    input: `CONTEXTO ESTRUTURADO DO ALUNO\n${JSON.stringify(context)}`,
    tools: vectorStoreId ? [{ type: "file_search", vector_store_ids: [vectorStoreId], max_num_results: 8 }] : undefined,
    max_output_tokens: config.maxOutputTokens,
    store: false,
  });
  if (!response.output_text) throw new Error("O agente não retornou conteúdo.");
  return {
    content: response.output_text,
    responseId: response.id,
    model: config.model,
    promptConfigId: isStoredPromptConfig(config) ? config.id : undefined,
    promptVersion: isStoredPromptConfig(config) ? config.version : undefined,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    durationMs: Date.now() - startedAt,
    usedKnowledgeBase: Boolean(vectorStoreId),
  };
}

function isStoredPromptConfig(config: EditablePromptConfig | PromptConfig): config is PromptConfig {
  return "id" in config && typeof config.id === "string" && "version" in config && typeof config.version === "number";
}

async function loadRuntimePromptConfig(): Promise<EditablePromptConfig | PromptConfig> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return getDefaultPromptConfig();
  try {
    return (await loadPublishedPromptConfig()) ?? getDefaultPromptConfig();
  } catch (error) {
    console.error("Failed to load published prompt config; using code fallback", error);
    return getDefaultPromptConfig();
  }
}
