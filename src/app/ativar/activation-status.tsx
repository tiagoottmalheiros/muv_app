"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

type ActivationState = "checking" | "pending" | "ready" | "existing_user" | "invalid" | "failed";

export function ActivationStatus({ token }: { token: string }) {
  const [state, setState] = useState<ActivationState>("checking");
  const [redirectUrl, setRedirectUrl] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    async function check() {
      try {
        const response = await fetch(`/api/access/cart-status?token=${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as { status?: string; redirectUrl?: string };
        if (!response.ok || payload.status === "error") throw new Error("activation_failed");
        if (payload.status === "ready" || payload.status === "existing_user") {
          setRedirectUrl(payload.redirectUrl || "/sign-in");
          setState(payload.status);
          return;
        }
        if (payload.status === "invalid" || payload.status === "failed" || payload.status === "canceled") {
          setState(payload.status === "invalid" ? "invalid" : "failed");
          return;
        }
        setState("pending");
        attempts += 1;
        if (attempts < 60) timer = setTimeout(check, 2000);
      } catch {
        if (!controller.signal.aborted) setState("failed");
      }
    }

    void check();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [token]);

  if (state === "checking" || state === "pending") {
    return <><LoaderCircle className="mx-auto mt-9 animate-spin text-primary" size={42} /><p className="eyebrow mt-6">Confirmando pagamento</p><h1 className="text-3xl font-bold text-white">Estamos preparando seu acesso.</h1><p className="mx-auto mt-4 max-w-md leading-7 text-muted">A confirmação costuma levar poucos segundos. Mantenha esta página aberta.</p></>;
  }

  if (state === "ready" || state === "existing_user") {
    return <><div className="mx-auto mt-9 grid size-16 place-items-center rounded-2xl border border-success/20 bg-success/10 text-success"><CheckCircle2 size={28} /></div><p className="eyebrow mt-6">Pagamento confirmado</p><h1 className="text-3xl font-bold text-white">Seu acesso está liberado.</h1><p className="mx-auto mt-4 max-w-md leading-7 text-muted">{state === "ready" ? "Crie sua senha para entrar no APP MUV." : "Sua conta já existe. Entre para acessar o APP MUV."}</p><a className="button button-primary mt-7 w-full" href={redirectUrl}>{state === "ready" ? "Criar minha senha" : "Entrar na minha conta"}<ArrowRight size={17} /></a></>;
  }

  return <><div className="mx-auto mt-9 grid size-16 place-items-center rounded-2xl border border-gold/20 bg-gold/8 text-gold"><ShieldAlert size={28} /></div><p className="eyebrow mt-6">Ativação indisponível</p><h1 className="text-3xl font-bold text-white">Use o acesso enviado ao seu e-mail.</h1><p className="mx-auto mt-4 max-w-md leading-7 text-muted">O link expirou ou não foi possível confirmar o pagamento nesta página. Seu convite por e-mail continua válido.</p><Link className="button button-primary mt-7 w-full" href="/obrigado">Solicitar link de acesso</Link></>;
}
