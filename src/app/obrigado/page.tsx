import { Show } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Clock3, Mail, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/ui";
import { OpenPurchaseEmail } from "./open-purchase-email";

export const metadata: Metadata = {
  title: "Compra confirmada",
  description: "Conclua seu cadastro e acesse o APP MUV.",
};

export default function ThankYouPage() {
  const steps = [
    { icon: Mail, title: "Abra o e-mail da compra", text: "Use exatamente o e-mail informado no pagamento e procure pelo convite do APP MUV." },
    { icon: ShieldCheck, title: "Abra o link seguro", text: "O convite enviado ao seu e-mail comprova que o endereço pertence a você." },
    { icon: ArrowRight, title: "Crie sua senha", text: "Defina sua senha no ambiente protegido e acesse imediatamente o APP MUV." },
  ];

  return (
    <main className="bg-app min-h-screen px-5 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex justify-center sm:justify-start"><Brand /></div>
        <div className="mt-8 grid overflow-hidden rounded-[28px] border border-white/10 bg-[#050816] shadow-[0_28px_100px_rgba(0,0,0,.42)] lg:grid-cols-[1.05fr_.95fr]">
          <section className="relative overflow-hidden p-7 sm:p-10 lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,.14),transparent_42%)]" />
            <div className="relative">
              <div className="grid size-16 place-items-center rounded-2xl border border-success/25 bg-success/10 text-success"><CheckCircle2 size={30} /></div>
              <p className="eyebrow mt-7">Pagamento realizado</p>
              <h1 className="mt-2 text-4xl font-bold leading-tight text-white sm:text-5xl">Obrigado pela sua compra.</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted">Seu convite de acesso foi enviado ao e-mail informado na compra. Abra sua caixa de entrada para concluir o cadastro.</p>

              <Show when="signed-out">
                <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/[.06] p-5">
                  <p className="font-semibold text-white">Abra o e-mail usado na compra</p>
                  <p className="mt-2 text-sm leading-6 text-muted">Procure pelo convite do APP MUV, inclusive em Spam, Promoções ou Lixeira. Abra o link do convite para criar sua senha.</p>
                  <OpenPurchaseEmail />
                </div>
              </Show>
              <Show when="signed-in">
                <Link href="/central" className="button button-primary mt-8 w-full sm:w-auto">Acessar o APP MUV<ArrowRight size={17} /></Link>
              </Show>

              <div className="mt-8 flex items-start gap-3 rounded-xl border border-gold/20 bg-gold/[.05] p-4">
                <Clock3 className="mt-0.5 shrink-0 text-gold" size={18} />
                <p className="text-xs leading-5 text-muted">A confirmação costuma ser imediata, mas pode levar alguns minutos. Se o convite não chegar, verifique o spam e aguarde um momento.</p>
              </div>
            </div>
          </section>

          <aside className="border-t border-white/8 bg-white/[.025] p-7 sm:p-10 lg:border-t-0 lg:border-l lg:p-12">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-gold">Como acessar</p>
            <div className="mt-7 space-y-7">
              {steps.map(({ icon: Icon, title, text }, index) => (
                <div className="flex gap-4" key={title}>
                  <div className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                    <Icon size={18} />
                    <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-[#0f172a] text-[10px] font-bold text-white">{index + 1}</span>
                  </div>
                  <div><h2 className="font-semibold text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-muted">{text}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-9 border-t border-white/8 pt-7">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-muted">Seu acesso inclui</p>
              <div className="mt-4 space-y-3">{["Base Estratégica e Raio-X", "Quatro aplicações práticas com IA", "Kit final de implementação", "Aula de conclusão e Imersão"].map((item) => <p className="flex items-center gap-3 text-sm text-[#dbeafe]" key={item}><Check className="shrink-0 text-success" size={15} />{item}</p>)}</div>
            </div>
          </aside>
        </div>
        <p className="mt-5 text-center text-xs text-muted">Por segurança, o acesso só é liberado para o e-mail associado à compra.</p>
      </div>
    </main>
  );
}
