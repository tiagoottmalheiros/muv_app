import { NextResponse } from "next/server";
import { z } from "zod";
import { editablePromptConfigSchema } from "@/lib/prompt-config";
import { assertPromptAdmin, PromptAdminError } from "@/lib/server/prompt-admin";
import {
  loadPromptStudioState,
  publishPromptDraft,
  restorePromptVersion,
  savePromptDraft,
} from "@/lib/server/prompt-repository";

const saveSchema = editablePromptConfigSchema.extend({
  id: z.uuid(),
  expectedUpdatedAt: z.iso.datetime(),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish"), id: z.uuid() }),
  z.object({ action: z.literal("restore"), id: z.uuid() }),
]);

export async function GET() {
  try {
    await assertPromptAdmin();
    return NextResponse.json(await loadPromptStudioState());
  } catch (error) {
    return handleError("Failed to load Prompt Studio", error);
  }
}

export async function PUT(request: Request) {
  try {
    await assertPromptAdmin();
    const parsed = saveSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Revise os campos do rascunho antes de salvar.", details: parsed.error.flatten() },
        { status: 400 },
      );
    const { id, expectedUpdatedAt, ...input } = parsed.data;
    const draft = await savePromptDraft(id, expectedUpdatedAt, input);
    return NextResponse.json({ draft });
  } catch (error) {
    return handleError("Failed to save prompt draft", error);
  }
}

export async function POST(request: Request) {
  try {
    await assertPromptAdmin();
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Ação administrativa inválida." }, { status: 400 });
    const state =
      parsed.data.action === "publish"
        ? await publishPromptDraft(parsed.data.id)
        : await restorePromptVersion(parsed.data.id);
    return NextResponse.json(state);
  } catch (error) {
    return handleError("Failed to update prompt version", error);
  }
}

function handleError(context: string, error: unknown) {
  console.error(context, error);
  const status =
    error instanceof PromptAdminError
      ? error.status
      : error instanceof Error && error.message.includes("outra sessão")
        ? 409
        : 503;
  const message =
    error instanceof PromptAdminError || (error instanceof Error && error.message.includes("outra sessão"))
      ? error.message
      : "Não foi possível atualizar os prompts no Supabase.";
  return NextResponse.json({ error: message }, { status });
}
