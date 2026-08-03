import Link from "next/link";
import { ArrowLeft, Check, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import Stripe from "stripe";
import { Brand } from "@/components/ui";
import { getStripeClient, getStripePriceId } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelado?: string }> }) {
  const { cancelado } = await searchParams;
  const price = await getStripeClient().prices.retrieve(getStripePriceId(), { expand: ["product"] });
  const product = price.product as Stripe.Product;
  if (price.unit_amount === null) throw new Error("O preço do MUV Starter precisa ter um valor fixo.");
  const formattedPrice = new Intl.NumberFormat("pt-BR", { style: "currency", currency: price.currency.toUpperCase() }).format(price.unit_amount / 100);

  return <main className="bg-app min-h-screen px-5 py-6"><div className="mx-auto max-w-5xl"><nav className="flex items-center justify-between"><Brand /><Link href="/" className="button button-ghost"><ArrowLeft size={16} />Voltar</Link></nav><div className="grid gap-8 py-14 lg:grid-cols-[1fr_.78fr] lg:items-start"><section><p className="eyebrow">MUV Starter</p><h1 className="display-title max-w-3xl text-left">Construa seu Filtro Anti-Curiosos com IA.</h1><p className="mt-5 max-w-xl leading-7 text-muted">Uma aplicação guiada para transformar diagnóstico, critérios, mensagem e triagem em ativos prontos para o seu processo comercial.</p><div className="mt-8 grid gap-3">{["Base Estratégica e Raio-X do funil", "Quatro aplicações práticas com IA", "Kit final para copiar, baixar e implementar", "Acesso à Imersão Do Clique ao Contrato em 48h"].map((item) => <p className="flex items-start gap-3 text-sm text-muted" key={item}><Check className="mt-0.5 shrink-0 text-success" size={16} />{item}</p>)}</div></section><aside className="card border-primary/20 p-6 sm:p-8"><div className="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl"><Sparkles size={20} /></div><p className="mt-6 text-sm text-muted">{product.name}</p><strong className="mt-1 block text-4xl text-white">{formattedPrice}</strong><span className="mt-2 block text-xs text-muted">Pagamento único</span>{cancelado && <p className="mt-5 rounded-xl border border-gold/20 bg-gold/7 p-3 text-sm text-gold">Pagamento cancelado. Nenhum valor foi cobrado.</p>}<form action="/api/stripe/checkout" method="POST"><button className="button button-primary mt-7 w-full" type="submit"><CreditCard size={17} />Ir para pagamento seguro</button></form><div className="mt-5 flex items-start gap-3 border-t border-white/8 pt-5"><ShieldCheck className="mt-0.5 shrink-0 text-success" size={17} /><p className="text-xs leading-5 text-muted">Pagamento processado pela Stripe. Os dados do cartão não passam pelos servidores da Central MUV.</p></div></aside></div></div></main>;
}
