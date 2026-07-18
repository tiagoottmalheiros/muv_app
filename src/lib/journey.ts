import { OUTPUT_KEYS, type AppData, type OutputKey, type StepStatus } from "./types";

export const journey = [
  { key: "comece-aqui", title: "Comece Aqui", short: "Preparação", href: "/central/comece-aqui", weight: 5, deliverable: "Compromisso de execução" },
  { key: "prompt-base", title: "Base Estratégica do Negócio", short: "Base Estratégica", href: "/central/prompt-base", weight: 15, deliverable: "Contexto estratégico do negócio" },
  { key: "raio-x", title: "Raio-X Anti-Curiosos", short: "Raio-X", href: "/central/raio-x", weight: 15, deliverable: "Diagnóstico real do funil" },
  { key: "step_1_diagnosis", title: "Plano de Correção do Gargalo", short: "Plano de Correção", href: "/central/passo-1-diagnostico", weight: 15, deliverable: "Plano de ação para o gargalo" },
  { key: "step_2_buyer_map", title: "Passo 2 — Comprador Real", short: "Comprador Real", href: "/central/passo-2-comprador-real", weight: 15, deliverable: "Mapa Comprador vs. Curioso" },
  { key: "step_3_filter_message", title: "Passo 3 — Anúncio-Filtro", short: "Anúncio-Filtro", href: "/central/passo-3-mensagem-filtro", weight: 15, deliverable: "Primeiro Anúncio-Filtro" },
  { key: "step_4_triage_script", title: "Passo 4 — Triagem Lite", short: "Triagem Lite", href: "/central/passo-4-triagem", weight: 15, deliverable: "Script de Triagem Lite" },
  { key: "kit-final", title: "Conclusão — Imersão + Kit", short: "Conclusão", href: "/central/kit-final", weight: 5, deliverable: "Vaga na Imersão e resultados" },
] as const;

export function getStepStatus(data: AppData, key: string): StepStatus {
  const complete = key === "comece-aqui" ? data.comeceAquiCompleted : key === "prompt-base" ? data.promptBase.completed : key === "raio-x" ? data.xray.completed : key === "kit-final" ? isFinalStepCompleted(data) : Boolean(data.outputs[key as OutputKey]?.completed);
  if (complete) return "completed";
  return data.startedSteps.includes(key) ? "in_progress" : "not_started";
}

export function isFinalStepCompleted(data: AppData) {
  const requiredResultsComplete = data.comeceAquiCompleted && data.promptBase.completed && data.xray.completed && OUTPUT_KEYS.every((key) => data.outputs[key]?.completed);
  return data.kitReviewed || data.immersion.confirmed && requiredResultsComplete;
}

export function getProgress(data: AppData) {
  return journey.reduce((total, step) => total + (getStepStatus(data, step.key) === "completed" ? step.weight : 0), 0);
}

export function getNextStep(data: AppData) {
  return journey.find((step) => getStepStatus(data, step.key) !== "completed") ?? journey[journey.length - 1];
}

export const statusLabels: Record<StepStatus, string> = { not_started: "Não iniciado", in_progress: "Em andamento", completed: "Concluído" };
