import type { AppData, OutputKey, StepStatus } from "./types";

export const journey = [
  { key: "comece-aqui", title: "Comece Aqui", short: "Preparação", href: "/central/comece-aqui", weight: 5, deliverable: "Compromisso de execução" },
  { key: "prompt-base", title: "Prompt Base", short: "Prompt Base", href: "/central/prompt-base", weight: 15, deliverable: "Base estratégica do negócio" },
  { key: "raio-x", title: "Raio-X Anti-Curiosos", short: "Raio-X", href: "/central/raio-x", weight: 15, deliverable: "Diagnóstico real do funil" },
  { key: "step_1_diagnosis", title: "Passo 1 — Diagnóstico", short: "Diagnóstico", href: "/central/passo-1-diagnostico", weight: 15, deliverable: "Raio-X do Funil + gargalo" },
  { key: "step_2_buyer_map", title: "Passo 2 — Comprador Real", short: "Comprador Real", href: "/central/passo-2-comprador-real", weight: 15, deliverable: "Mapa Comprador vs. Curioso" },
  { key: "step_3_filter_message", title: "Passo 3 — Anúncio-Filtro", short: "Anúncio-Filtro", href: "/central/passo-3-mensagem-filtro", weight: 15, deliverable: "Primeiro Anúncio-Filtro" },
  { key: "step_4_triage_script", title: "Passo 4 — Triagem Lite", short: "Triagem Lite", href: "/central/passo-4-triagem", weight: 15, deliverable: "Script de Triagem Lite" },
  { key: "kit-final", title: "Kit Final", short: "Kit Final", href: "/central/kit-final", weight: 5, deliverable: "Kit revisado" },
] as const;

export function getStepStatus(data: AppData, key: string): StepStatus {
  const complete = key === "comece-aqui" ? data.comeceAquiCompleted : key === "prompt-base" ? data.promptBase.completed : key === "raio-x" ? data.xray.completed : key === "kit-final" ? data.kitReviewed : Boolean(data.outputs[key as OutputKey]?.completed);
  if (complete) return "completed";
  return data.startedSteps.includes(key) ? "in_progress" : "not_started";
}

export function getProgress(data: AppData) {
  return journey.reduce((total, step) => total + (getStepStatus(data, step.key) === "completed" ? step.weight : 0), 0);
}

export function getNextStep(data: AppData) {
  return journey.find((step) => getStepStatus(data, step.key) !== "completed") ?? journey[journey.length - 1];
}

export const statusLabels: Record<StepStatus, string> = { not_started: "Não iniciado", in_progress: "Em andamento", completed: "Concluído" };
