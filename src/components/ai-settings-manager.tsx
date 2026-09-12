"use client";

import Link from "next/link";
import { ArrowLeft, Check, Gauge, LoaderCircle, Save, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type AiRuntimeSettings } from "@/lib/ai-runtime-settings";
import { useApp } from "./app-provider";
import { Brand, Button } from "./ui";

const fields: { key: Exclude<keyof AiRuntimeSettings, "requireKnowledgeBase">; label: string; detail: string; min: number; max: number }[] = [
  { key: "dailyGenerationLimit", label: "Gerações por aluno/dia", detail: "Bloqueia novas gerações após este total, considerando o dia UTC.", min: 1, max: 20 },
  { key: "cooldownSeconds", label: "Espera entre gerações (segundos)", detail: "Evita cliques repetidos e chamadas muito próximas para o mesmo aluno.", min: 0, max: 3600 },
  { key: "minimumOutputCharacters", label: "Mínimo de caracteres na resposta", detail: "Rejeita respostas curtas antes de serem entregues ao aluno.", min: 200, max: 10000 },
  { key: "minimumMarkdownSections", label: "Mínimo de seções Markdown", detail: "Cada título iniciado por ## conta como uma seção de resposta.", min: 1, max: 20 },
];

export function AiSettingsManager() {
  const { data, ready } = useApp();
  const router = useRouter();
  const [settings, setSettings] = useState<AiRuntimeSettings | null>(null);
  const [savedSettings, setSavedSettings] = useState<AiRuntimeSettings | null>(null);
  const [working, setWorking] = useState<"load" | "save" | null>("load");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (ready && !data.authenticated) router.replace("/entrar");
  }, [data.authenticated, ready, router]);

  useEffect(() => {
    if (!ready || !data.authenticated) return;
    void (async () => {
      setWorking("load");
      try {
        const response = await fetch("/api/admin/ai-settings", { cache: "no-store" });
        const payload = (await response.json()) as { settings?: AiRuntimeSettings; error?: string };
        if (!response.ok || !payload.settings) throw new Error(payload.error || "Não foi possível carregar as configurações.");
        setSettings(payload.settings);
        setSavedSettings(payload.settings);
      } catch (caught) {
        setError(messageFrom(caught));
      } finally {
        setWorking(null);
      }
    })();
  }, [data.authenticated, ready]);

  async function save() {
    if (!settings) return;
    setWorking("save");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json()) as { settings?: AiRuntimeSettings; error?: string };
      if (!response.ok || !payload.settings) throw new Error(payload.error || "Não foi possível salvar as configurações.");
      setSettings(payload.settings);
      setSavedSettings(payload.settings);
      setNotice("Limites e critérios de qualidade atualizados.");
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setWorking(null);
    }
  }

  const isDirty = Boolean(settings && savedSettings && JSON.stringify(settings) !== JSON.stringify(savedSettings));
  if (!ready || !data.authenticated) return null;

  return (
    <main className="bg-app min-h-screen">
      <header className="border-b border-white/8 bg-[#020617]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 md:px-8">
          <Brand />
          <Link href="/admin" className="button button-ghost"><ArrowLeft size={16} />Administração</Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
        <p className="eyebrow">Governança de IA</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">Limites e critérios de qualidade</h1>
        <p className="text-muted mt-3 max-w-2xl text-sm leading-6">Estas regras são aplicadas às gerações dos alunos. Alterações salvas entram em vigor na próxima solicitação.</p>

        {error && <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/7 p-4 text-sm text-red-200">{error}</div>}
        {notice && <div className="border-success/20 bg-success/7 text-success mt-6 flex items-center gap-2 rounded-xl border p-4 text-sm"><Check size={16} />{notice}</div>}
        {working === "load" && <div className="card mt-8 grid min-h-60 place-items-center"><LoaderCircle className="text-primary animate-spin" size={28} /></div>}

        {settings && <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="card">
            <div className="flex items-center gap-3"><div className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl"><Gauge size={19} /></div><div><h2 className="font-semibold text-white">Uso e custo</h2><p className="text-muted text-xs">Proteção por aluno para chamadas de geração.</p></div></div>
            <div className="mt-6 space-y-5">
              {fields.slice(0, 2).map((field) => <NumberField key={field.key} field={field} value={settings[field.key]} onChange={(value) => setSettings({ ...settings, [field.key]: value })} />)}
            </div>
          </section>
          <aside className="card border-primary/20 bg-[linear-gradient(145deg,rgba(34,211,238,.08),rgba(5,8,22,.95))]"><Sparkles className="text-primary" size={22} /><h2 className="mt-4 font-semibold text-white">Como o limite funciona</h2><p className="text-muted mt-2 text-xs leading-5">Toda geração registrada, concluída ou com falha, conta para evitar repetição que consome API. Administradores usam a mesma regra ao testar a conta de aluno.</p></aside>
          <section className="card">
            <div className="flex items-center gap-3"><div className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl"><ShieldCheck size={19} /></div><div><h2 className="font-semibold text-white">Qualidade mínima</h2><p className="text-muted text-xs">A resposta só é mostrada quando atende a estes critérios.</p></div></div>
            <div className="mt-6 space-y-5">
              {fields.slice(2).map((field) => <NumberField key={field.key} field={field} value={settings[field.key]} onChange={(value) => setSettings({ ...settings, [field.key]: value })} />)}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 bg-white/[.025] p-4"><input className="mt-0.5 size-4 accent-cyan-400" type="checkbox" checked={settings.requireKnowledgeBase} onChange={(event) => setSettings({ ...settings, requireKnowledgeBase: event.target.checked })} /><span><strong className="block text-sm text-white">Exigir base de conhecimento</strong><span className="text-muted mt-1 block text-xs leading-5">Impede respostas enquanto o Vector Store da OpenAI não estiver configurado.</span></span></label>
            </div>
          </section>
          <aside className="card"><h2 className="font-semibold text-white">Critérios ativos</h2><ul className="text-muted mt-4 space-y-3 text-xs leading-5"><li>Conteúdo mínimo e estrutura são validados após a resposta da OpenAI.</li><li>O contrato específico da Tarefa 1 continua obrigatório.</li><li>Falhas de qualidade retornam uma mensagem segura ao aluno, sem expor instruções internas.</li></ul></aside>
        </div>}
        {settings && <div className="mt-7 flex items-center justify-end gap-3"><span className="text-muted text-xs">{isDirty ? "Existem alterações não salvas." : "Configuração salva."}</span><Button disabled={!isDirty || Boolean(working)} onClick={() => void save()}>{working === "save" ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}Salvar configurações</Button></div>}
      </div>
    </main>
  );
}

function NumberField({ field, value, onChange }: { field: typeof fields[number]; value: number; onChange: (value: number) => void }) {
  return <label className="text-muted block text-xs font-bold">{field.label}<input className="field mt-2" type="number" min={field.min} max={field.max} value={value} onChange={(event) => onChange(Number(event.target.value))} /><span className="mt-2 block text-xs font-normal leading-5">{field.detail}</span></label>;
}

function messageFrom(error: unknown) { return error instanceof Error ? error.message : "Ocorreu um erro inesperado."; }
