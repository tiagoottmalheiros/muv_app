import { NextResponse } from "next/server";
import { createOpenAIClient } from "@/lib/openai/client";
import { assertPromptAdmin, PromptAdminError } from "@/lib/server/prompt-admin";

const FALLBACK_MODELS = ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"];
const PREFERRED_ORDER = ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o", "gpt-5-mini", "gpt-5"];

export async function GET() {
  try {
    await assertPromptAdmin();
    const page = await createOpenAIClient().models.list();
    const models = page.data
      .map((model) => model.id)
      .filter(isResponsesModel)
      .sort((left, right) => rank(left) - rank(right) || left.localeCompare(right));
    return NextResponse.json({ models: models.length ? models : FALLBACK_MODELS, source: models.length ? "openai" : "fallback" });
  } catch (error) {
    console.error("Failed to list OpenAI models", error);
    if (error instanceof PromptAdminError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ models: FALLBACK_MODELS, source: "fallback" });
  }
}

function isResponsesModel(id: string) {
  if (/-20\d{2}-\d{2}-\d{2}$/.test(id)) return false;
  if (/(audio|realtime|transcribe|tts|image|search|embedding|moderation|codex)/i.test(id)) return false;
  return /^(gpt-(4\.1|4o|5)|o[134])(?:-|$)/.test(id);
}

function rank(id: string) {
  const index = PREFERRED_ORDER.indexOf(id);
  return index < 0 ? PREFERRED_ORDER.length : index;
}
