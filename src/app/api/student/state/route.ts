import { NextResponse } from "next/server";
import { loadDevelopmentStudentState, resetAuthenticatedStudentJourney, saveDevelopmentStudentState } from "@/lib/server/student-repository";
import { assertPromptAdmin, PromptAdminError } from "@/lib/server/prompt-admin";
import type { AppData } from "@/lib/types";

export async function GET() {
  try {
    const data = await loadDevelopmentStudentState();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to load student state", error);
    return NextResponse.json({ error: "Supabase indisponível ou não configurado." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json() as AppData;
    await saveDevelopmentStudentState(data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save student state", error);
    return NextResponse.json({ error: "Não foi possível salvar no Supabase." }, { status: 503 });
  }
}

export async function DELETE() {
  try {
    await assertPromptAdmin();
    await resetAuthenticatedStudentJourney();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reset student state", error);
    const status = error instanceof PromptAdminError ? error.status : 503;
    return NextResponse.json({ error: error instanceof PromptAdminError ? error.message : "Não foi possível reiniciar sua jornada." }, { status });
  }
}
