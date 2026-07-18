"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArchiveRestore,
  ArrowLeft,
  Check,
  FlaskConical,
  History,
  LoaderCircle,
  Rocket,
  Save,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "./app-provider";
import { Brand, Button } from "./ui";
import { KnowledgeManager } from "./knowledge-manager";
import {
  PROMPT_LABELS,
  type EditablePromptConfig,
  type PromptConfig,
  type PromptStudioState,
} from "@/lib/prompt-config";
import { OUTPUT_KEYS, type OutputKey } from "@/lib/types";

type EditorTab = "agent" | "context" | OutputKey;
type TestResult = {
  content: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
  usedKnowledgeBase: boolean;
};

const tabs: { key: EditorTab; label: string; short: string }[] = [
  { key: "agent", label: "Instrução geral", short: "Agente" },
  { key: "context", label: "Contexto permanente", short: "Contexto" },
  ...OUTPUT_KEYS.map((key, index) => ({ key, label: PROMPT_LABELS[key], short: `Tarefa ${index + 1}` })),
];
const FALLBACK_MODELS = ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"];

export function PromptStudio() {
  const { data, ready } = useApp();
  const router = useRouter();
  const [studio, setStudio] = useState<PromptStudioState | null>(null);
  const [editor, setEditor] = useState<EditablePromptConfig | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("agent");
  const [testStep, setTestStep] = useState<OutputKey>("step_1_diagnosis");
  const [testResult, setTestResult] = useState<{
    draft: TestResult;
    published: TestResult;
    publishedVersion: number;
  } | null>(null);
  const [working, setWorking] = useState<"load" | "save" | "publish" | "test" | "restore" | null>("load");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modelOptions, setModelOptions] = useState(FALLBACK_MODELS);

  useEffect(() => {
    if (ready && !data.authenticated) router.replace("/entrar");
  }, [data.authenticated, ready, router]);

  useEffect(() => {
    if (!ready || !data.authenticated) return;
    void (async () => {
      setWorking("load");
      setError("");
      try {
        const response = await fetch("/api/admin/prompts", { cache: "no-store" });
        const payload = (await response.json()) as PromptStudioState & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os prompts.");
        setStudio(payload);
        setEditor(toEditable(payload.draft));
        const modelResponse = await fetch("/api/admin/models", { cache: "no-store" });
        const modelPayload = (await modelResponse.json()) as { models?: string[] };
        if (modelResponse.ok && modelPayload.models?.length) setModelOptions(modelPayload.models);
      } catch (caught) {
        setError(messageFrom(caught));
      } finally {
        setWorking(null);
      }
    })();
  }, [data.authenticated, ready]);

  function applyStudio(next: PromptStudioState) {
    setStudio(next);
    setEditor(toEditable(next.draft));
    setTestResult(null);
  }

  async function saveDraft(): Promise<PromptConfig | null> {
    if (!studio || !editor) return null;
    setWorking("save");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: studio.draft.id, expectedUpdatedAt: studio.draft.updatedAt, ...editor }),
      });
      const payload = (await response.json()) as { draft?: PromptConfig; error?: string };
      if (!response.ok || !payload.draft) throw new Error(payload.error || "Não foi possível salvar o rascunho.");
      setStudio((current) => (current ? { ...current, draft: payload.draft! } : current));
      setNotice(`Rascunho v${payload.draft.version} salvo.`);
      return payload.draft;
    } catch (caught) {
      setError(messageFrom(caught));
      return null;
    } finally {
      setWorking(null);
    }
  }

  async function publish() {
    if (!studio || !editor) return;
    const draft = isDirty ? await saveDraft() : studio.draft;
    if (!draft || !window.confirm(`Publicar a versão ${draft.version} para todos os alunos?`)) return;
    setWorking("publish");
    setError("");
    try {
      const response = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", id: draft.id }),
      });
      const payload = (await response.json()) as PromptStudioState & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível publicar os prompts.");
      applyStudio(payload);
      setNotice(`Versão ${payload.published.version} publicada. Um novo rascunho foi criado.`);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setWorking(null);
    }
  }

  async function restore(config: PromptConfig) {
    if (!window.confirm(`Substituir o rascunho atual pelo conteúdo da versão ${config.version}?`)) return;
    setWorking("restore");
    setError("");
    try {
      const response = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", id: config.id }),
      });
      const payload = (await response.json()) as PromptStudioState & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível restaurar esta versão.");
      applyStudio(payload);
      setNotice(`Versão ${config.version} restaurada no rascunho. Revise e publique quando estiver pronto.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setWorking(null);
    }
  }

  async function testPrompts() {
    if (!editor) return;
    setWorking("test");
    setError("");
    setTestResult(null);
    try {
      const response = await fetch("/api/admin/prompts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonKey: testStep, config: editor }),
      });
      const payload = (await response.json()) as {
        draft?: TestResult;
        published?: TestResult;
        publishedVersion?: number;
        error?: string;
      };
      if (!response.ok || !payload.draft || !payload.published || !payload.publishedVersion)
        throw new Error(payload.error || "Não foi possível comparar os prompts.");
      setTestResult({ draft: payload.draft, published: payload.published, publishedVersion: payload.publishedVersion });
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setWorking(null);
    }
  }

  const isDirty = Boolean(studio && editor && JSON.stringify(editor) !== JSON.stringify(toEditable(studio.draft)));
  const activeText = editor && (activeTab === "agent" ? editor.agentInstructions : activeTab === "context" ? editor.contextPrompt : editor.stagePrompts[activeTab]);
  const availableModels = editor ? Array.from(new Set([...modelOptions, editor.model])) : modelOptions;

  if (!ready || !data.authenticated) return null;

  return (
    <main className="bg-app min-h-screen">
      <header className="border-b border-white/8 bg-[#020617]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-5">
            <Brand />
            <span className="hidden h-7 w-px bg-white/10 sm:block" />
            <span className="text-muted hidden text-xs font-bold tracking-[.16em] uppercase sm:block">
              Prompt Studio
            </span>
          </div>
          <Link href="/admin" className="button button-ghost">
            <ArrowLeft size={16} />
            Administração
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8 md:py-10">
        <section className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="eyebrow">Laboratório estratégico</p>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Prompts do agente MUV</h1>
            <p className="text-muted mt-3 max-w-2xl text-sm leading-6">
              Edite em rascunho, compare com a versão ativa usando o mesmo contexto e publique somente depois de validar
              o resultado.
            </p>
          </div>
          {studio && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="border-success/25 bg-success/8 text-success rounded-full border px-4 py-2 text-xs">
                <span className="bg-success mr-2 inline-block size-2 rounded-full" />
                Produção v{studio.published.version}
              </div>
              <div className="border-primary/25 bg-primary/8 text-gold rounded-full border px-4 py-2 text-xs">
                Rascunho v{studio.draft.version}
                {isDirty ? " · alterado" : " · salvo"}
              </div>
            </div>
          )}
        </section>

        {error && (
          <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/7 p-4 text-sm text-red-200">{error}</div>
        )}
        {notice && (
          <div className="border-success/20 bg-success/7 text-success mb-5 flex items-center gap-2 rounded-xl border p-4 text-sm">
            <Check size={16} />
            {notice}
          </div>
        )}
        {working === "load" && (
          <div className="card grid min-h-72 place-items-center">
            <div className="text-center">
              <LoaderCircle className="text-primary mx-auto animate-spin" size={28} />
              <p className="text-muted mt-3 text-sm">Carregando configurações...</p>
            </div>
          </div>
        )}

        {studio && editor && (
          <>
            <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
              <aside className="card h-fit p-3 xl:sticky xl:top-5">
                <div className="px-3 pt-2 pb-3">
                  <p className="text-muted text-[10px] font-bold tracking-[.16em] uppercase">Camadas do prompt</p>
                </div>
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${activeTab === tab.key ? "bg-primary/10 text-gold ring-primary/20 ring-1" : "text-muted hover:bg-white/4 hover:text-white"}`}
                    >
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-black ${activeTab === tab.key ? "bg-primary/15" : "bg-white/5"}`}
                      >
                        {tab.key === "agent" || tab.key === "context" ? <Sparkles size={13} /> : tab.short.replace("Tarefa ", "0")}
                      </span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
                <div className="text-muted mt-4 border-t border-white/8 px-3 pt-4 text-xs leading-5">
                  <strong className="text-white">Regra de publicação</strong>
                  <br />O rascunho não afeta os alunos até ser publicado.
                </div>
              </aside>

              <section className="card min-w-0 p-0">
                <div className="border-b border-white/8 px-5 py-5 md:px-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-gold text-[10px] font-bold tracking-[.16em] uppercase">
                        {activeTab === "agent" ? "Comportamento do agente" : activeTab === "context" ? "Referência permanente" : "Instrução específica"}
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-white">
                        {tabs.find((tab) => tab.key === activeTab)?.label}
                      </h2>
                    </div>
                    <span className="text-muted rounded-lg bg-white/5 px-3 py-1.5 text-xs">
                      {activeText?.length.toLocaleString("pt-BR")} caracteres
                    </span>
                  </div>
                </div>
                <div className="p-5 md:p-7">
                  <label className="sr-only" htmlFor="prompt-editor">
                    Conteúdo do prompt
                  </label>
                  <textarea
                    id="prompt-editor"
                    className="field min-h-[460px] font-mono text-[13px] leading-6"
                    spellCheck={false}
                    value={activeText ?? ""}
                    onChange={(event) =>
                      setEditor((current) =>
                        current
                          ? activeTab === "agent"
                            ? { ...current, agentInstructions: event.target.value }
                            : activeTab === "context"
                              ? { ...current, contextPrompt: event.target.value }
                              : { ...current, stagePrompts: { ...current.stagePrompts, [activeTab]: event.target.value } }
                          : current,
                      )
                    }
                  />
                  <p className="text-muted mt-3 text-xs leading-5">
                    {activeTab === "context"
                      ? "Adicione aqui contexto, metodologia, premissas e referências que devem acompanhar todas as respostas."
                      : "Use instruções objetivas, formato de saída explícito e regras verificáveis. Os dados do aluno são adicionados separadamente pelo servidor."}
                  </p>
                </div>
                <div className="flex flex-col gap-3 border-t border-white/8 bg-white/[.015] p-5 sm:flex-row sm:items-center sm:justify-between md:px-7">
                  <span className="text-muted text-xs">
                    {isDirty
                      ? "Existem alterações ainda não salvas."
                      : `Última gravação: ${formatDate(studio.draft.updatedAt)}`}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={!isDirty || Boolean(working)}
                      onClick={() => void saveDraft()}
                    >
                      {working === "save" ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
                      Salvar rascunho
                    </Button>
                    <Button disabled={Boolean(working)} onClick={() => void publish()}>
                      {working === "publish" ? (
                        <LoaderCircle className="animate-spin" size={16} />
                      ) : (
                        <Rocket size={16} />
                      )}
                      Publicar
                    </Button>
                  </div>
                </div>
              </section>

              <aside className="space-y-5">
                <section className="card">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
                      <Settings2 size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Execução</p>
                      <p className="text-muted text-xs">Configurações do rascunho</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-4">
                    <label className="text-muted block text-xs font-bold">
                      Modelo
                      <select
                        className="field mt-2"
                        value={editor.model}
                        onChange={(event) => setEditor({ ...editor, model: event.target.value })}
                      >
                        {availableModels.map((model) => <option key={model} value={model}>{model}</option>)}
                      </select>
                    </label>
                    <label className="text-muted block text-xs font-bold">
                      Máximo de tokens
                      <input
                        className="field mt-2"
                        type="number"
                        min={256}
                        max={8000}
                        value={editor.maxOutputTokens}
                        onChange={(event) => setEditor({ ...editor, maxOutputTokens: Number(event.target.value) })}
                      />
                    </label>
                    <label className="text-muted block text-xs font-bold">
                      Notas da alteração
                      <textarea
                        className="field mt-2 min-h-28 text-sm"
                        maxLength={500}
                        placeholder="O que mudou e por quê?"
                        value={editor.changeNotes}
                        onChange={(event) => setEditor({ ...editor, changeNotes: event.target.value })}
                      />
                    </label>
                  </div>
                </section>
                <section className="card border-primary/20 bg-[linear-gradient(145deg,rgba(34,211,238,.08),rgba(5,8,22,.95))]">
                  <FlaskConical className="text-primary" size={22} />
                  <h3 className="mt-4 font-semibold text-white">Comparar respostas</h3>
                  <p className="text-muted mt-2 text-xs leading-5">
                    Executa o rascunho e a produção com os dados atuais da conta demonstrativa.
                  </p>
                  <label className="text-muted mt-4 block text-xs font-bold">
                    Etapa
                    <select
                      className="field mt-2"
                      value={testStep}
                      onChange={(event) => setTestStep(event.target.value as OutputKey)}
                    >
                      {OUTPUT_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {PROMPT_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button className="mt-4 w-full" disabled={Boolean(working)} onClick={() => void testPrompts()}>
                    {working === "test" ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <FlaskConical size={16} />
                    )}
                    {working === "test" ? "Gerando duas respostas..." : "Testar rascunho"}
                  </Button>
                  <p className="text-muted mt-3 text-center text-[10px]">Este teste realiza duas chamadas à OpenAI.</p>
                </section>
              </aside>
            </div>

            {testResult && (
              <section className="mt-7">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">Resultado do teste</p>
                    <h2 className="text-2xl font-semibold text-white">Comparação com produção</h2>
                  </div>
                  <span className="text-muted text-xs">Mesmo contexto · {PROMPT_LABELS[testStep]}</span>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <ResultCard title={`Produção · v${testResult.publishedVersion}`} result={testResult.published} />
                  <ResultCard title={`Rascunho · v${studio.draft.version}`} result={testResult.draft} highlight />
                </div>
              </section>
            )}

            <KnowledgeManager />

            <section className="mt-9">
              <div className="mb-4 flex items-center gap-3">
                <History className="text-primary" size={20} />
                <div>
                  <h2 className="text-xl font-semibold text-white">Histórico de versões</h2>
                  <p className="text-muted text-xs">Restaure uma versão no rascunho antes de publicá-la novamente.</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#050816]">
                <div className="text-muted hidden grid-cols-[100px_1fr_190px_150px] gap-4 border-b border-white/8 px-5 py-3 text-[10px] font-bold tracking-[.15em] uppercase md:grid">
                  <span>Versão</span>
                  <span>Alteração</span>
                  <span>Publicação</span>
                  <span>Ação</span>
                </div>
                {studio.history.map((config) => (
                  <div
                    key={config.id}
                    className="grid gap-3 border-b border-white/8 px-5 py-5 last:border-0 md:grid-cols-[100px_1fr_190px_150px] md:items-center md:gap-4"
                  >
                    <div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${config.status === "published" ? "bg-success/10 text-success" : "text-muted bg-white/5"}`}
                      >
                        v{config.version} · {config.status === "published" ? "ativa" : "arquivada"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-white">{config.changeNotes || "Sem notas de alteração"}</p>
                      <p className="text-muted mt-1 text-xs">
                        {config.model} · {config.maxOutputTokens.toLocaleString("pt-BR")} tokens
                      </p>
                    </div>
                    <span className="text-muted text-xs">{formatDate(config.publishedAt ?? config.updatedAt)}</span>
                    <Button
                      variant="ghost"
                      disabled={config.status === "published" || Boolean(working)}
                      onClick={() => void restore(config)}
                    >
                      {working === "restore" ? (
                        <LoaderCircle className="animate-spin" size={15} />
                      ) : (
                        <ArchiveRestore size={15} />
                      )}
                      Restaurar
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function ResultCard({ title, result, highlight = false }: { title: string; result: TestResult; highlight?: boolean }) {
  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-[#050816] ${highlight ? "border-primary/35 shadow-[0_24px_80px_rgba(34,211,238,.08)]" : "border-white/8"}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="text-muted flex gap-3 text-[10px]">
          <span>{result.durationMs.toLocaleString("pt-BR")} ms</span>
          <span>{result.inputTokens ?? 0} in</span>
          <span>{result.outputTokens ?? 0} out</span>
        </div>
      </header>
      <div className="max-h-[620px] overflow-y-auto p-5 text-sm leading-7 whitespace-pre-wrap text-[#dbeafe]">
        {result.content}
      </div>
    </article>
  );
}

function toEditable(config: PromptConfig): EditablePromptConfig {
  return {
    agentInstructions: config.agentInstructions,
    contextPrompt: config.contextPrompt,
    stagePrompts: { ...config.stagePrompts },
    model: config.model,
    maxOutputTokens: config.maxOutputTokens,
    changeNotes: config.changeNotes,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
}
