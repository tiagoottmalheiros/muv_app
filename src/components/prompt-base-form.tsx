"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./app-provider";
import { AutoSaveStatus, Button, ProgressBar, VideoLesson } from "./ui";
import { generatePromptBase, getPromptLabel, isPromptQuestionAnswered, promptBaseSchema, promptQuestions, type PromptQuestion } from "@/lib/prompt-base";
import type { PromptBaseAnswers } from "@/lib/types";

export function PromptBaseForm() {
  const { data: appData, update } = useApp();
  const [answers, setAnswers] = useState<PromptBaseAnswers>({ ...appData.promptBase.answers, name: appData.user.name, email: appData.user.email });
  const [step, setStep] = useState(appData.promptBase.completed ? promptQuestions.length + 1 : appData.promptBase.currentStep);
  const [saving, setSaving] = useState(false); const [savedAt, setSavedAt] = useState(appData.promptBase.updatedAt); const initialized = useRef(false);
  useEffect(() => { if (!initialized.current) { initialized.current = true; return; } setSaving(true); const timer = window.setTimeout(() => { const now = new Date().toISOString(); update((current) => ({ ...current, promptBase: { ...current.promptBase, answers, currentStep: step, updatedAt: now }, startedSteps: [...new Set([...current.startedSteps, "prompt-base"])] })); setSavedAt(now); setSaving(false); }, 800); return () => window.clearTimeout(timer); }, [answers, step]); // eslint-disable-line react-hooks/exhaustive-deps
  const progress = step > promptQuestions.length ? 100 : Math.round((step / promptQuestions.length) * 100);
  const generated = generatePromptBase(answers);
  function setField(key: keyof PromptBaseAnswers, value: string | boolean) { setAnswers((current) => ({ ...current, [key]: value })); }
  function finish() { const now = new Date().toISOString(); update((current) => ({ ...current, promptBase: { answers, generatedText: generated, completed: true, currentStep: promptQuestions.length, updatedAt: now }, startedSteps: [...new Set([...current.startedSteps, "prompt-base"])] })); setSavedAt(now); setStep(promptQuestions.length + 1); }
  if (step === 0) return <section className="mx-auto max-w-3xl space-y-5"><VideoLesson title="Base Estratégica: prepare o contexto do seu negócio" /><div className="card p-6 md:p-9"><p className="eyebrow">Base estratégica</p><h2 className="text-2xl font-bold text-white">Explique seu negócio para a Central</h2><p className="mt-4 leading-7 text-muted">Para começar, informe o nome do seu negócio. Seu nome e e-mail serão obtidos automaticamente da sua conta.</p><div className="mt-7"><label className="text-xs font-bold text-muted">Nome do seu negócio<input autoFocus className="field mt-2" value={answers.businessName} onChange={(e) => setField("businessName", e.target.value)} placeholder="Ex: Clínica Horizonte" /></label></div><Button className="mt-7 w-full sm:w-auto" disabled={!promptBaseSchema.safeParse(answers).success} onClick={() => setStep(1)}>Informar contexto<ArrowRight size={16} /></Button></div></section>;
  if (step > promptQuestions.length) return <PromptBaseResult answers={answers} savedAt={savedAt} onEdit={() => setStep(1)} />;
  const question = promptQuestions[step - 1];
  return <section className="mx-auto max-w-3xl"><div className="mb-5"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.14em] text-gold">Pergunta {step} de {promptQuestions.length}</span><AutoSaveStatus saving={saving} date={savedAt} /></div><ProgressBar value={progress} /></div><div className="card min-h-[430px] p-6 md:p-9"><h2 className="text-xl font-bold leading-snug text-white">{question.title}</h2><p className="mt-2 text-sm text-muted">{question.subtitle}</p><div className="mt-8">{renderQuestion(question, answers, setField)}</div><div className="mt-9 flex items-center justify-between border-t border-white/8 pt-5"><Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))}><ArrowLeft size={16} />Anterior</Button>{step === promptQuestions.length ? <Button disabled={!isPromptQuestionAnswered(question, answers)} onClick={finish}><Check size={16} />Salvar Base Estratégica</Button> : <Button disabled={!isPromptQuestionAnswered(question, answers)} onClick={() => setStep(step + 1)}>Continuar<ArrowRight size={16} /></Button>}</div></div></section>;
}

