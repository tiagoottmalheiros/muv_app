import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/ui";
import { getStripeClient, STRIPE_PRODUCT_CODE } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  if (process.env.PAYMENT_PROVIDER !== "stripe") redirect("/sign-up");
  const { session_id: sessionId } = await searchParams;
  const session = sessionId ? await getStripeClient().checkout.sessions.retrieve(sessionId) : null;
  const validProduct = session?.metadata?.product_code === STRIPE_PRODUCT_CODE;
  const paid = validProduct && session?.payment_status === "paid";
  const email = session?.customer_details?.email;

  return <main className="bg-app grid min-h-screen place-items-center p-5"><section className="card w-full max-w-xl p-7 text-center sm:p-10"><div className="flex justify-center"><Brand /></div>{paid ? <><div className="mx-auto mt-9 grid size-16 place-items-center rounded-2xl border border-success/20 bg-success/10 text-success"><CheckCircle2 size={28} /></div><p className="eyebrow mt-6">Pagamento confirmado</p><h1 className="text-3xl font-bold text-white">Seu acesso está quase pronto.</h1><p className="mx-auto mt-4 max-w-md leading-7 text-muted">Crie sua conta usando o mesmo e-mail informado no pagamento{email ? ` (${maskEmail(email)})` : ""}. O acesso será vinculado automaticamente.</p><Link href="/sign-up" className="button button-primary mt-7 w-full">Criar conta e acessar</Link><div className="mt-5 flex items-start gap-3 rounded-xl border border-white/8 bg-white/[.03] p-4 text-left"><ShieldCheck className="mt-0.5 shrink-0 text-success" size={17} /><p className="text-xs leading-5 text-muted">Se você já possui uma conta com esse e-mail, entre normalmente em vez de criar outra.</p></div><Link href="/sign-in" className="button button-ghost mt-3 w-full">Já tenho conta</Link></> : <><div className="mx-auto mt-9 grid size-16 place-items-center rounded-2xl border border-gold/20 bg-gold/8 text-gold"><Clock3 size={28} /></div><p className="eyebrow mt-6">Pagamento em processamento</p><h1 className="text-3xl font-bold text-white">Estamos aguardando a confirmação.</h1><p className="mx-auto mt-4 max-w-md leading-7 text-muted">Assim que a Stripe confirmar o pagamento, seu acesso poderá ser vinculado ao e-mail da compra.</p><Link href="/checkout" className="button button-secondary mt-7 w-full">Voltar ao Checkout</Link></>}</section></main>;
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"*".repeat(Math.max(2, name.length - 2))}@${domain}`;
}
