import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { Brand } from "@/components/ui";

export default function LoginPage() {
  return <main className="bg-app grid min-h-screen place-items-center px-4 py-10">
    <section className="w-full max-w-md">
      <div className="mb-7 flex justify-center"><Brand /></div>
      <div className="card p-6 sm:p-8">
        <div className="text-center"><p className="eyebrow">MUV Starter</p><h1 className="text-2xl font-bold text-white">Acesse sua Central MUV</h1><p className="mt-2 text-sm leading-6 text-muted">Entre com sua conta ou crie um acesso para começar.</p></div>
        <Show when="signed-out">
          <div className="mt-7 space-y-3">
            <Link href="/sign-in" className="button button-primary w-full"><LogIn size={17} />Entrar na minha conta</Link>
            <Link href="/sign-up" className="button button-secondary w-full"><UserPlus size={17} />Criar minha conta</Link>
          </div>
        </Show>
        <Show when="signed-in">
          <Link href="/central" className="button button-primary mt-7 w-full">Continuar para a Central<ArrowRight size={17} /></Link>
        </Show>
      </div>
      <p className="mt-4 text-center text-[11px] text-muted">A autenticação é protegida pelo Clerk.</p>
    </section>
  </main>;
}
