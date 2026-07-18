import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPromptAdmin, PromptAdminError } from "@/lib/server/prompt-admin";
import { resetStudentJourneyByProfileId } from "@/lib/server/student-repository";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const userIdSchema = z.string().regex(/^user_[A-Za-z0-9]+$/);

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    await assertPromptAdmin();
    const parsed = userIdSchema.safeParse((await context.params).userId);
    if (!parsed.success) return NextResponse.json({ error: "Aluno inválido." }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const profile = await supabase.from("profiles").select("id").eq("clerk_user_id", parsed.data).maybeSingle();
    if (profile.error) throw profile.error;
    if (!profile.data) return NextResponse.json({ error: "Perfil do aluno não encontrado." }, { status: 404 });

    await resetStudentJourneyByProfileId(profile.data.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reset student progress", error);
    const status = error instanceof PromptAdminError ? error.status : 500;
    return NextResponse.json({ error: error instanceof PromptAdminError ? error.message : "Não foi possível zerar o progresso do aluno." }, { status });
  }
}
