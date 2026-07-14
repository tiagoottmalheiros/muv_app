"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Button, PageHeader, VideoLesson } from "@/components/ui";

export default function StartPage() {
  const { data, update } = useApp();
  const checks = ["Reserve cerca de 2 horas", "Tenha sua oferta e ticket em mente", "Responda com exemplos reais", "Salve o entregável de cada etapa"];
  function complete() { update((current) => ({ ...current, comeceAquiCompleted: true, startedSteps: [...new Set([...current.startedSteps, "comece-aqui"])] })); }

  return <>
    <PageHeader eyebrow="Etapa 1 · Preparação" title="Comece por aqui" description="Entenda a jornada e prepare o ambiente antes de construir seu primeiro ativo." />
    <div className="space-y-5">
      <VideoLesson title="Boas-vindas: Comece Aqui" />
      <section className="card text-center sm:p-7">
        <blockquote className="text-xl font-semibold leading-8 text-white">“Você não comprou um curso para acumular conteúdo. Você entrou em uma aplicação prática.”</blockquote>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted">Suas respostas ficam acumuladas na Central. Cada etapa utiliza automaticamente o contexto construído anteriormente.</p>
      </section>
      <section className="card sm:p-7">
        <h2 className="text-base font-semibold text-white">Antes de começar</h2>
        <div className="mt-5 space-y-3">{checks.map((check) => <div className="flex items-center gap-3 text-sm text-muted" key={check}><CheckCircle2 className="shrink-0 text-primary" size={17} />{check}</div>)}</div>
        <div className="mt-6 border-t border-white/8 pt-5">
          {!data.comeceAquiCompleted ? <Button className="w-full" onClick={complete}>Confirmar e concluir preparação</Button> : <Link href="/central/prompt-base" className="button button-primary w-full">Começar meu Prompt Base<ArrowRight size={16} /></Link>}
        </div>
      </section>
    </div>
  </>;
}
