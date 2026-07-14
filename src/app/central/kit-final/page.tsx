"use client";

import Link from "next/link";
import { CheckCircle2, CircleDashed, PartyPopper, Pencil } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Button, CopyButton, DownloadButton, PageHeader } from "@/components/ui";
import type { OutputKey } from "@/lib/types";

export default function KitPage() {
  const { data, update } = useApp();
  const sections = [
    { title: "Prompt Base do Negócio", content: data.promptBase.generatedText, complete: data.promptBase.completed, edit: "/central/prompt-base" },
    { title: "Raio-X do Funil", content: data.xray.generatedText, complete: data.xray.completed, edit: "/central/raio-x" },
    ...(["step_1_diagnosis", "step_2_buyer_map", "step_3_filter_message", "step_4_triage_script"] as OutputKey[]).map((key) => ({ title: data.outputs[key]?.title ?? ({ step_1_diagnosis: "Diagnóstico do Funil", step_2_buyer_map: "Mapa Comprador vs. Curioso", step_3_filter_message: "Anúncio-Filtro", step_4_triage_script: "Script de Triagem Lite" })[key], content: data.outputs[key]?.content ?? "", complete: Boolean(data.outputs[key]?.completed), edit: ({ step_1_diagnosis: "/central/passo-1-diagnostico", step_2_buyer_map: "/central/passo-2-comprador-real", step_3_filter_message: "/central/passo-3-mensagem-filtro", step_4_triage_script: "/central/passo-4-triagem" })[key] })),
  ];
  const complete = sections.every((section) => section.complete); const all = sections.map((section) => `${section.title.toUpperCase()}\n\n${section.content}`).join("\n\n========================================\n\n");
  return <><PageHeader eyebrow="Resultado da instalação" title="Seu Kit Filtro Anti-Curiosos" description="Todos os ativos comerciais construídos durante o MUV Starter, reunidos em um único lugar." />{complete && <div className="mb-7 flex items-center gap-4 rounded-2xl border border-gold/25 bg-gold/[.06] p-5"><PartyPopper className="text-gold" /><div><strong className="text-white">Você instalou a primeira camada de filtro do seu funil.</strong><p className="text-sm text-muted">Seu kit está pronto para ser aplicado e refinado.</p></div></div>}
    <div className="mb-6 flex flex-wrap gap-3 no-print"><CopyButton text={all} label="Copiar tudo" /><DownloadButton text={all} filename="kit-filtro-anti-curiosos.txt" /><Button variant="secondary" onClick={() => window.print()}>Imprimir / PDF</Button>{complete && !data.kitReviewed && <Button onClick={() => update((current) => ({ ...current, kitReviewed: true }))}>Marcar Kit como revisado</Button>}</div>
    <div className="space-y-4">{sections.map((section, index) => <article className="card p-0 overflow-hidden" key={section.title}><div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">{section.complete ? <CheckCircle2 className="text-success" size={18} /> : <CircleDashed className="text-muted" size={18} />}<div className="flex-1"><span className="text-[10px] uppercase tracking-widest text-muted">Ativo {index + 1}</span><h2 className="text-sm font-semibold text-white">{section.title}</h2></div><span className={`rounded-full px-2 py-1 text-[10px] ${section.complete ? "bg-success/10 text-success" : "bg-white/5 text-muted"}`}>{section.complete ? "Pronto" : section.content ? "Incompleto" : "Não iniciado"}</span></div>{section.content ? <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-5 text-xs leading-6 text-[#dbeafe]">{section.content}</pre> : <p className="p-5 text-sm text-muted">Conclua esta etapa para incluir o ativo no Kit.</p>}<div className="flex gap-2 border-t border-white/8 p-3 no-print"><CopyButton text={section.content} /><Link href={section.edit} className="button button-ghost"><Pencil size={15} />Revisar entregável</Link></div></article>)}</div><div className="mt-8 flex justify-end"><Link className="button button-primary" href="/central/imersao">Confirmar minha vaga na Imersão</Link></div></>;
}
