import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPromptAdmin, getBootstrapAdminIds, PromptAdminError } from "@/lib/server/prompt-admin";

const updateSchema = z.object({ userId: z.string().startsWith("user_"), isAdmin: z.boolean() });

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

function handleError(context: string, error: unknown) {
  console.error(context, error);
  const status = error instanceof PromptAdminError ? error.status : 500;
  return NextResponse.json({ error: error instanceof PromptAdminError ? error.message : "Não foi possível atualizar os administradores." }, { status });
}
