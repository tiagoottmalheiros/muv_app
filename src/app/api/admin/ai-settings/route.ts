import { NextResponse } from "next/server";
import { aiRuntimeSettingsSchema } from "@/lib/ai-runtime-settings";
import { assertPromptAdmin, PromptAdminError } from "@/lib/server/prompt-admin";
import { loadAiRuntimeSettings, saveAiRuntimeSettings } from "@/lib/server/ai-runtime-settings";

export async function GET() {
  try {
    await assertPromptAdmin();
    return NextResponse.json({ settings: await loadAiRuntimeSettings() });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await assertPromptAdmin();
    const parsed = aiRuntimeSettingsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revise os limites e critérios de qualidade." }, { status: 400 });
    return NextResponse.json({ settings: await saveAiRuntimeSettings(parsed.data) });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  console.error("Failed to manage AI runtime settings", error);
  const status = error instanceof PromptAdminError ? error.status : 503;
  const message = error instanceof PromptAdminError ? error.message : "Não foi possível acessar as configurações de IA.";
  return NextResponse.json({ error: message }, { status });
}
