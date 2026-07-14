"use client";

import Link from "next/link";
import Image from "next/image";
import { Crown, LoaderCircle, RotateCcw, Search, Shield, ShieldMinus, Sparkles, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Brand, Button } from "@/components/ui";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  isAdmin: boolean;
  isBootstrap: boolean;
  isCurrent: boolean;
};

export default function AdminPage() {
  const { data, ready, reset } = useApp();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const payload = await response.json() as { users?: AdminUser[]; error?: string };
      if (!response.ok || !payload.users) throw new Error(payload.error || "Não foi possível carregar os usuários.");
      setUsers(payload.users);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready && !data.authenticated) router.replace("/entrar");
  }, [data.authenticated, ready, router]);

  useEffect(() => {
    if (!ready || !data.authenticated) return;
    queueMicrotask(() => void loadUsers());
  }, [data.authenticated, ready]);

  async function changeAdmin(user: AdminUser) {
    const makeAdmin = !user.isAdmin;
    const action = makeAdmin ? "tornar este usuário administrador" : "remover o acesso administrativo";
    if (!window.confirm(`Deseja ${action}?`)) return;
    setWorkingId(user.id);
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isAdmin: makeAdmin }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar o administrador.");
      await loadUsers();
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setWorkingId(null);
    }
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
      setError(messageFrom(caught));
    } finally {
      setResetting(false);
    }
  }

  if (!ready || !data.authenticated) return null;
  const visibleUsers = users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase()));

  return <main className="bg-app min-h-screen">
    <header className="flex h-20 items-center justify-between border-b border-white/8 px-5 md:px-10"><Brand /><div className="flex items-center gap-2"><Link href="/admin/prompts" className="button button-secondary"><Sparkles size={16} />Prompts</Link><Link href="/central" className="button button-ghost">Central</Link></div></header>
    <div className="mx-auto max-w-6xl p-5 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Acesso administrativo</p><h1 className="text-4xl font-bold text-white">Administradores</h1><p className="mt-2 text-sm text-muted">Escolha quais usuários podem acessar o painel e gerenciar o agente.</p></div><Button variant="secondary" disabled={resetting} onClick={() => void restartJourney()}>{resetting ? <LoaderCircle className="animate-spin" size={16} /> : <RotateCcw size={16} />}Testar como aluno</Button></div>
      {error && <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/7 p-4 text-sm text-red-200">{error}</div>}
      <section className="card mt-8"><div className="relative max-w-md"><Search className="absolute left-3 top-3.5 text-muted" size={16} /><input className="field pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuário por nome ou e-mail" /></div></section>
      <section className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-[#050816]">
        <div className="hidden grid-cols-[1fr_180px_230px] border-b border-white/8 bg-white/[.03] px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted md:grid"><span>Usuário</span><span>Função</span><span>Ação</span></div>
        {loading ? <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-primary" size={26} /></div> : visibleUsers.length === 0 ? <div className="p-10 text-center text-sm text-muted">Nenhum usuário encontrado.</div> : visibleUsers.map((user) => <div key={user.id} className="grid gap-4 border-b border-white/8 p-5 last:border-0 md:grid-cols-[1fr_180px_230px] md:items-center"><div className="flex min-w-0 items-center gap-3"><Image className="size-10 rounded-full border border-white/10" src={user.imageUrl} alt="" width={40} height={40} unoptimized /><div className="min-w-0"><strong className="block truncate text-sm text-white">{user.name}{user.isCurrent ? " (você)" : ""}</strong><span className="block truncate text-xs text-muted">{user.email}</span></div></div><div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${user.isAdmin ? "bg-primary/10 text-primary" : "bg-white/5 text-muted"}`}>{user.isAdmin ? <Crown size={13} /> : <Shield size={13} />}{user.isBootstrap ? "Admin inicial" : user.isAdmin ? "Administrador" : "Aluno"}</span></div><Button variant={user.isAdmin ? "ghost" : "secondary"} disabled={workingId === user.id || user.isBootstrap || user.isCurrent && user.isAdmin} onClick={() => void changeAdmin(user)}>{workingId === user.id ? <LoaderCircle className="animate-spin" size={15} /> : user.isAdmin ? <ShieldMinus size={15} /> : <UserPlus size={15} />}{user.isAdmin ? "Remover admin" : "Tornar admin"}</Button></div>)}
      </section>
      <div className="mt-6 flex items-center gap-2 text-xs text-muted"><Shield size={14} />Somente administradores podem alterar estas funções.</div>
    </div>
  </main>;
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
}
