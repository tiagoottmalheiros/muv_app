import { NextResponse } from "next/server";
import { z } from "zod";
import { getPromptLabel, promptQuestions, type PromptQuestion } from "@/lib/prompt-base";
import { assertPromptAdmin, PromptAdminError } from "@/lib/server/prompt-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const userIdSchema = z.string().regex(/^user_[A-Za-z0-9]+$/);

export async function GET(_request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    await assertPromptAdmin();
    const parsed = userIdSchema.safeParse((await context.params).userId);
    if (!parsed.success) return NextResponse.json({ error: "Aluno inválido." }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const profile = await supabase.from("profiles").select("id,name,primary_email").eq("clerk_user_id", parsed.data).maybeSingle();
    if (profile.error) throw profile.error;
    if (!profile.data) return NextResponse.json({ error: "Perfil do aluno não encontrado." }, { status: 404 });

    const submission = await supabase.from("prompt_base_submissions").select("answers,status").eq("profile_id", profile.data.id).maybeSingle();
    if (submission.error) throw submission.error;
    if (!submission.data || submission.data.status !== "completed") return NextResponse.json({ error: "O aluno ainda não concluiu o Prompt Base." }, { status: 404 });

    const answers = isRecord(submission.data.answers) ? submission.data.answers : {};
    const exported = {
      schemaVersion: 1,
      student: {
        name: profile.data.name || "Aluno sem nome",
        email: profile.data.primary_email || "",
      },
      answers: [
        { order: 0, id: "businessName", label: "Nome do seu negócio", answer: stringAnswer(answers, "businessName") },
        ...promptQuestions.map((question, index) => ({
          order: index + 1,
          id: question.id,
          label: question.title,
          answer: exportAnswer(question, answers),
        })),
      ],
    };

    return new Response(JSON.stringify(exported, null, 2), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="prompt-base-${parsed.data}.json"`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to export Prompt Base", error);
    const status = error instanceof PromptAdminError ? error.status : 500;
    return NextResponse.json({ error: error instanceof PromptAdminError ? error.message : "Não foi possível exportar o Prompt Base." }, { status });
  }
}

function exportAnswer(question: PromptQuestion, answers: Record<string, unknown>) {
  if (question.type === "select") {
    const value = stringAnswer(answers, question.key);
    return {
      value,
      label: getPromptLabel(value),
      ...(question.otherKey ? { other: stringAnswer(answers, question.otherKey) || null } : {}),
    };
  }
  if (question.type === "optional") {
    return {
      value: stringAnswer(answers, question.key) || null,
      none: answers[question.noneKey] === true,
    };
  }
  if (question.type === "transform") {
    return {
      from: stringAnswer(answers, question.fromKey),
      to: stringAnswer(answers, question.toKey),
    };
  }
  return stringAnswer(answers, question.key);
}

function stringAnswer(answers: Record<string, unknown>, key: PropertyKey) {
  const value = answers[String(key)];
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
