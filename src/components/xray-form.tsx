"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./app-provider";
import { AutoSaveStatus, Button, ProgressBar } from "./ui";
import { bottlenecks, generateXrayText, getMainBottleneck, getXrayResult, xrayLabels, xrayQuestions } from "@/lib/xray";
import type { XrayAnswer } from "@/lib/types";

export function XrayForm() {
  const { data, update } = useApp(); const [answers, setAnswers] = useState<XrayAnswer[]>(data.xray.answers); const [step, setStep] = useState(data.xray.completed ? 13 : data.xray.currentStep); const [saving, setSaving] = useState(false); const [savedAt, setSavedAt] = useState(data.xray.updatedAt); const initialized = useRef(false);
  useEffect(() => { if (!initialized.current) { initialized.current = true; return; } setSaving(true); const timer = window.setTimeout(() => { const now = new Date().toISOString(); update((current) => ({ ...current, xray: { ...current.xray, answers, currentStep: step, updatedAt: now }, startedSteps: [...new Set([...current.startedSteps, "raio-x"])] })); setSavedAt(now); setSaving(false); }, 800); return () => clearTimeout(timer); }, [answers, step]); // eslint-disable-line react-hooks/exhaustive-deps
  const score = answers.reduce((total, answer) => total + answer.score, 0); const result = getXrayResult(score); const bottleneck = getMainBottleneck(answers); const generated = generateXrayText(data.promptBase.answers.name || data.user.name, data.promptBase.answers.businessName, answers);
  function choose(optionIndex: number) { const question = xrayQuestions[step - 1]; const option = question.options[optionIndex]; setAnswers((current) => { const next = [...current]; next[step - 1] = { questionId: question.id, category: question.category, answer: option.text, score: option.score, optionIndex }; return next; }); }
  function finish() { const now = new Date().toISOString(); update((current) => ({ ...current, xray: { answers, score, classification: result.name, leakLevel: result.level, bottleneck, generatedText: generated, completed: true, currentStep: 12, updatedAt: now }, startedSteps: [...new Set([...current.startedSteps, "raio-x"])] })); setSavedAt(now); setStep(13); }
  if (step === 0) return <section className="card mx-auto max-w-3xl p-7 md:p-10"><p className="eyebrow">Diagnóstico MUV Starter</p><h2 className="text-2xl font-bold text-white">Descubra onde seu funil está vazando</h2><p className="mt-4 leading-7 text-muted">Responda 12 perguntas e receba a classificação, a pontuação e o gargalo principal do seu funil. O Prompt Base será usado como contexto nas próximas etapas.</p><div className="mt-7 grid grid-cols-3 gap-3">{[["12", "perguntas"], ["36", "pontos"], ["5", "classificações"]].map(([value, label]) => <div className="rounded-xl border border-white/8 p-4 text-center" key={label}><strong className="block text-2xl font-bold text-gold">{value}</strong><span className="text-[10px] uppercase tracking-wider text-muted">{label}</span></div>)}</div><Button className="mt-7 w-full sm:w-auto" onClick={() => setStep(1)}>Começar Raio-X<ArrowRight size={16} /></Button></section>;
  if (step > 12) return <XrayResult answers={answers} score={score} result={result} bottleneck={bottleneck} savedAt={savedAt} onEdit={() => setStep(1)} />;
  const question = xrayQuestions[step - 1]; const selected = answers[step - 1]?.optionIndex; const progress = Math.round((step / 12) * 100);
  return <section className="mx-auto max-w-3xl"><div className="mb-5"><div className="mb-3 flex justify-between"><span className="text-xs font-bold uppercase tracking-[.14em] text-gold">Pergunta {step} de 12 · {xrayLabels[question.category]}</span><AutoSaveStatus saving={saving} date={savedAt} /></div><ProgressBar value={progress} /></div><div className="card min-h-[510px] p-6 md:p-9"><h2 className="text-xl font-bold leading-snug text-white">{question.title}</h2><p className="mt-2 text-sm text-muted">{question.subtitle}</p><div className="mt-7 space-y-2">{question.options.map((option, index) => <button className={`option flex gap-4 ${selected === index ? "option-selected" : ""}`} key={option.text} onClick={() => choose(index)}><span className="text-xs font-bold text-gold">0{index + 1}</span><span>{option.text}</span></button>)}</div><div className="mt-8 flex justify-between border-t border-white/8 pt-5"><Button variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={16} />Anterior</Button>{step === 12 ? <Button disabled={selected === undefined} onClick={finish}><Check size={16} />Concluir Raio-X</Button> : <Button disabled={selected === undefined} onClick={() => setStep(step + 1)}>Continuar<ArrowRight size={16} /></Button>}</div></div></section>;
}
function XrayResult({ answers, score, result, bottleneck, savedAt, onEdit }: { answers: XrayAnswer[]; score: number; result: ReturnType<typeof getXrayResult>; bottleneck: keyof typeof xrayLabels; savedAt?: string; onEdit: () => void }) {
  const insight = bottlenecks[bottleneck];
  const answerHighlights = [
    { label: "Como os leads chegam", value: answers[0]?.answer },
    { label: "Comportamento mais frequente", value: answers[2]?.answer },
    { label: "Nível de qualificação", value: answers[7]?.answer },
  ];
  const scorePercent = Math.round((score / 36) * 100);

  return <section className="mx-auto max-w-3xl">
    <div className="mb-6 text-center"><p className="eyebrow">Diagnóstico concluído</p><h2 className="text-2xl font-bold text-white">Seu Raio-X está pronto</h2><div className="mt-3 flex justify-center"><AutoSaveStatus date={savedAt} /></div></div>
    <div className="card overflow-hidden p-0">
      <div className="grid items-center gap-6 border-b border-white/8 bg-[radial-gradient(circle_at_80%_20%,rgba(34,211,238,.13),transparent_40%)] p-6 sm:grid-cols-[auto_1fr] sm:p-8">
        <div className="relative mx-auto grid size-28 place-items-center rounded-full" style={{ background: `conic-gradient(#22d3ee ${scorePercent}%, rgba(148,163,184,.14) 0)` }}><div className="grid size-[92px] place-items-center rounded-full bg-[#050816] text-center"><div><strong className="block text-2xl text-white">{score}</strong><span className="text-[10px] text-muted">de 36</span></div></div></div>
        <div className="text-center sm:text-left"><span className="inline-flex rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-primary">Vazamento {result.level}</span><h3 className="mt-3 text-2xl font-bold text-white">{result.name}</h3><p className="mt-2 text-sm leading-6 text-muted">{result.diagnosis}</p></div>
      </div>
      <div className="p-6 sm:p-8">
        <div className="rounded-xl border border-primary/20 bg-primary/[.05] p-5"><span className="text-[10px] font-bold uppercase tracking-wider text-primary">Gargalo principal · {xrayLabels[bottleneck]}</span><h4 className="mt-2 text-base font-semibold text-white">{insight.title}</h4><p className="mt-2 text-sm leading-6 text-muted">{insight.text}</p><p className="mt-3 text-sm font-semibold text-[#dbeafe]">Ação recomendada: {insight.action}</p></div>
        <div className="mt-6"><span className="text-[10px] font-bold uppercase tracking-wider text-muted">O que suas respostas mostram</span><div className="mt-3 divide-y divide-white/8">{answerHighlights.map((item) => <div className="py-4 first:pt-0 last:pb-0" key={item.label}><span className="text-xs font-semibold text-primary">{item.label}</span><p className="mt-1 text-sm leading-6 text-[#dbeafe]">{item.value}</p></div>)}</div></div>
        <blockquote className="mt-6 border-l-2 border-primary pl-4 text-base font-semibold leading-7 text-white">“{result.impact}”</blockquote>
      </div>
    </div>
    <div className="mt-5 flex flex-col gap-3 sm:flex-row"><Button variant="ghost" onClick={onEdit}><Pencil size={16} />Editar respostas</Button><Link className="button button-primary flex-1" href="/central/passo-1-diagnostico">Processar Passo 1<ArrowRight size={16} /></Link></div>
  </section>;
}
