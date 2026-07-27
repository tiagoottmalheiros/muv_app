import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { journey, requiredResultKeys } from "@/lib/journey";
import { isValidTicket } from "@/lib/prompt-base";
import { assertPromptAdmin, getBootstrapAdminIds, PromptAdminError } from "@/lib/server/prompt-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const updateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("admin"), userId: z.string().startsWith("user_"), isAdmin: z.boolean() }),
  z.object({ action: z.literal("access"), userId: z.string().startsWith("user_"), hasAccess: z.boolean() }),
]);
const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().transform((email) => email.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});

export async function GET() {
  try {
    await assertPromptAdmin();
    const [{ userId }, clerk] = await Promise.all([auth(), clerkClient()]);
    const firstPage = await clerk.users.getUserList({ limit: 500, offset: 0, orderBy: "-created_at" });
    const users = [...firstPage.data];
    for (let offset = users.length; offset < firstPage.totalCount; offset = users.length) {
      const page = await clerk.users.getUserList({ limit: 500, offset, orderBy: "-created_at" });
      if (!page.data.length) break;
      users.push(...page.data);
    }
    const supabase = createSupabaseAdminClient();
    const clerkUserIds = users.map((user) => user.id);
    const profilePages = await Promise.all(chunk(clerkUserIds).map((ids) => supabase.from("profiles").select("id,clerk_user_id").in("clerk_user_id", ids)));
    const profileError = profilePages.find((page) => page.error)?.error;
    if (profileError) throw profileError;
    const profiles = profilePages.flatMap((page) => page.data ?? []);

    const profileIds = profiles.map((profile) => profile.id);
    const journeyPages = await Promise.all(chunk(profileIds).map((ids) => Promise.all([
          supabase.from("lesson_progress").select("profile_id,lesson_key,status").in("profile_id", ids),
          supabase.from("prompt_base_submissions").select("profile_id,status,answers").in("profile_id", ids),
          supabase.from("funnel_xray_submissions").select("profile_id,status").in("profile_id", ids),
          supabase.from("student_outputs").select("profile_id,output_key,status,version").in("profile_id", ids),
          supabase.from("entitlements").select("profile_id,status,expires_at").in("profile_id", ids).eq("product_code", "muv_starter"),
        ])));
    const journeyError = journeyPages.flat().find((result) => result.error)?.error;
    if (journeyError) throw journeyError;
    const progress = journeyPages.flatMap((page) => page[0].data ?? []);
    const promptBases = journeyPages.flatMap((page) => page[1].data ?? []);
    const xrays = journeyPages.flatMap((page) => page[2].data ?? []);
    const outputs = journeyPages.flatMap((page) => page[3].data ?? []);
    const entitlements = journeyPages.flatMap((page) => page[4].data ?? []);

    const profileByClerkId = new Map(profiles.map((profile) => [profile.clerk_user_id, profile.id]));
    const completedByProfile = new Map<string, Set<string>>();
    for (const row of progress) {
      if (row.status !== "completed" || row.lesson_key !== "comece-aqui" && row.lesson_key !== "kit-final") continue;
      const completed = completedByProfile.get(row.profile_id) || new Set<string>();
      completed.add(row.lesson_key);
      completedByProfile.set(row.profile_id, completed);
    }
    const addCompleted = (profileId: string, key: string) => {
      const completed = completedByProfile.get(profileId) || new Set<string>();
      completed.add(key);
      completedByProfile.set(profileId, completed);
    };
    const promptBaseProfiles = new Set<string>();
    const activeAccessProfiles = new Set(
      entitlements
        .filter((entitlement) => entitlement.status === "active" && (!entitlement.expires_at || new Date(entitlement.expires_at) > new Date()))
        .map((entitlement) => entitlement.profile_id),
    );
    for (const row of promptBases) {
      const answers = typeof row.answers === "object" && row.answers ? row.answers as Record<string, unknown> : {};
      if (row.status !== "completed" || !isValidTicket(String(answers.ticket || ""))) continue;
      promptBaseProfiles.add(row.profile_id);
      addCompleted(row.profile_id, "prompt-base");
    }
    for (const row of xrays) if (row.status === "completed") addCompleted(row.profile_id, "raio-x");
    for (const row of outputs) if (row.status === "completed" && (row.output_key !== "step_1_diagnosis" || Number(row.version) >= 2)) addCompleted(row.profile_id, row.output_key);
    const bootstrapIds = getBootstrapAdminIds();
    return NextResponse.json({
      users: users.map((user) => {
        const profileId = profileByClerkId.get(user.id);
        const completed = profileId ? completedByProfile.get(profileId) : undefined;
        return {
          id: user.id,
          name: user.fullName || "Usuário sem nome",
          email: user.primaryEmailAddress?.emailAddress || "Sem e-mail",
          imageUrl: user.imageUrl,
          isAdmin: bootstrapIds.includes(user.id) || user.privateMetadata.muvRole === "admin",
          isBootstrap: bootstrapIds.includes(user.id),
          isCurrent: user.id === userId,
          hasProfile: Boolean(profileId),
          hasAccess: Boolean(profileId && activeAccessProfiles.has(profileId)),
          progressPercentage: journey.reduce((total, step) => total + (completed?.has(step.key) && (step.key !== "kit-final" || requiredResultKeys.every((key) => completed.has(key))) ? step.weight : 0), 0),
          promptBaseAvailable: Boolean(profileId && promptBaseProfiles.has(profileId)),
        };
      }),
    });
  } catch (error) {
    return handleError("Failed to list admin users", error);
  }
}

