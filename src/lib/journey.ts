import { OUTPUT_KEYS, type AppData, type OutputKey, type StepStatus } from "./types";

export const requiredResultKeys = ["prompt-base", "raio-x", ...OUTPUT_KEYS] as const;

export const journey = [
  { key: "comece-aqui", title: "Comece Aqui", short: "Preparação", href: "/central/comece-aqui", weight: 0, deliverable: "Preparação da jornada" },
  { key: "prompt-base", title: "Base Estratégica", short: "Base Estratégica", href: "/central/prompt-base", weight: 15, deliverable: "Contexto estratégico do negócio" },
  { key: "raio-x", title: "Raio-X Anti-Curiosos", short: "Raio-X", href: "/central/raio-x", weight: 15, deliverable: "Diagnóstico real do funil" },
  { key: "step_1_diagnosis", title: "Plano de Correção do Gargalo", short: "Plano de Correção", href: "/central/passo-1-diagnostico", weight: 15, deliverable: "Plano de ação para o gargalo" },
  { key: "step_2_buyer_map", title: "Passo 2 — Comprador Real", short: "Comprador Real", href: "/central/passo-2-comprador-real", weight: 15, deliverable: "Mapa Comprador vs. Curioso" },
  { key: "step_3_filter_message", title: "Passo 3 — Anúncio-Filtro", short: "Anúncio-Filtro", href: "/central/passo-3-mensagem-filtro", weight: 15, deliverable: "Primeiro Anúncio-Filtro" },
  { key: "step_4_triage_script", title: "Passo 4 — Triagem Lite", short: "Triagem Lite", href: "/central/passo-4-triagem", weight: 15, deliverable: "Script de Triagem Lite" },
  { key: "kit-final", title: "Conclusão — Aula da Imersão + Kit", short: "Imersão", href: "/central/kit-final", weight: 10, deliverable: "Aula da Imersão e resultados" },
] as const;

export function getStepStatus(data: AppData, key: string): StepStatus {
  const complete = key === "comece-aqui" ? data.comeceAquiCompleted : key === "prompt-base" ? data.promptBase.completed : key === "raio-x" ? data.xray.completed : key === "kit-final" ? isFinalStepCompleted(data) : Boolean(data.outputs[key as OutputKey]?.completed);
  if (complete) return "completed";
  return data.startedSteps.includes(key) ? "in_progress" : "not_started";
}

export function isFinalStepCompleted(data: AppData) {
  return areRequiredResultsComplete(data) && data.kitReviewed;
}

export function areRequiredResultsComplete(data: AppData) {
  return data.promptBase.completed && data.xray.completed && OUTPUT_KEYS.every((key) => data.outputs[key]?.completed);
}

export function getProgress(data: AppData) {
  return journey.reduce((total, step) => total + (getStepStatus(data, step.key) === "completed" ? step.weight : 0), 0);
}

export function getNextStep(data: AppData) {
  return journey.find((step) => getStepStatus(data, step.key) !== "completed") ?? journey[journey.length - 1];
}

export const statusLabels: Record<StepStatus, string> = { not_started: "Não iniciado", in_progress: "Em andamento", completed: "Concluído" };
