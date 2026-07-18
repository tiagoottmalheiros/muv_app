"use client";

import Link from "next/link";
import { CalendarPlus, Check, CheckCircle2, CircleDashed, ExternalLink, PartyPopper, Pencil } from "lucide-react";
import { useEffect } from "react";
import { useApp } from "@/components/app-provider";
import { RichResult } from "@/components/rich-result";
import { Button, CopyButton, DownloadButton, PageHeader, VideoLesson } from "@/components/ui";
import { areRequiredResultsComplete } from "@/lib/journey";
import type { OutputKey } from "@/lib/types";

export default function KitPage() {
  const { data, update } = useApp();
  const date = process.env.NEXT_PUBLIC_IMMERSION_DATE || "Data a confirmar";
  const time = process.env.NEXT_PUBLIC_IMMERSION_TIME || "Horário a confirmar";
  const room = process.env.NEXT_PUBLIC_IMMERSION_URL;
  const videoUrl = process.env.NEXT_PUBLIC_IMMERSION_VIDEO_URL;
  const sections = [
    { title: "Base Estratégica", content: data.promptBase.generatedText, complete: data.promptBase.completed, edit: "/central/prompt-base" },
    { title: "Raio-X do Funil", content: data.xray.generatedText, complete: data.xray.completed, edit: "/central/raio-x" },
    ...(["step_1_diagnosis", "step_2_buyer_map", "step_3_filter_message", "step_4_triage_script"] as OutputKey[]).map((key) => ({ title: ({ step_1_diagnosis: "Tarefa 1 — Plano de Correção do Gargalo", step_2_buyer_map: "Mapa Comprador vs. Curioso", step_3_filter_message: "Anúncio-Filtro", step_4_triage_script: "Script de Triagem Lite" })[key], content: data.outputs[key]?.content ?? "", complete: Boolean(data.outputs[key]?.completed), edit: ({ step_1_diagnosis: "/central/passo-1-diagnostico", step_2_buyer_map: "/central/passo-2-comprador-real", step_3_filter_message: "/central/passo-3-mensagem-filtro", step_4_triage_script: "/central/passo-4-triagem" })[key] })),
  ];
  const complete = sections.every((section) => section.complete);
  const requiredResultsComplete = areRequiredResultsComplete(data);
  const all = sections.map((section) => `${section.title.toUpperCase()}\n\n${section.content}`).join("\n\n========================================\n\n");

  useEffect(() => {
    update((current) => {
      const eligible = areRequiredResultsComplete(current);
      if (current.startedSteps.includes("kit-final") && current.immersion.viewed && (!eligible || current.kitReviewed)) return current;
      return { ...current, kitReviewed: current.kitReviewed || eligible, startedSteps: [...new Set([...current.startedSteps, "kit-final"])], immersion: { ...current.immersion, viewed: true } };
    });
  }, [requiredResultsComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  function confirmImmersion() {
    update((current) => ({ ...current, immersion: { ...current.immersion, clicked: true, confirmed: true, confirmedAt: current.immersion.confirmedAt || new Date().toISOString() } }));
    if (room) window.open(room, "_blank", "noopener,noreferrer");
  }

  return <>
    <div className="space-y-5 no-print">
      <PageHeader eyebrow="Etapa final" title="Do filtro ao sistema comercial" description="Assista à aula final, garanta sua vaga na Imersão e acesse todos os resultados construídos durante a aplicação." />
      <VideoLesson title="Do primeiro filtro ao sistema comercial" videoUrl={videoUrl} />
      <section className="card overflow-hidden border-gold/20 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.09),transparent_42%)] p-6 sm:p-8">
        <p className="eyebrow">Imersão Do Clique ao Contrato em 48h</p>
        <h2 className="text-2xl font-bold text-white">Garanta sua vaga e transforme seus ativos em um sistema comercial conectado.</h2>
        <p className="mt-4 leading-7 text-muted">Você já construiu diagnóstico, critérios, mensagem e triagem. Na Imersão, essas peças serão conectadas em uma arquitetura com critérios claros de passagem e um plano de execução em 48 horas.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">{["Arquitetura do funil e critérios de passagem", "Mensagem, aquisição e intenção", "Triagem, condução e próximos passos", "Plano de execução em 48 horas"].map((item) => <p className="flex items-start gap-3 text-sm text-muted" key={item}><Check className="mt-0.5 shrink-0 text-gold" size={16} />{item}</p>)}</div>
        <div className="mt-7 rounded-2xl border border-white/8 bg-[#020617]/70 p-5"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs uppercase tracking-widest text-muted">Próxima turma</p><strong className="mt-2 block text-xl text-white">{date}</strong><span className="text-sm text-gold">{time}</span></div>{data.immersion.confirmed ? <div className="sm:text-right"><strong className="text-success">Vaga confirmada</strong><p className="mt-1 text-xs text-muted">Sua inscrição na Imersão foi registrada.</p>{room && <a className="button button-secondary mt-3 w-full sm:w-auto" href={room} target="_blank" rel="noreferrer">Acessar Imersão<ExternalLink size={15} /></a>}</div> : <Button className="w-full sm:w-auto" disabled={!complete} title={complete ? "Garantir vaga na Imersão" : "Conclua os resultados anteriores para liberar a inscrição"} onClick={confirmImmersion}><CalendarPlus size={16} />{complete ? "Garantir minha vaga" : "Conclua os resultados"}</Button>}</div></div>
      </section>
    </div>

    <section className="mt-12 border-t border-white/8 pt-10">
      <PageHeader eyebrow="Seus resultados" title="Kit Filtro Anti-Curiosos" description="Copie, baixe ou revise todos os ativos construídos durante o MUV Starter." />
      {complete && <div className="mb-7 flex items-start gap-4 rounded-2xl border border-gold/25 bg-gold/[.06] p-5"><PartyPopper className="mt-0.5 shrink-0 text-gold" /><div><strong className="text-white">Seu primeiro Filtro Anti-Curiosos está pronto.</strong><p className="mt-1 text-sm text-muted">Use estes resultados para identificar dor, urgência e perfil antes do próximo passo comercial.</p></div></div>}
      <div className="mb-6 grid gap-3 no-print sm:grid-cols-2"><CopyButton text={all} label="Copiar Kit completo" /><DownloadButton text={all} filename="kit-filtro-anti-curiosos.txt" /><Button className="sm:col-span-2" variant="secondary" onClick={() => window.print()}>Imprimir / salvar PDF</Button></div>
      <div className="space-y-4">{sections.map((section, index) => <article className="card overflow-hidden p-0" key={section.title}><div className="flex items-start gap-3 border-b border-white/8 px-5 py-4">{section.complete ? <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={18} /> : <CircleDashed className="mt-0.5 shrink-0 text-muted" size={18} />}<div className="min-w-0 flex-1"><span className="text-[10px] uppercase tracking-widest text-muted">Ativo {index + 1}</span><h2 className="text-sm font-semibold text-white">{section.title}</h2></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${section.complete ? "bg-success/10 text-success" : "bg-white/5 text-muted"}`}>{section.complete ? "Pronto" : section.content ? "Incompleto" : "Não iniciado"}</span></div>{section.content ? <div className="max-h-[34rem] overflow-y-auto p-4 print:max-h-none print:overflow-visible"><RichResult compact content={section.content} /></div> : <p className="p-5 text-sm text-muted">Conclua esta etapa para incluir o ativo no Kit.</p>}<div className="flex flex-col gap-2 border-t border-white/8 p-3 no-print sm:flex-row"><CopyButton text={section.content} /><Link href={section.edit} className="button button-ghost w-full sm:w-auto"><Pencil size={15} />Revisar entregável</Link></div></article>)}</div>
    </section>
  </>;
}
