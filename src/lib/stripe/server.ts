import "server-only";

import Stripe from "stripe";

let stripe: Stripe | undefined;

export function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY não foi configurada.");
  stripe ??= new Stripe(apiKey, { apiVersion: "2026-07-29.dahlia" });
  return stripe;
}

export function getStripePriceId() {
  const priceId = process.env.STRIPE_PRICE_MUV_STARTER;
  if (!priceId) throw new Error("STRIPE_PRICE_MUV_STARTER não foi configurado.");
  return priceId;
}

export function getAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL não foi configurada.");
  return url.replace(/\/$/, "");
}

export const STRIPE_PRODUCT_CODE = "muv_starter";

export function isStripePaymentsEnabled() {
  return process.env.PAYMENT_PROVIDER === "stripe";
}
