import "server-only";

import { createOpenAIClient } from "./client";
import { formatPromptTicket } from "@/lib/prompt-base";
import type { EditablePromptConfig, PromptConfig } from "@/lib/prompt-config";
import { loadPublishedPromptConfig } from "@/lib/server/prompt-repository";
import { getDefaultPromptConfig, step1OutputContract } from "@/lib/server/stage-prompts";
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
  const preparedContext = prepareAgentContext(lessonKey, context);
  const mandatoryContract = lessonKey === "step_1_diagnosis" ? `\n\nCONTRATO OBRIGATÓRIO DE SAÍDA\n${step1OutputContract}\nIgnore qualquer instrução anterior que conflite com este contrato.` : "";
  const response = await openai.responses.create({
    model: config.model,
    instructions: `${config.agentInstructions}\n\nCONTEXTO PERMANENTE\n${config.contextPrompt}\n\nINSTRUÇÃO DA ETAPA\n${config.stagePrompts[lessonKey]}${mandatoryContract}`,
    input: `CONTEXTO ESTRUTURADO DO ALUNO\n${JSON.stringify(preparedContext)}`,
    tools: vectorStoreId ? [{ type: "file_search", vector_store_ids: [vectorStoreId], max_num_results: 8 }] : undefined,
    max_output_tokens: config.maxOutputTokens,
    store: false,
  });
  if (!response.output_text) throw new Error("O agente não retornou conteúdo.");
  return {
    content: lessonKey === "step_1_diagnosis" ? formatStep1Output(response.output_text) : response.output_text,
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

function prepareAgentContext(lessonKey: GenerationRequest["lessonKey"], context: GenerationRequest["context"]) {
  if (!context) return context;
  const promptBase = { ...Object.fromEntries(Object.entries(context.promptBase).filter(([key]) => key !== "name" && key !== "email")), ticket: formatPromptTicket(String(context.promptBase.ticket || "")) };
  if (lessonKey !== "step_1_diagnosis") return { ...context, promptBase };
  const xray = { ...Object.fromEntries(Object.entries(context.xray).filter(([key]) => key !== "score" && key !== "classification" && key !== "answers")), answers: context.xray.answers.map(({ questionId, category, answer }) => ({ questionId, category, answer })) };
  return { ...context, promptBase, xray };
}

function formatStep1Output(content: string) {
  if (/\b(pontuação|classificação|score|funil cego|funil solto|funil reativo|funil parcial|funil com filtro inicial)\b|\b\d+\s*(?:\/|de)\s*36\b|\b\d+\s*pontos?\b/i.test(content)) throw new Error("O Plano de Correção repetiu dados exclusivos do Raio-X.");
  const sections = [
    ["PRIORIDADE COMERCIAL", "prioridade comercial"],
    ["CAUSA PROVÁVEL DO GARGALO", "causa provavel do gargalo"],
    ["PONTO DO FUNIL QUE PRECISA MUDAR", "ponto do funil que precisa mudar"],
    ["IMPACTO SOBRE TEMPO, CONVERSÃO E CAIXA", "impacto sobre tempo, conversao e caixa"],
    ["AÇÃO PARA OS PRÓXIMOS 7 DIAS", "acao para os proximos 7 dias"],
    ["INDICADOR PARA ACOMPANHAR", "indicador para acompanhar"],
    ["O QUE NÃO PRIORIZAR AGORA", "o que nao priorizar agora"],
  ] as const;
  const collected = new Map<string, string[]>();
  let current: string | undefined;
  for (const line of content.split("\n")) {
    const heading = normalizeHeading(line);
    const matched = sections.find(([, expected]) => heading === expected);
    if (matched) {
      current = matched[0];
      collected.set(current, []);
    } else if (current && line.trim()) {
      collected.get(current)!.push(line.trim());
    }
  }
  if (sections.some(([label]) => !collected.get(label)?.join(" ").trim())) throw new Error("O Plano de Correção não retornou os sete blocos obrigatórios.");
  return sections.map(([label]) => `${label}\n${collected.get(label)!.join("\n")}`).join("\n\n");
}

function normalizeHeading(line: string) {
  return line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^\s*(?:#{1,6}\s*)?(?:\d+[.)]\s*)?/, "").replace(/[*_:]/g, "").trim().toLowerCase();
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
