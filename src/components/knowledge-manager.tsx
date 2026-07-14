"use client";

import { Database, FileText, LoaderCircle, RefreshCw, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui";

type KnowledgeFile = {
  id: string;
  name: string;
  bytes: number;
  status: "in_progress" | "completed" | "cancelled" | "failed";
  createdAt: number;
  error?: string;
};

export function KnowledgeManager() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [selected, setSelected] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void loadFiles();
  }, []);

  async function loadFiles() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/knowledge", { cache: "no-store" });
      const payload = await response.json() as { files?: KnowledgeFile[]; error?: string };
      if (!response.ok || !payload.files) throw new Error(payload.error || "Não foi possível carregar os arquivos.");
      setFiles(payload.files);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile() {
    if (!selected) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const formData = new FormData();
      formData.set("file", selected);
      const response = await fetch("/api/admin/knowledge", { method: "POST", body: formData });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível enviar o arquivo.");
      setNotice(`${selected.name} foi indexado e já pode ser usado pelo agente.`);
      setSelected(null);
      await loadFiles();
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setWorking(false);
    }
  }

  async function removeFile(file: KnowledgeFile) {
    if (!window.confirm(`Remover “${file.name}” da base de conhecimento?`)) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/knowledge?fileId=${encodeURIComponent(file.id)}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível remover o arquivo.");
      setNotice(`${file.name} foi removido da base.`);
      await loadFiles();
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setWorking(false);
    }
  }

  return <section className="mt-9">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div className="flex items-center gap-3"><Database className="text-primary" size={21} /><div><h2 className="text-xl font-semibold text-white">Arquivos de conhecimento</h2><p className="text-xs text-muted">Documentos consultados pelo agente por meio do file search.</p></div></div><Button variant="ghost" disabled={loading || working} onClick={() => void loadFiles()}><RefreshCw className={loading ? "animate-spin" : ""} size={15} />Atualizar</Button></div>
    {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/7 p-4 text-sm text-red-200">{error}</div>}
    {notice && <div className="mb-4 rounded-xl border border-success/20 bg-success/7 p-4 text-sm text-success">{notice}</div>}
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="card h-fit"><Upload className="text-primary" size={22} /><h3 className="mt-4 font-semibold text-white">Adicionar documento</h3><p className="mt-2 text-xs leading-5 text-muted">PDF, DOC, DOCX, TXT, Markdown, HTML ou PPTX, com até 4 MB.</p><label className="option mt-5 block cursor-pointer text-sm"><input className="sr-only" type="file" accept=".pdf,.doc,.docx,.txt,.md,.html,.pptx" onChange={(event) => setSelected(event.target.files?.[0] ?? null)} />{selected ? <><strong className="block truncate text-white">{selected.name}</strong><span className="mt-1 block text-xs text-muted">{formatBytes(selected.size)}</span></> : <span className="text-muted">Clique para selecionar um arquivo</span>}</label><Button className="mt-3 w-full" disabled={!selected || working || selected.size > 4 * 1024 * 1024} onClick={() => void uploadFile()}>{working ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />}{working ? "Enviando e indexando..." : "Enviar para o agente"}</Button></div>
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#050816]">{loading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="animate-spin text-primary" size={24} /></div> : files.length === 0 ? <div className="grid min-h-48 place-items-center p-8 text-center"><div><FileText className="mx-auto text-muted" size={26} /><p className="mt-3 text-sm text-white">Nenhum arquivo indexado</p><p className="mt-1 text-xs text-muted">Envie o primeiro documento para formar a base.</p></div></div> : files.map((file) => <div key={file.id} className="flex items-center gap-4 border-b border-white/8 p-4 last:border-0"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><FileText size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{file.name}</p><p className="mt-1 text-xs text-muted">{formatBytes(file.bytes)} · {file.status === "completed" ? "Pronto" : file.status}</p>{file.error && <p className="mt-1 text-xs text-red-300">{file.error}</p>}</div><Button variant="ghost" aria-label={`Remover ${file.name}`} disabled={working} onClick={() => void removeFile(file)}><Trash2 size={15} /></Button></div>)}</div>
    </div>
  </section>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
}
