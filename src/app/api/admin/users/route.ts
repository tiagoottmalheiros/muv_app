import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { journey, requiredResultKeys } from "@/lib/journey";
import { isValidExactTicket } from "@/lib/prompt-base";
import { assertPromptAdmin, getBootstrapAdminIds, PromptAdminError } from "@/lib/server/prompt-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const updateSchema = z.object({ userId: z.string().startsWith("user_"), isAdmin: z.boolean() });
const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().transform((email) => email.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});

export async function GET() {
  try {
    await assertPromptAdmin();
    const [{ userId }, users] = await Promise.all([auth(), (await clerkClient()).users.getUserList({ limit: 100, orderBy: "-created_at" })]);
    const supabase = createSupabaseAdminClient();
    const clerkUserIds = users.data.map((user) => user.id);
    const profiles = clerkUserIds.length
      ? await supabase.from("profiles").select("id,clerk_user_id").in("clerk_user_id", clerkUserIds)
      : { data: [], error: null };
    if (profiles.error) throw profiles.error;

    const profileIds = profiles.data.map((profile) => profile.id);
    const [progress, promptBases, xrays, outputs] = profileIds.length
      ? await Promise.all([
          supabase.from("lesson_progress").select("profile_id,lesson_key,status").in("profile_id", profileIds),
          supabase.from("prompt_base_submissions").select("profile_id,status,answers").in("profile_id", profileIds),
          supabase.from("funnel_xray_submissions").select("profile_id,status").in("profile_id", profileIds),
          supabase.from("student_outputs").select("profile_id,output_key,status,version").in("profile_id", profileIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
    if (progress.error) throw progress.error;
    if (promptBases.error) throw promptBases.error;
    if (xrays.error) throw xrays.error;
    if (outputs.error) throw outputs.error;

    const profileByClerkId = new Map(profiles.data.map((profile) => [profile.clerk_user_id, profile.id]));
    const completedByProfile = new Map<string, Set<string>>();
    for (const row of progress.data) {
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
    for (const row of promptBases.data) {
      const answers = typeof row.answers === "object" && row.answers ? row.answers as Record<string, unknown> : {};
      if (row.status !== "completed" || !isValidExactTicket(String(answers.ticket || ""))) continue;
      promptBaseProfiles.add(row.profile_id);
      addCompleted(row.profile_id, "prompt-base");
    }
    for (const row of xrays.data) if (row.status === "completed") addCompleted(row.profile_id, "raio-x");
    for (const row of outputs.data) if (row.status === "completed" && (row.output_key !== "step_1_diagnosis" || Number(row.version) >= 2)) addCompleted(row.profile_id, row.output_key);
    const bootstrapIds = getBootstrapAdminIds();
    return NextResponse.json({
      users: users.data.map((user) => {
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
    if (!parsed.success) return NextResponse.json({ error: "Usuário ou função inválida." }, { status: 400 });
    const { userId: currentUserId } = await auth();
    if (!parsed.data.isAdmin && parsed.data.userId === currentUserId) return NextResponse.json({ error: "Você não pode remover seu próprio acesso administrativo." }, { status: 409 });
    if (!parsed.data.isAdmin && getBootstrapAdminIds().includes(parsed.data.userId)) return NextResponse.json({ error: "O administrador inicial não pode ser removido por esta tela." }, { status: 409 });

    await (await clerkClient()).users.updateUserMetadata(parsed.data.userId, {
      privateMetadata: { muvRole: parsed.data.isAdmin ? "admin" : null },
    });
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
    if (code === "form_identifier_exists" || (details.includes("email") && (details.includes("exist") || details.includes("already") || details.includes("taken")))) return "Este e-mail já está cadastrado.";
    if (paramName.includes("password") || code.startsWith("form_password") || details.includes("password")) return "A senha informada não atende aos requisitos de segurança.";
    if (first?.longMessage || first?.message) return first.longMessage || first.message;
  }
  return error instanceof Error && error.message ? error.message : "Não foi possível criar o aluno.";
}
