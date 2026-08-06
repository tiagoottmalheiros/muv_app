import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type EduzzEntitlementStatus = "active" | "blocked" | "refunded" | "canceled";

export async function hasKnownEduzzPurchase(externalPurchaseId: string) {
  const result = await createSupabaseAdminClient()
    .from("entitlements")
    .select("id")
    .eq("external_purchase_id", externalPurchaseId)
    .eq("source", "eduzz")
    .maybeSingle();
  if (result.error) throw result.error;
  return Boolean(result.data);
}

export async function getKnownEduzzPurchaseStatus(externalPurchaseId: string) {
  const result = await createSupabaseAdminClient()
    .from("entitlements")
    .select("status")
    .eq("external_purchase_id", externalPurchaseId)
    .eq("source", "eduzz")
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data?.status ?? null;
}

export async function recordEduzzEntitlement(input: {
  eventId: string;
  eventType: string;
  eventCreatedAt: string;
  externalPurchaseId: string;
  purchaseEmail?: string;
  status: EduzzEntitlementStatus;
}) {
  const result = await createSupabaseAdminClient().rpc("record_eduzz_entitlement", {
    target_event_id: input.eventId,
    target_event_type: input.eventType,
    target_external_purchase_id: input.externalPurchaseId,
    target_purchase_email: input.purchaseEmail || "",
    target_status: input.status,
    target_event_created_at: input.eventCreatedAt,
  });
  if (result.error) throw result.error;
  return result.data as string | null;
}

export async function inviteEduzzBuyer(emailAddress: string) {
  const email = emailAddress.trim().toLowerCase();
  const clerk = await clerkClient();
  const [users, invitations] = await Promise.all([
    clerk.users.getUserList({ emailAddress: [email], limit: 1 }),
    clerk.invitations.getInvitationList({ query: email, limit: 20 }),
  ]);
  if (users.totalCount > 0) return "existing_user" as const;
  if (invitations.data.some((invitation) => invitation.emailAddress.toLowerCase() === email && invitation.status === "pending")) return "pending_invitation" as const;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL não foi configurada.");
  await clerk.invitations.createInvitation({
    emailAddress: email,
    expiresInDays: 30,
    notify: true,
    redirectUrl: `${appUrl.replace(/\/$/, "")}/sign-up`,
  });
  return "invited" as const;
}
