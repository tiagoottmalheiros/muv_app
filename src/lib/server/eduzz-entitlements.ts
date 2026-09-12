import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
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

export async function getEduzzPurchaseEmail(externalPurchaseId: string) {
  const result = await createSupabaseAdminClient()
    .from("entitlements")
    .select("purchase_email")
    .eq("external_purchase_id", externalPurchaseId)
    .eq("source", "eduzz")
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data?.purchase_email ?? null;
}

export async function hasActiveEduzzPurchaseForEmail(emailAddress: string) {
  const email = emailAddress.trim().toLowerCase();
  const result = await createSupabaseAdminClient()
    .from("entitlements")
    .select("expires_at")
    .eq("source", "eduzz")
    .eq("product_code", "muv_starter")
    .eq("purchase_email", email)
    .eq("status", "active");
  if (result.error) throw result.error;
  return result.data.some((entitlement) => !entitlement.expires_at || new Date(entitlement.expires_at) > new Date());
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

export async function inviteMuvStudent(emailAddress: string, externalPurchaseId?: string) {
  const email = emailAddress.trim().toLowerCase();
  const clerk = await clerkClient();
  const [users, invitations] = await Promise.all([
    clerk.users.getUserList({ emailAddress: [email], limit: 1 }),
    clerk.invitations.getInvitationList({ query: email, limit: 20 }),
  ]);
  if (users.totalCount > 0) return "existing_user" as const;
  const pending = invitations.data.find((invitation) => invitation.emailAddress.toLowerCase() === email && invitation.status === "pending");
  if (pending) return "pending_invitation" as const;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL não foi configurada.");
  try {
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      expiresInDays: 30,
      notify: true,
      redirectUrl: `${appUrl.replace(/\/$/, "")}/sign-up`,
    });
    if (!invitation.url) throw new Error("O Clerk não retornou a URL do convite.");
    await sendInvitationToGoHighLevel({ email, invitationUrl: invitation.url, externalPurchaseId });
  } catch (error) {
    if (isClerkAPIResponseError(error) && error.errors.some((item) => item.code === "duplicate_record")) {
      return "pending_invitation" as const;
    }
    throw error;
  }
  return "invited" as const;
}

export const inviteEduzzBuyer = inviteMuvStudent;

async function sendInvitationToGoHighLevel(input: { email: string; invitationUrl: string; externalPurchaseId?: string }) {
  const webhookUrl = process.env.GHL_INVITATION_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "muv.invitation.created",
        email: input.email,
        invitationUrl: input.invitationUrl,
        product: "MUV Starter",
        externalPurchaseId: input.externalPurchaseId,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error("GoHighLevel invitation webhook failed", { status: response.status });
  } catch (error) {
    console.error("GoHighLevel invitation webhook request failed", error);
  }
}

export async function getMuvInvitationDestination(emailAddress: string) {
  const email = emailAddress.trim().toLowerCase();
  const clerk = await clerkClient();
  const [users, invitations] = await Promise.all([
    clerk.users.getUserList({ emailAddress: [email], limit: 1 }),
    clerk.invitations.getInvitationList({ query: email, limit: 20 }),
  ]);
  if (users.totalCount > 0) return { status: "existing_user" as const };

  const pending = invitations.data.find((invitation) => invitation.emailAddress.toLowerCase() === email && invitation.status === "pending");
  if (pending) {
    if (!pending.url) throw new Error("O Clerk não retornou a URL do convite pendente.");
    return { status: "invitation" as const, url: pending.url };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL não foi configurada.");
  const invitation = await clerk.invitations.createInvitation({
    emailAddress: email,
    expiresInDays: 1,
    notify: false,
    redirectUrl: `${appUrl.replace(/\/$/, "")}/sign-up`,
  });
  if (!invitation.url) throw new Error("O Clerk não retornou a URL do convite.");
  return { status: "invitation" as const, url: invitation.url };
}

export async function revokeEduzzBuyerSessions(emailAddress: string) {
  const email = emailAddress.trim().toLowerCase();
  const clerk = await clerkClient();
  const users = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
  const user = users.data[0];
  if (!user || user.privateMetadata.muvRole === "admin") return 0;

  const sessions = await clerk.sessions.getSessionList({ userId: user.id, status: "active", limit: 100 });
  await Promise.all(sessions.data.map((session) => clerk.sessions.revokeSession(session.id)));
  return sessions.data.length;
}
