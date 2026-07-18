"use client";

import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { getNextStep, getProgress, getStepStatus, journey, statusLabels } from "@/lib/journey";

export default function Dashboard() {
  const { data } = useApp();
  const progress = getProgress(data);
  const next = getNextStep(data);

  return <div className="mx-auto max-w-2xl">
    <header className="mb-8 text-center">
      <p className="eyebrow">MUV Starter</p>
      <h1 className="display-title mx-auto">Construa seu Filtro Anti-Curiosos com IA</h1>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted">Em até 2 horas, avance pelas aplicações guiadas para identificar dor, urgência e perfil antes do próximo passo comercial.</p>
      <Link href={next.href} className="button button-primary mt-6">{progress ? "Continuar de onde parei" : "Começar aplicação"}<ArrowRight size={16} /></Link>
    </header>

    <section className="card p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between px-2 py-3 text-xs">
        <span className="text-muted">Sua jornada</span>
        <strong className="text-primary">{progress}% concluído</strong>
      </div>
      <div className="space-y-1">{journey.map((step, index) => {
        const status = getStepStatus(data, step.key);
        const available = index === 0 || getStepStatus(data, journey[index - 1].key) === "completed" || status !== "not_started";
        return <Link href={available ? step.href : "#"} aria-disabled={!available} className={`flex items-center gap-4 rounded-xl px-3 py-4 transition ${available ? "hover:bg-white/[.035]" : "pointer-events-none opacity-40"}`} key={step.key}>
          <div className={`grid size-8 shrink-0 place-items-center rounded-full border ${status === "completed" ? "border-success/35 bg-success/10 text-success" : status === "in_progress" ? "border-primary/50 bg-primary/10 text-primary" : "border-white/12 text-muted"}`}>{status === "completed" ? <Check size={15} /> : <span className="text-xs">{index + 1}</span>}</div>
          <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold text-white">{step.title}</h2><p className="mt-1 truncate text-xs text-muted">{statusLabels[status]} · {step.deliverable}</p></div>
          {available ? <ArrowRight className="text-muted" size={16} /> : <Circle className="text-muted" size={13} />}
        </Link>;
      })}</div>
    </section>
    <p className="mt-5 text-center text-xs text-muted">Uma etapa só é concluída quando o entregável obrigatório é salvo.</p>
  </div>;
}