function PromptBaseResult({ answers, savedAt, onEdit }: { answers: PromptBaseAnswers; savedAt?: string; onEdit: () => void }) {
  const segment = answers.segment === "outro" ? answers.segmentOther : getPromptLabel(answers.segment);
  const highlights = [
    { label: "Objetivo", value: getPromptLabel(answers.objective) },
    { label: "Ticket médio", value: getPromptLabel(answers.ticket) },
    { label: "Modelo de venda", value: getPromptLabel(answers.salesModel) },
  ];
  const details = [
    { label: "Comprador prioritário", value: answers.idealBuyer },
    { label: "Problema que você resolve", value: answers.problem },
    { label: "Seu diferencial", value: answers.differentiator },
  ];

  return <section className="mx-auto max-w-3xl">
    <VideoLesson title="Base Estratégica: prepare o contexto do seu negócio" />
    <div className="my-6 text-center"><p className="eyebrow">Etapa concluída</p><h2 className="text-2xl font-bold text-white">Sua base estratégica está pronta</h2><div className="mt-3 flex justify-center"><AutoSaveStatus date={savedAt} /></div></div>
    <div className="card overflow-hidden p-0">
      <div className="border-b border-white/8 bg-[radial-gradient(circle_at_85%_15%,rgba(34,211,238,.12),transparent_38%)] p-6 sm:p-8">
        <span className="inline-flex rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-primary">{segment}</span>
        <h3 className="mt-4 text-2xl font-bold text-white">{answers.businessName}</h3>
        <p className="mt-3 text-sm leading-7 text-[#dbeafe]">Você vende <strong className="text-white">{answers.offer}</strong> para <strong className="text-white">{answers.idealBuyer}</strong>.</p>
      </div>
      <div className="grid border-b border-white/8 sm:grid-cols-3">{highlights.map((item) => <div className="border-b border-white/8 p-5 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0" key={item.label}><span className="text-[10px] font-bold uppercase tracking-wider text-muted">{item.label}</span><p className="mt-2 text-sm font-semibold leading-5 text-white">{item.value}</p></div>)}</div>
      <div className="p-6 sm:p-8">
        <div className="rounded-xl border border-primary/15 bg-primary/[.04] p-5"><span className="text-[10px] font-bold uppercase tracking-wider text-primary">Transformação principal</span><p className="mt-2 text-sm leading-6 text-[#dbeafe]">De <strong className="text-white">“{answers.transformationFrom}”</strong> para <strong className="text-white">“{answers.transformationTo}”</strong>.</p></div>
        <div className="mt-5 divide-y divide-white/8">{details.map((item) => <div className="py-4 first:pt-0 last:pb-0" key={item.label}><span className="text-xs font-semibold text-primary">{item.label}</span><p className="mt-1 text-sm leading-6 text-muted">{item.value}</p></div>)}</div>
      </div>
    </div>
    <div className="mt-5 flex flex-col gap-3 sm:flex-row"><Button variant="ghost" onClick={onEdit}><Pencil size={16} />Editar respostas</Button><Link className="button button-primary flex-1" href="/central/raio-x">Avançar para o Raio-X<ArrowRight size={16} /></Link></div>
  </section>;
}

function renderQuestion(question: PromptQuestion, data: PromptBaseAnswers, setField: (key: keyof PromptBaseAnswers, value: string | boolean) => void) {
  if (question.type === "select") return <><div className="grid gap-2 sm:grid-cols-2">{question.options.map((option) => <button className={`option ${data[question.key] === option.value ? "option-selected" : ""}`} key={option.value} onClick={() => { setField(question.key, option.value); if (question.otherKey && option.value !== "outro") setField(question.otherKey, ""); }}>{option.label}</button>)}</div>{question.otherKey && data[question.key] === "outro" && <input autoFocus className="field mt-4" placeholder="Qual segmento?" value={String(data[question.otherKey])} onChange={(e) => setField(question.otherKey!, e.target.value)} />}</>;
  if (question.type === "textarea") { const value = String(data[question.key]); return <><textarea className="field" maxLength={question.maxLength} value={value} placeholder={question.placeholder} onChange={(e) => setField(question.key, e.target.value)} /><p className="mt-2 text-right text-xs text-muted">{value.length}/{question.maxLength}</p></>; }
  if (question.type === "optional") { const none = data[question.noneKey] === true; const value = String(data[question.key]); const Field = question.textarea ? "textarea" : "input"; return <><Field className="field" maxLength={question.maxLength} disabled={none} value={value} placeholder={question.placeholder} onChange={(e) => setField(question.key, e.target.value)} /><button className={`option mt-3 flex items-center gap-3 ${none ? "option-selected" : ""}`} onClick={() => { setField(question.noneKey, !none); if (!none) setField(question.key, ""); }}><span className="grid size-5 place-items-center rounded border border-white/20">{none && <Check size={13} />}</span>{question.noneLabel}</button></>; }
  return <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]"><input className="field" placeholder="Meu cliente sai de..." value={String(data[question.fromKey])} onChange={(e) => setField(question.fromKey, e.target.value)} /><ArrowRight className="mx-auto text-gold" /><input className="field" placeholder="...e chega em" value={String(data[question.toKey])} onChange={(e) => setField(question.toKey, e.target.value)} /></div>;
}
