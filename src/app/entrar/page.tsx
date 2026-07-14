"use client";

import { Apple, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand, Button } from "@/components/ui";
import { useApp } from "@/components/app-provider";

export default function LoginPage() {
  const { loginDemo } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  function enter() { loginDemo(); router.push("/central"); }

  return <main className="bg-app grid min-h-screen place-items-center px-4 py-10">
    <section className="w-full max-w-md">
      <div className="mb-7 flex justify-center"><Brand /></div>
      <div className="card p-6 sm:p-8">
        <div className="text-center"><p className="eyebrow">MUV Starter</p><h1 className="text-2xl font-bold text-white">Acesse sua Central MUV</h1><p className="mt-2 text-sm leading-6 text-muted">Use o mesmo e-mail informado na compra.</p></div>
        <div className="mt-7 space-y-3">
          <Button className="w-full" onClick={enter}><span className="text-base font-black">G</span>Continuar com Google</Button>
          <Button variant="secondary" className="w-full" onClick={enter}><Apple size={18} />Continuar com Apple</Button>
          <div className="relative py-2 text-center text-xs text-muted"><span className="relative z-10 bg-[#050816] px-3">ou</span><span className="absolute left-0 right-0 top-1/2 border-t border-white/8" /></div>
          {!sent ? <form onSubmit={(event) => { event.preventDefault(); setSent(true); }} className="space-y-3"><input className="field" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" /><Button variant="secondary" className="w-full"><Mail size={17} />Receber código por e-mail</Button></form> : <div><p className="mb-3 text-center text-xs text-muted">Código enviado para {email}</p><input className="field text-center tracking-[.4em]" placeholder="000000" maxLength={6} /><Button className="mt-3 w-full" onClick={enter}>Entrar</Button></div>}
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-muted">No modo de demonstração, qualquer opção inicia o app.</p>
    </section>
  </main>;
}
