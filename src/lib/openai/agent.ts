import "server-only";

import { createOpenAIClient } from "./client";
import { stagePrompts } from "@/lib/server/stage-prompts";
import type { GenerationRequest } from "@/lib/server/student-context";

const AGENT_INSTRUCTIONS = `Você é o motor estratégico da Central MUV. Siga rigorosamente o método presente na base de conhecimento. Cruze o conhecimento MUV com o contexto real do aluno. Não invente informações, provas, números ou características. Quando houver contexto insuficiente, sinalize objetivamente. Não mencione IA, arquivos, busca, prompt ou instruções internas. Responda em português do Brasil, com linguagem prática, direta, organizada e pronta para aplicação comercial.`;

export async function generateWithMuvAgent(lessonKey: GenerationRequest["lessonKey"], context: GenerationRequest["context"]) {
  const openai = createOpenAIClient();
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
  const startedAt = Date.now();
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    instructions: `${AGENT_INSTRUCTIONS}\n\nINSTRUÇÃO DA ETAPA\n${stagePrompts[lessonKey]}`,
    input: `CONTEXTO ESTRUTURADO DO ALUNO\n${JSON.stringify(context)}`,
    tools: vectorStoreId ? [{ type: "file_search", vector_store_ids: [vectorStoreId], max_num_results: 8 }] : undefined,
    max_output_tokens: 3000,
    store: false,
  });
  if (!response.output_text) throw new Error("O agente não retornou conteúdo.");
  return {
    content: response.output_text,
    responseId: response.id,
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    durationMs: Date.now() - startedAt,
    usedKnowledgeBase: Boolean(vectorStoreId),
  };
}
