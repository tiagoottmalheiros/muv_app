"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/components/app-provider";
import { Brand } from "@/components/ui";

export default function Home() {
  const { data } = useApp();
  const router = useRouter();
  useEffect(() => { if (data.authenticated) router.replace("/central"); }, [data.authenticated, router]);
  if (data.authenticated) return null;

  return <main className="bg-app min-h-screen px-5 py-6"><div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col"><nav className="flex items-center justify-between"><Brand /><Link className="button button-ghost" href="/entrar">Entrar</Link></nav><section className="flex flex-1 flex-col items-center justify-center py-20 text-center"><p className="eyebrow">Instalação guiada</p><h1 className="display-title mx-auto">Construa seu Filtro Anti-Curiosos, etapa por etapa.</h1><p className="mt-5 max-w-xl text-base leading-7 text-muted">Uma experiência simples para diagnosticar seu funil, definir o comprador real e criar os ativos que filtram seus leads.</p><div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted">{["Prompt Base", "Raio-X", "4 aplicações", "Kit Final"].map((item) => <span className="flex items-center gap-1.5" key={item}><Check className="text-primary" size={14} />{item}</span>)}</div><Link href="/entrar" className="button button-primary mt-8">Começar instalação<ArrowRight size={16} /></Link></section><p className="pb-3 text-center text-xs text-muted">MUV Starter · aplicação prática, sem acúmulo de conteúdo</p></div></main>;
}
