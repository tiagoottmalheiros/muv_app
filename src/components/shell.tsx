"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApp } from "./app-provider";
import { Brand, ProgressBar } from "./ui";
import { getProgress, journey } from "@/lib/journey";

export function PrivateShell({ children }: { children: ReactNode }) {
  const { data, ready, update } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { if (ready && !data.authenticated) router.replace("/entrar"); }, [ready, data.authenticated, router]);
  useEffect(() => { if (ready && data.authenticated && data.entitlement !== "active") router.replace("/acesso-nao-encontrado"); }, [ready, data.authenticated, data.entitlement, router]);
  useEffect(() => { if (ready && data.authenticated && data.lastRoute !== pathname) update((current) => ({ ...current, lastRoute: pathname })); }, [pathname, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !data.authenticated || data.entitlement !== "active") return <div className="grid min-h-screen place-items-center text-sm text-muted">Preparando sua experiência...</div>;

  const progress = getProgress(data);
  const matchedIndex = journey.findIndex((step) => step.href === pathname);
  const currentIndex = Math.max(0, matchedIndex);
  const current = journey[currentIndex];
  const previousHref = pathname === "/central" ? null : matchedIndex > 0 ? journey[matchedIndex - 1].href : "/central";
  const previousLabel = matchedIndex > 0 ? journey[matchedIndex - 1].short : "Visão Geral";

  return <div className="min-h-screen bg-app">
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#020617]/92 backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 max-w-[640px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {previousHref && <Link href={previousHref} aria-label="Voltar para a etapa anterior" title="Etapa anterior" className="grid size-9 place-items-center rounded-lg border border-white/8 text-muted transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"><ArrowLeft size={17} /></Link>}
          <Link href="/central"><Brand compact /></Link>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">MUV Starter</p>
          <p className="mt-0.5 text-xs text-muted">{pathname === "/central" ? "Visão geral" : `Etapa ${currentIndex + 1} de ${journey.length}`}</p>
        </div>
        <UserButton />
      </div>
      <div className="mx-auto max-w-[640px] px-4 pb-3 sm:px-6">
        <ProgressBar value={progress} />
        <div className="mt-2 flex items-center justify-between">
          <span className="truncate text-[10px] text-muted">{current?.short ?? "Instalação guiada"}</span>
          <span className="text-[10px] font-bold text-primary">{progress}% concluído</span>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-[640px] px-4 py-8 pb-20 sm:px-6 sm:py-12">
      {children}
      {previousHref && <div className="mt-8 border-t border-white/8 pt-6"><Link href={previousHref} className="button button-secondary w-full"><ArrowLeft size={16} />Voltar para {previousLabel}</Link></div>}
    </main>
  </div>;
}
