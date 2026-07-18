"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "./app-provider";
import { AutoSaveStatus, Button, PageHeader, VideoLesson } from "./ui";
import { lessons } from "@/lib/lessons";
import type { OutputKey } from "@/lib/types";

export function LessonPage({ lessonKey }: { lessonKey: OutputKey }) {
  const lesson = lessons[lessonKey];
  const { data, update } = useApp();
  const existing = data.outputs[lessonKey];
  const [result, setResult] = useState(existing?.content ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"demo" | "openai" | null>(null);

  useEffect(() => {
    update((current) => current.startedSteps.includes(lessonKey) ? current : ({ ...current, startedSteps: [...current.startedSteps, lessonKey] }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const prerequisitesReady = data.promptBase.completed && data.xray.completed && (
    lessonKey === "step_1_diagnosis" ||
    lessonKey === "step_2_buyer_map" && data.outputs.step_1_diagnosis?.completed ||
    lessonKey === "step_3_filter_message" && data.outputs.step_1_diagnosis?.completed && data.outputs.step_2_buyer_map?.completed ||
    lessonKey === "step_4_triage_script" && data.outputs.step_1_diagnosis?.completed && data.outputs.step_2_buyer_map?.completed && data.outputs.step_3_filter_message?.completed
  );
  const generateLabel = lessonKey === "step_1_diagnosis" ? "Gerar meu Plano de Correção" : "Processar esta etapa";

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/generate-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonKey }),
      });
      const payload = await response.json() as { content?: string; mode?: "demo" | "openai"; error?: string };
      if (!response.ok || !payload.content) throw new Error(payload.error || "Não foi possível processar a etapa.");
      setResult(payload.content);
      setMode(payload.mode ?? null);
      const now = new Date().toISOString();
      update((current) => ({
        ...current,
        outputs: { ...current.outputs, [lessonKey]: { key: lessonKey, title: lesson.deliverable, content: payload.content!, completed: true, updatedAt: now } },
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível processar a etapa.");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <PageHeader eyebrow={lesson.eyebrow} title={lesson.title} description={lesson.objective} />
    <div className="space-y-5">
      <VideoLesson title={lesson.title} />

      <section className="card sm:p-7">
        <div className="text-center"><div className="mx-auto grid size-12 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><Sparkles size={21} /></div><p className="eyebrow mt-5">Aplicação automática</p><h2 className="text-xl font-semibold text-white">Gerar {lesson.deliverable}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">A Central cruza suas respostas e os resultados anteriores para construir este ativo de forma personalizada.</p></div>
        {!prerequisitesReady && <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-center text-xs text-amber-200">Conclua as etapas anteriores antes de processar este resultado.</p>}
        {error && <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-center text-xs text-red-300">{error}</p>}
        <Button className="mt-6 w-full" disabled={!prerequisitesReady || loading} onClick={() => void generate()}>{loading ? <LoaderCircle className="animate-spin" size={17} /> : result ? <RefreshCw size={17} /> : <Sparkles size={17} />}{loading ? "Processando suas respostas..." : result ? "Gerar novamente" : generateLabel}</Button>
      </section>

       {result && <section className="card overflow-hidden p-0"><div className="flex items-center justify-between border-b border-white/8 px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-success">Resultado salvo</p><h2 className="mt-1 text-sm font-semibold text-white">{lesson.deliverable}</h2></div><AutoSaveStatus date={existing?.updatedAt ?? new Date().toISOString()} /></div><div className="whitespace-pre-wrap p-5 text-sm leading-7 text-[#dbeafe]">{result}</div><div className="border-t border-white/8 p-4"><Link href={lesson.nextHref} className="button button-primary w-full">{lesson.nextLabel}<ArrowRight size={16} /></Link>{mode === "demo" && <p className="mt-3 text-center text-[10px] text-muted">Resultado demonstrativo. Configure a API para processamento com IA.</p>}</div></section>}
    </div>
  </>;
}
