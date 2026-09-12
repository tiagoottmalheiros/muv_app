import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Brand } from "@/components/ui";
import { ActivationStatus } from "./activation-status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ativar acesso",
  description: "Confirme seu pagamento e crie a senha do APP MUV.",
  referrer: "no-referrer",
};

export default async function ActivatePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (process.env.EDUZZ_SUN_CHECKOUT_ENABLED !== "true") notFound();
  const { token = "" } = await searchParams;
  return <main className="bg-app grid min-h-screen place-items-center p-5"><section className="card w-full max-w-xl p-7 text-center sm:p-10"><div className="flex justify-center"><Brand /></div><ActivationStatus token={token} /></section></main>;
}
