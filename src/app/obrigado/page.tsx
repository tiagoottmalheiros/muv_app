import type { Metadata } from "next";
import { CheckCircle2, KeyRound, Mail, Search } from "lucide-react";
import { Brand } from "@/components/ui";

export const metadata: Metadata = {
  title: "Abra seu e-mail",
  description: "Abra o convite para criar sua senha no APP MUV.",
};

export default function ThankYouPage() {
  const steps = [
    { icon: Mail, title: "Abra seu e-mail", text: "Use a caixa de entrada do e-mail informado no pagamento." },
    { icon: Search, title: "Busque o convite", text: "Procure pelo convite de acesso ao APP MUV. Verifique também Spam, Promoções e Lixeira." },
    { icon: KeyRound, title: "Crie sua senha", text: "Abra o link do convite e defina sua senha para acessar o MUV Starter." },
  ];

  return (
    <main className="bg-app grid min-h-screen place-items-center px-5 py-8 sm:py-12">
      <section className="card relative w-full max-w-2xl overflow-hidden p-7 text-center sm:p-12">
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,.16),transparent_70%)]" />
        <div className="relative">
          <div className="flex justify-center"><Brand /></div>
          <div className="mx-auto mt-9 grid size-16 place-items-center rounded-2xl border border-success/25 bg-success/10 text-success"><CheckCircle2 size={30} /></div>
          <p className="eyebrow mt-6">Compra confirmada</p>
          <h1 className="mx-auto mt-2 max-w-xl text-3xl font-bold leading-tight text-white sm:text-4xl">Obrigado pela sua compra.</h1>
          <p className="mx-auto mt-4 max-w-lg leading-7 text-muted">Enviamos um convite de acesso ao e-mail informado na compra do MUV Starter. Siga as etapas abaixo para criar sua senha no APP MUV.</p>

          <div className="mx-auto mt-8 max-w-lg space-y-3 text-left">
            {steps.map(({ icon: Icon, title, text }, index) => <div className="flex gap-4 rounded-2xl border border-white/8 bg-white/[.025] p-5" key={title}>
              <div className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><Icon size={18} /><span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[#0f172a] text-[10px] font-bold text-white">{index + 1}</span></div>
              <div><h2 className="font-semibold text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-muted">{text}</p></div>
            </div>)}
          </div>

          <p className="mt-7 text-xs leading-5 text-muted">Por segurança, o convite só funciona para o e-mail associado à compra.</p>
        </div>
      </section>
    </main>
  );
}
