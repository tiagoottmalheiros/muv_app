"use client";

import { Check, Clipboard, Download, LoaderCircle, Play, Save } from "lucide-react";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-[11px] font-black tracking-[.12em] text-primary">MUV</div>{!compact && <div><strong className="block text-sm tracking-[.2em] text-white">MUV</strong><span className="text-xs text-muted">Aplicação guiada</span></div>}</div>;
}

export function Button({ children, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return <div>{label && <div className="mb-2 flex justify-between text-xs text-muted"><span>{label}</span><strong className="text-gold">{value}%</strong></div>}<div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-[#22d3ee] to-[#60a5fa] transition-[width] duration-500" style={{ width: `${Math.min(100, value)}%` }} /></div></div>;
}

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  return <Button variant="secondary" onClick={() => void copy()}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? "Copiado" : label}</Button>;
}

export function DownloadButton({ text, filename }: { text: string; filename: string }) {
  function download() { const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
  return <Button variant="secondary" onClick={download}><Download size={16} />Baixar TXT</Button>;
}

export function AutoSaveStatus({ saving = false, date }: { saving?: boolean; date?: string }) {
  return <span className="inline-flex items-center gap-2 text-xs text-muted">{saving ? <LoaderCircle className="animate-spin" size={14} /> : <Save size={14} className="text-success" />}{saving ? "Salvando..." : date ? `Salvo às ${new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Rascunho salvo automaticamente"}</span>;
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children?: ReactNode }) {
  return <header className="mb-7 text-center"><p className="eyebrow">{eyebrow}</p><h1 className="display-title mx-auto">{title}</h1>{description && <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-6 text-muted">{description}</p>}{children && <div className="mt-5 flex justify-center">{children}</div>}</header>;
}

export function VideoLesson({ title, videoUrl }: { title: string; videoUrl?: string }) {
  if (videoUrl) return <div className="aspect-video overflow-hidden rounded-[18px] border border-white/10 bg-[#050816]"><iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="size-full" referrerPolicy="strict-origin-when-cross-origin" src={videoUrl} title={title} /></div>;
  return <div className="group relative aspect-video overflow-hidden rounded-[18px] border border-white/10 bg-[#050816]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_30%,rgba(34,211,238,.12),transparent_40%)]" /><div className="absolute inset-0 grid place-items-center"><div className="grid size-16 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold"><Play size={24} fill="currentColor" /></div></div><div className="absolute bottom-0 left-0 right-0 flex items-end justify-between bg-gradient-to-t from-[#020617] p-5 pt-16"><div><span className="text-xs uppercase tracking-[.16em] text-gold">Aula da etapa</span><p className="mt-1 text-sm text-white">{title}</p></div><span className="text-xs text-muted">Vídeo em configuração</span></div></div>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/12 p-8 text-center"><h3 className="font-semibold text-white">{title}</h3><p className="mt-2 text-sm text-muted">{text}</p></div>;
}
