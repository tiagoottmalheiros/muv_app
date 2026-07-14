import { SignOutButton } from "@clerk/nextjs";
import { LogOut, ShieldX } from "lucide-react";
import { Brand } from "@/components/ui";

export default function AccessNotFound() {
  return <main className="bg-app grid min-h-screen place-items-center p-5"><section className="card w-full max-w-xl p-8 text-center"><div className="flex justify-center"><Brand /></div><div className="mx-auto mt-10 grid size-14 place-items-center rounded-2xl border border-red-400/20 bg-red-400/8 text-red-300"><ShieldX size={24} /></div><p className="eyebrow mt-6">Acesso não encontrado</p><h1 className="text-3xl font-bold text-white">Este e-mail não possui acesso ao MUV Starter</h1><p className="mx-auto mt-4 max-w-md leading-7 text-muted">Saia desta conta e tente novamente usando exatamente o mesmo e-mail informado na compra.</p><SignOutButton redirectUrl="/sign-in"><button className="button button-primary mt-7 w-full"><LogOut size={17} />Sair e tentar outro e-mail</button></SignOutButton><p className="mt-4 text-xs text-muted">Por segurança, não é possível solicitar vinculação por esta página.</p></section></main>;
}
