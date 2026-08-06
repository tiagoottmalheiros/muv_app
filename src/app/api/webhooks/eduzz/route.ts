import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasKnownEduzzPurchase, inviteEduzzBuyer, recordEduzzEntitlement } from "@/lib/server/eduzz-entitlements";

const supportedEvents = {
  "myeduzz.invoice_paid": "active",
  "myeduzz.invoice_refunded": "refunded",
  "myeduzz.invoice_canceled": "canceled",
  "myeduzz.invoice_chargeback": "blocked",
} as const;

const identifierSchema = z.union([z.string(), z.number()]).transform(String);
const envelopeSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  data: z.unknown(),
  sentDate: z.string().datetime(),
});
const invoiceSchema = z.object({
  id: identifierSchema,
  buyer: z.object({ email: z.email() }).passthrough().optional(),
  items: z.array(z.object({ productId: identifierSchema }).passthrough()).optional(),
}).passthrough();

export async function POST(request: Request) {
  const secret = process.env.EDUZZ_WEBHOOK_SECRET;
  const signature = request.headers.get("x-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook não configurado." }, { status: 400 });

  const rawBody = await request.text();
  if (!isValidSignature(rawBody, signature, secret)) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });

  try {
    const envelope = envelopeSchema.parse(JSON.parse(rawBody));
    if (envelope.event === "ping") return NextResponse.json({ received: true });
    if (!(envelope.event in supportedEvents)) return NextResponse.json({ received: true, ignored: true });

    const invoice = invoiceSchema.parse(envelope.data);
    const externalPurchaseId = `eduzz:${invoice.id}`;
    const configuredProductId = process.env.EDUZZ_PRODUCT_ID;
    if (!configuredProductId) throw new Error("EDUZZ_PRODUCT_ID não foi configurado.");
    const includesProduct = invoice.items?.some((item) => item.productId === configuredProductId) ?? false;
    if (!includesProduct && !await hasKnownEduzzPurchase(externalPurchaseId)) return NextResponse.json({ received: true, ignored: true });

    const status = supportedEvents[envelope.event as keyof typeof supportedEvents];
    const email = invoice.buyer?.email.trim().toLowerCase();
    if (status === "active" && !email) return NextResponse.json({ error: "Compra aprovada sem e-mail do comprador." }, { status: 422 });

    await recordEduzzEntitlement({
      eventId: envelope.id,
      eventType: envelope.event,
      eventCreatedAt: envelope.sentDate,
      externalPurchaseId,
      purchaseEmail: email,
      status,
    });
    const invitation = status === "active" && email ? await inviteEduzzBuyer(email) : undefined;
    return NextResponse.json({ received: true, invitation });
  } catch (error) {
    console.error("Failed to process Eduzz webhook", error);
    return NextResponse.json({ error: "Falha ao processar o evento." }, { status: 500 });
  }
}

function isValidSignature(rawBody: string, signature: string, secret: string) {
  const normalizedSignature = signature.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedSignature)) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "hex");
  const received = Buffer.from(normalizedSignature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
