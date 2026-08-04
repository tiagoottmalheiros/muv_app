import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAppUrl, getStripeClient, getStripePriceId, isStripePaymentsEnabled, STRIPE_PRODUCT_CODE } from "@/lib/stripe/server";

export async function POST(request: Request) {
  if (!isStripePaymentsEnabled()) return NextResponse.json({ error: "Checkout Stripe desativado." }, { status: 404 });
  try {
    const appUrl = getAppUrl();
    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && new URL(requestOrigin).origin !== new URL(appUrl).origin) {
      return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
    }

    const session = await getStripeClient().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: getStripePriceId(), quantity: 1 }],
      customer_creation: "always",
      allow_promotion_codes: true,
      locale: "pt-BR",
      success_url: `${appUrl}/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout?cancelado=1`,
      metadata: { product_code: STRIPE_PRODUCT_CODE },
      payment_intent_data: { metadata: { product_code: STRIPE_PRODUCT_CODE } },
      integration_identifier: `muv_starter_${randomLetters(8)}`,
    });
    if (!session.url) throw new Error("A Stripe não retornou a URL do Checkout.");
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error("Failed to create Stripe Checkout Session", error);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}

function randomLetters(length: number) {
  return Array.from(randomBytes(length), (byte) => String.fromCharCode(97 + byte % 26)).join("");
}
