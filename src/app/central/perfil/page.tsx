"use client";

import { LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Button, PageHeader } from "@/components/ui";

export default function ProfilePage() {
  const { data, logout, reset } = useApp();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <>
      <PageHeader
        eyebrow="Conta e segurança"
        title="Perfil e acesso"
        description="Consulte os dados associados à sua experiência e gerencie sua sessão com segurança."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_.6fr]">
        <section className="card p-6">
          <div className="flex items-center gap-4">
            <div className="border-gold/25 bg-gold/8 text-gold grid size-16 place-items-center rounded-2xl border font-serif text-2xl">
              {data.user.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{data.user.name}</h2>
              <p className="text-muted text-sm">{data.user.email}</p>
            </div>
          </div>
          <dl className="mt-7 grid gap-5 border-t border-white/8 pt-6 sm:grid-cols-2">
            {[
              ["Produto liberado", "MUV Starter"],
              ["Status de acesso", data.entitlement === "active" ? "Ativo" : data.entitlement],
              ["Método de login", "Conta protegida pelo Clerk"],
              ["E-mail da compra", data.user.purchaseEmail],
              ["Última atividade", new Date(data.lastActivityAt).toLocaleString("pt-BR")],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted text-xs">{label}</dt>
                <dd className="mt-1 text-sm text-white">{value}</dd>
              </div>
            ))}
          </dl>
          <Button
            variant="secondary"
            className="mt-7"
            onClick={logout}
          >
            <LogOut size={16} />
            Sair do aplicativo
          </Button>
        </section>
        <aside className="space-y-5">
          <section className="card">
            <ShieldCheck className="text-gold" />
            <h2 className="mt-4 font-semibold text-white">Acesso verificado</h2>
            <p className="text-muted mt-2 text-sm">Seu acesso está vinculado ao e-mail autenticado na conta Clerk e validado no servidor.</p>
          </section>
          <section className="card">
            <h2 className="font-semibold text-white">Apagar dados locais</h2>
            <p className="text-muted mt-2 text-sm">Remove respostas, resultados e progresso deste navegador.</p>
            {confirmDelete ? (
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    reset();
                    router.push("/");
                  }}
                >
                  <Trash2 size={15} />
                  Confirmar
                </Button>
              </div>
            ) : (
              <Button variant="ghost" className="mt-3" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} />
                Apagar meus dados
              </Button>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
