import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
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
    const bootstrapIds = getBootstrapAdminIds();
    return NextResponse.json({
      users: users.data.map((user) => ({
        id: user.id,
        name: user.fullName || user.username || "Usuário sem nome",
        email: user.primaryEmailAddress?.emailAddress || "Sem e-mail",
        imageUrl: user.imageUrl,
        isAdmin: bootstrapIds.includes(user.id) || user.privateMetadata.muvRole === "admin",
        isBootstrap: bootstrapIds.includes(user.id),
        isCurrent: user.id === userId,
      })),
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
    const emailAddress = user.emailAddresses.find((item) => item.emailAddress.toLowerCase() === parsed.data.email);
    if (!emailAddress) throw new Error("O Clerk não criou o e-mail do aluno.");
    await clerk.emailAddresses.updateEmailAddress(emailAddress.id, { verified: true, primary: true });

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
    const first = error.errors[0] as { longMessage?: string; message?: string } | undefined;
    if (first?.longMessage || first?.message) return first.longMessage || first.message;
  }
  return error instanceof Error && error.message ? error.message : "Não foi possível criar o aluno.";
}
