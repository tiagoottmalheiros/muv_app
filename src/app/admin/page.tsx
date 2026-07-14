"use client";

import Link from "next/link";
import { Download, LoaderCircle, RotateCcw, Search, Shield, Sparkles, Upload, UserCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Brand, Button, ProgressBar } from "@/components/ui";
import { getProgress } from "@/lib/journey";

export default function AdminPage() {
  const { data, ready, reset, update } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [imported, setImported] = useState<string[]>([]);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (ready && !data.authenticated) router.replace("/entrar");
  }, [ready, data.authenticated, router]);
  if (!ready || !data.authenticated) return null;
  const progress = getProgress(data);
  const visible = `${data.user.name} ${data.user.email}`.toLowerCase().includes(query.toLowerCase());
  function exportCsv() {
    const csv = `nome,email,status,progresso,imersao\n"${data.user.name}","${data.user.email}",${data.entitlement},${progress},${data.immersion.confirmed ? "confirmada" : "pendente"}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "progresso-central-muv.csv";
    link.click();
  }
  function importCsv(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = String(reader.result).split(/\r?\n/).slice(1).filter(Boolean);
      setImported(rows);
    };
    reader.readAsText(file);
  }
  async function restartJourney() {
    if (!window.confirm("Reiniciar sua jornada de teste? Suas respostas, resultados e progresso atuais serão apagados.")) return;
    setResetting(true);
    setError("");
    try {
      const response = await fetch("/api/student/state", { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível reiniciar a jornada.");
      reset();
      router.push("/central/comece-aqui");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível reiniciar a jornada.");
    } finally {
      setResetting(false);
    }
  }
  return (
    <main className="bg-app min-h-screen">
      <header className="flex h-20 items-center justify-between border-b border-white/8 px-5 md:px-10">
        <Brand />
        <div className="flex items-center gap-2">
          <Link href="/admin/prompts" className="button button-secondary">
            <Sparkles size={16} />
            Prompts
          </Link>
          <Link href="/central" className="button button-ghost">
            Voltar à Central
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl p-5 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">Operação do MVP</p>
            <h1 className="font-serif text-4xl text-white">Administração de acessos</h1>
            <p className="text-muted mt-2 text-sm">Gerencie o acesso e reinicie sua própria jornada para testar a experiência como aluno.</p>
          </div>
          <div className="flex gap-2">
            <label className="button button-secondary">
              <Upload size={16} />
              Importar compradores
              <input className="hidden" type="file" accept=".csv" onChange={(e) => importCsv(e.target.files?.[0])} />
            </label>
            <Button variant="secondary" onClick={exportCsv}>
              <Download size={16} />
              Exportar progresso
            </Button>
            <Button variant="ghost" disabled={resetting} onClick={() => void restartJourney()}>
              {resetting ? <LoaderCircle className="animate-spin" size={16} /> : <RotateCcw size={16} />}
              Testar como aluno
            </Button>
          </div>
        </div>
        {error && <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/7 p-4 text-sm text-red-200">{error}</div>}
        {imported.length > 0 && <div className="border-success/20 bg-success/8 text-success mt-5 rounded-xl border p-4 text-sm">{imported.length} comprador(es) lido(s) do CSV. A gravação será conectada ao Supabase posteriormente.</div>}
        <div className="card mt-8">
          <div className="relative max-w-md">
            <Search className="text-muted absolute top-3.5 left-3" size={16} />
            <input className="field pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou e-mail" />
          </div>
        </div>
        <section className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="text-muted bg-white/[.03] text-xs tracking-wider uppercase">
              <tr>
                <th className="p-4">Usuário</th>
                <th className="p-4">Acesso</th>
                <th className="p-4">Progresso</th>
                <th className="p-4">Imersão</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible && (
                <tr className="border-t border-white/8">
                  <td className="p-4">
                    <strong className="block text-white">{data.user.name}</strong>
                    <span className="text-muted text-xs">{data.user.email}</span>
                  </td>
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-1 text-xs ${data.entitlement === "active" ? "bg-success/10 text-success" : "bg-red-500/10 text-red-300"}`}>{data.entitlement}</span>
                  </td>
                  <td className="w-52 p-4">
                    <ProgressBar value={progress} />
                  </td>
                  <td className="text-muted p-4">{data.immersion.confirmed ? "Confirmada" : "Pendente"}</td>
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        update((current) => ({
                          ...current,
                          entitlement: current.entitlement === "active" ? "blocked" : "active",
                        }))
                      }
                    >
                      {data.entitlement === "active" ? <UserX size={15} /> : <UserCheck size={15} />}
                      {data.entitlement === "active" ? "Bloquear" : "Liberar"}
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <div className="text-muted mt-6 flex items-center gap-2 text-xs">
          <Shield size={14} />
          Nenhum dado sensível de autenticação é exibido.
        </div>
      </div>
    </main>
  );
}