export async function PATCH(request: Request) {
  try {
    await assertPromptAdmin();
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Usuário ou ação inválida." }, { status: 400 });
    const { userId: currentUserId } = await auth();
    if (parsed.data.action === "admin") {
      if (!parsed.data.isAdmin && parsed.data.userId === currentUserId) return NextResponse.json({ error: "Você não pode remover seu próprio acesso administrativo." }, { status: 409 });
      if (!parsed.data.isAdmin && getBootstrapAdminIds().includes(parsed.data.userId)) return NextResponse.json({ error: "O administrador inicial não pode ser removido por esta tela." }, { status: 409 });

      await (await clerkClient()).users.updateUserMetadata(parsed.data.userId, {
        privateMetadata: { muvRole: parsed.data.isAdmin ? "admin" : null },
      });
    } else {
      if (!parsed.data.hasAccess && parsed.data.userId === currentUserId) return NextResponse.json({ error: "Você não pode bloquear seu próprio acesso ao MUV Starter." }, { status: 409 });
      await updateStudentAccess(parsed.data.userId, parsed.data.hasAccess);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError("Failed to update admin user", error);
  }
}

export async function POST(request: Request) {
  let createdUserId: string | undefined;
  let createdProfileId: string | undefined;
  try {
    await assertPromptAdmin();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Informe nome, e-mail válido e uma senha com pelo menos 8 caracteres." }, { status: 400 });

    const [firstName, ...lastNameParts] = parsed.data.name.split(/\s+/);
    const clerk = await clerkClient();
    const user = await clerk.users.createUser({
      emailAddress: [parsed.data.email],
      password: parsed.data.password,
      firstName,
      lastName: lastNameParts.join(" ") || undefined,
      privateMetadata: { muvRole: "student" },
    });
    createdUserId = user.id;

    const supabase = createSupabaseAdminClient();
    const profile = await supabase.from("profiles").upsert({
      clerk_user_id: user.id,
      name: parsed.data.name,
      primary_email: parsed.data.email,
      purchase_email: parsed.data.email,
      avatar_url: user.imageUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: "clerk_user_id" }).select("id").single();
    if (profile.error) throw profile.error;
    createdProfileId = profile.data.id;

    const now = new Date().toISOString();
    const entitlement = await supabase.from("entitlements").upsert({
      profile_id: profile.data.id,
      product_code: "muv_starter",
      source: "manual_admin",
      purchase_email: parsed.data.email,
      status: "active",
      purchased_at: now,
      updated_at: now,
    }, { onConflict: "profile_id,product_code" });
    if (entitlement.error) throw entitlement.error;
    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create student", error);
    const clerk = await clerkClient();
    if (createdUserId) await clerk.users.deleteUser(createdUserId).catch(() => undefined);
    if (createdProfileId) await createSupabaseAdminClient().from("profiles").delete().eq("id", createdProfileId);
    if (error instanceof PromptAdminError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: clerkErrorMessage(error) }, { status: 409 });
  }
}

function handleError(context: string, error: unknown) {
  console.error(context, error);
  const status = error instanceof PromptAdminError ? error.status : 500;
  return NextResponse.json({ error: error instanceof PromptAdminError ? error.message : "Não foi possível atualizar os administradores." }, { status });
}

function clerkErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "errors" in error && Array.isArray(error.errors)) {
    const first = error.errors[0] as { code?: string; longMessage?: string; message?: string; meta?: { paramName?: string } } | undefined;
    const code = first?.code?.toLowerCase() || "";
    const paramName = first?.meta?.paramName?.toLowerCase() || "";
    const details = `${first?.message || ""} ${first?.longMessage || ""}`.toLowerCase();
    if (paramName.includes("username") || code.startsWith("form_username") || details.includes("username")) return "Não foi possível gerar um identificador interno válido. Tente novamente.";
    if (code === "form_identifier_exists" || (details.includes("email") && (details.includes("exist") || details.includes("already") || details.includes("taken")))) return "Este e-mail já está cadastrado. Encontre o usuário na lista e clique em Ativar acesso.";
    if (paramName.includes("password") || code.startsWith("form_password") || details.includes("password")) return "A senha informada não atende aos requisitos de segurança.";
    if (first?.longMessage || first?.message) return first.longMessage || first.message;
  }
  return error instanceof Error && error.message ? error.message : "Não foi possível criar o aluno.";
}

async function updateStudentAccess(userId: string, hasAccess: boolean) {
  const clerk = await clerkClient();
  const supabase = createSupabaseAdminClient();
  const user = await clerk.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress.trim().toLowerCase();
  if (!email) throw new Error("O usuário não possui um e-mail principal válido.");

  const now = new Date().toISOString();
  const profile = await supabase.from("profiles").upsert({
    clerk_user_id: user.id,
    name: user.fullName || user.firstName || "Aluno MUV",
    primary_email: email,
    purchase_email: email,
    avatar_url: user.imageUrl,
    updated_at: now,
  }, { onConflict: "clerk_user_id" }).select("id").single();
  if (profile.error) throw profile.error;

  const entitlement = await supabase.from("entitlements").upsert({
    profile_id: profile.data.id,
    product_code: "muv_starter",
    source: "manual_admin",
    purchase_email: email,
    status: hasAccess ? "active" : "blocked",
    purchased_at: hasAccess ? now : null,
    expires_at: null,
    updated_at: now,
  }, { onConflict: "profile_id,product_code" });
  if (entitlement.error) throw entitlement.error;
}

function chunk<T>(items: T[], size = 100) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}
