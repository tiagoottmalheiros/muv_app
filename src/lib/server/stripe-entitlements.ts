import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

type StripeEntitlementStatus = "active" | "blocked" | "refunded" | "canceled";

export async function recordStripeEntitlement(input: {
  eventId: string;
  eventType: string;
  eventCreated: number;
  externalPurchaseId: string;
  purchaseEmail: string;
  status: StripeEntitlementStatus;
}) {
  const supabase = createSupabaseAdminClient();
  const occurredAt = new Date(input.eventCreated * 1000).toISOString();
  const result = await supabase.rpc("record_stripe_entitlement", {
    target_external_purchase_id: input.externalPurchaseId,
    target_purchase_email: input.purchaseEmail,
    target_status: input.status,
    target_event_created_at: occurredAt,
  });
  if (result.error) throw result.error;

  const entitlement = await supabase.from("entitlements").select("profile_id").eq("id", result.data).single();
  if (entitlement.error) throw entitlement.error;
  const audit = await supabase.from("activity_events").insert({
    profile_id: entitlement.data.profile_id,
    event_name: `stripe.${input.eventType}`,
    event_data: {
      stripeEventId: input.eventId,
      externalPurchaseId: input.externalPurchaseId,
      status: input.status,
    },
  });
  if (audit.error) throw audit.error;
}
