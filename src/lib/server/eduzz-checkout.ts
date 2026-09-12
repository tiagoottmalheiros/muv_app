import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createEduzzCart, getEduzzProductId, getEduzzSale } from "@/lib/server/eduzz-api";
import { hasKnownEduzzPurchase, recordEduzzEntitlement } from "@/lib/server/eduzz-entitlements";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const EXPECTED_PRICE_CENTS = 2990;

export async function startEduzzCheckout(appUrl: string) {
  const orderId = randomUUID();
  const returnToken = randomBytes(16).toString("hex");
  const postbackToken = randomBytes(16).toString("hex");
  const supabase = createSupabaseAdminClient();
  const inserted = await supabase.from("eduzz_checkout_sessions").insert({
    order_id: orderId,
    return_token_hash: hashToken(returnToken),
    postback_token_hash: hashToken(postbackToken),
  }).select("id").single();
  if (inserted.error) throw inserted.error;

  try {
    const baseUrl = appUrl.replace(/\/$/, "");
    const postbackUrl = `${baseUrl}/api/eduzz/cart-postback?orderId=${orderId}&token=${encodeURIComponent(postbackToken)}`;
    const returnUrl = `${baseUrl}/ativar?token=${encodeURIComponent(returnToken)}`;
    const cart = await createEduzzCart({
      orderId,
      postbackUrl,
      returnUrl,
    });
    if (!cart.paymentUrl) throw new Error("A Eduzz não retornou a URL de pagamento.");
    if (cart.postbackUrl !== postbackUrl || cart.returnUrl !== returnUrl) throw new Error("A Eduzz não preservou as URLs de retorno do carrinho.");
    const updated = await supabase.from("eduzz_checkout_sessions").update({
      eduzz_cart_id: cart.id,
      eduzz_cart_key: cart.key,
      updated_at: new Date().toISOString(),
    }).eq("id", inserted.data.id);
    if (updated.error) throw updated.error;
    return cart.paymentUrl;
  } catch (error) {
    await supabase.from("eduzz_checkout_sessions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", inserted.data.id);
    throw error;
  }
}

export async function processEduzzCartPostback(input: { orderId: string; token: string; payload: unknown }) {
  const supabase = createSupabaseAdminClient();
  const session = await supabase.from("eduzz_checkout_sessions").select("id,status,expires_at,purchase_email")
    .eq("order_id", input.orderId)
    .eq("postback_token_hash", hashToken(input.token))
    .maybeSingle();
  if (session.error) throw session.error;
  if (!session.data) return { accepted: false as const, status: 404 };

  const saleId = findSaleId(input.payload);
  if (!saleId) throw new Error("O postback Eduzz não informou o identificador da venda.");
  const sale = await getEduzzSale(saleId);
  assertExpectedSale(sale);

  if (sale.status !== "paid") {
    const status = sale.status === "canceled" || sale.status === "refunded" ? "canceled" : session.data.status;
    const updated = await supabase.from("eduzz_checkout_sessions").update({ sale_id: saleId, status, updated_at: new Date().toISOString() }).eq("id", session.data.id);
    if (updated.error) throw updated.error;
    return { accepted: true as const, paid: false };
  }

  const email = sale.buyer?.email?.trim().toLowerCase();
  if (!email) throw new Error("A venda paga não possui e-mail do comprador.");
  if (session.data.purchase_email && session.data.purchase_email !== email) throw new Error("O e-mail da venda não corresponde ao carrinho criado.");
  const paidAt = sale.paidAt && !Number.isNaN(Date.parse(sale.paidAt)) ? new Date(sale.paidAt).toISOString() : new Date().toISOString();
  const externalPurchaseId = `eduzz:${saleId}`;
  if (!await hasKnownEduzzPurchase(externalPurchaseId)) {
    await recordEduzzEntitlement({
      eventId: `sun-cart:${input.orderId}:paid`,
      eventType: "sun.cart.paid",
      eventCreatedAt: paidAt,
      externalPurchaseId,
      purchaseEmail: email,
      status: "active",
    });
  }
  const updated = await supabase.from("eduzz_checkout_sessions").update({
    sale_id: saleId,
    purchase_email: email,
    status: "paid",
    paid_at: paidAt,
    updated_at: new Date().toISOString(),
  }).eq("id", session.data.id);
  if (updated.error) throw updated.error;
  return { accepted: true as const, paid: true };
}

export async function markEduzzCheckoutPaidBySale(input: { saleId: string; email: string; paidAt: string }) {
  const result = await createSupabaseAdminClient().from("eduzz_checkout_sessions").update({
    purchase_email: input.email.trim().toLowerCase(),
    status: "paid",
    paid_at: input.paidAt,
    updated_at: new Date().toISOString(),
  }).eq("sale_id", input.saleId).eq("status", "pending");
  if (result.error) throw result.error;
}

export async function getEduzzCheckoutActivation(returnToken: string) {
  const result = await createSupabaseAdminClient().from("eduzz_checkout_sessions")
    .select("status,purchase_email,expires_at")
    .eq("return_token_hash", hashToken(returnToken))
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data || new Date(result.data.expires_at) <= new Date()) return { status: "invalid" as const };
  if (result.data.status === "paid" && result.data.purchase_email) return { status: "paid" as const, email: result.data.purchase_email };
  if (result.data.status === "failed" || result.data.status === "canceled") return { status: result.data.status };
  return { status: "pending" as const };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function findSaleId(payload: unknown): string | null {
  const preferredKeys = new Set(["saleid", "sale_id", "invoiceid", "invoice_id", "edz_fat_cod", "id"]);
  const queue: unknown[] = [payload];
  for (let depth = 0; depth < 4 && queue.length; depth += 1) {
    const level = queue.splice(0);
    for (const value of level) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      for (const [key, child] of Object.entries(value)) {
        if (preferredKeys.has(key.toLowerCase()) && (typeof child === "string" || typeof child === "number") && /^\d+$/.test(String(child))) return String(child);
        if (child && typeof child === "object") queue.push(child);
      }
    }
  }
  return null;
}

function assertExpectedSale(sale: Awaited<ReturnType<typeof getEduzzSale>>) {
  const hasProduct = sale.product?.id === getEduzzProductId() || sale.items?.some((item) => item.productId === getEduzzProductId());
  if (!hasProduct) throw new Error("O postback não corresponde ao produto MUV Starter.");
  if (sale.total?.currency !== "BRL" || Math.round(Number(sale.total.value) * 100) !== EXPECTED_PRICE_CENTS) {
    throw new Error("O valor da venda não corresponde ao checkout MUV Starter.");
  }
}
