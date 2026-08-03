import Stripe from "stripe";
import { NextResponse } from "next/server";
import { recordStripeEntitlement } from "@/lib/server/stripe-entitlements";
import { getStripeClient, STRIPE_PRODUCT_CODE } from "@/lib/stripe/server";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) return NextResponse.json({ error: "Webhook não configurado." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      if (session.metadata?.product_code === STRIPE_PRODUCT_CODE && session.payment_status === "paid") {
        const paymentIntentId = idFrom(session.payment_intent);
        const email = session.customer_details?.email;
        if (!paymentIntentId || !email) throw new Error("Checkout pago sem PaymentIntent ou e-mail.");
        await recordStripeEntitlement({ eventId: event.id, eventType: event.type, eventCreated: event.created, externalPurchaseId: paymentIntentId, purchaseEmail: email, status: "active" });
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      if (charge.amount_refunded >= charge.amount) {
        const paymentIntentId = idFrom(charge.payment_intent);
        if (paymentIntentId) await recordStripeEntitlement({ eventId: event.id, eventType: event.type, eventCreated: event.created, externalPurchaseId: paymentIntentId, purchaseEmail: charge.billing_details.email || "", status: "refunded" });
      }
    }

    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object;
      const charge = await getStripeClient().charges.retrieve(idFrom(dispute.charge)!);
      const paymentIntentId = idFrom(charge.payment_intent);
      if (paymentIntentId) await recordStripeEntitlement({ eventId: event.id, eventType: event.type, eventCreated: event.created, externalPurchaseId: paymentIntentId, purchaseEmail: charge.billing_details.email || "", status: "blocked" });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Failed to process Stripe webhook", error);
    return NextResponse.json({ error: "Falha ao processar o evento." }, { status: 500 });
  }
}

function idFrom(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id;
}
