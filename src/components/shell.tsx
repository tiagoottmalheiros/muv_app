"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApp } from "./app-provider";
import { Brand, ProgressBar } from "./ui";
import { getProgress, journey } from "@/lib/journey";

export function PrivateShell({ children }: { children: ReactNode }) {
  const { data, ready, logout, update } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { if (ready && !data.authenticated) router.replace("/entrar"); }, [ready, data.authenticated, router]);
  useEffect(() => { if (ready && data.authenticated && data.entitlement !== "active") router.replace("/acesso-nao-encontrado"); }, [ready, data.authenticated, data.entitlement, router]);
  useEffect(() => { if (ready && data.authenticated && data.lastRoute !== pathname) update((current) => ({ ...current, lastRoute: pathname })); }, [pathname, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !data.authenticated || data.entitlement !== "active") return <div className="grid min-h-screen place-items-center text-sm text-muted">Preparando sua experiência...</div>;

  const progress = getProgress(data);
  const currentIndex = Math.max(0, journey.findIndex((step) => step.href === pathname));
  const current = journey[currentIndex];

  return <div className="min-h-screen bg-app">
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#020617]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[640px] items-center justify-between px-4 sm:px-6">
        <Link href="/central"><Brand compact /></Link>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">MUV Starter</p>
          <p className="mt-0.5 text-xs text-muted">{pathname === "/central" ? "Visão geral" : `Etapa ${currentIndex + 1} de ${journey.length}`}</p>
        </div>
        <button aria-label="Sair" className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white" onClick={() => { logout(); router.push("/entrar"); }}><LogOut size={17} /></button>
      </div>
      <div className="mx-auto max-w-[640px] px-4 pb-3 sm:px-6">
        <ProgressBar value={progress} />
        <div className="mt-2 flex items-center justify-between">
          <span className="truncate text-[10px] text-muted">{current?.short ?? "Instalação guiada"}</span>
          <span className="text-[10px] font-bold text-primary">{progress}% concluído</span>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-[640px] px-4 py-8 pb-20 sm:px-6 sm:py-12">{children}</main>
  </div>;
}
