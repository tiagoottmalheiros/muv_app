import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWithMuvAgent } from "@/lib/openai/agent";
import { editablePromptConfigSchema } from "@/lib/prompt-config";
import { assertPromptAdmin, PromptAdminError } from "@/lib/server/prompt-admin";
import { loadPromptStudioState } from "@/lib/server/prompt-repository";
import { loadDevelopmentStudentState } from "@/lib/server/student-repository";
import { OUTPUT_KEYS } from "@/lib/types";

const testSchema = z.object({
  lessonKey: z.enum(OUTPUT_KEYS),
  config: editablePromptConfigSchema,
});

export async function POST(request: Request) {
  try {
    await assertPromptAdmin();
    if (!process.env.OPENAI_API_KEY)
      return NextResponse.json({ error: "Configure OPENAI_API_KEY para testar os prompts." }, { status: 503 });

    const parsed = testSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "O rascunho contém campos inválidos." }, { status: 400 });

    const [studentState, studio] = await Promise.all([loadDevelopmentStudentState(), loadPromptStudioState()]);
    if (!studentState)
      return NextResponse.json(
        { error: "Preencha o Prompt Base e o Raio-X da conta demonstrativa antes do teste." },
        { status: 409 },
      );

    const context = {
      promptBase: studentState.promptBase.answers,
      xray: {
        score: studentState.xray.score,
        classification: studentState.xray.classification,
        leakLevel: studentState.xray.leakLevel,
        bottleneck: studentState.xray.bottleneck,
        answers: studentState.xray.answers,
      },
      previousOutputs: Object.fromEntries(
        Object.entries(studentState.outputs).map(([key, output]) => [key, output?.content ?? ""]),
      ),
    };

    const [draft, published] = await Promise.all([
      generateWithMuvAgent(parsed.data.lessonKey, context, parsed.data.config),
      generateWithMuvAgent(parsed.data.lessonKey, context, studio.published),
    ]);

    return NextResponse.json({
      draft: summarize(draft),
      published: summarize(published),
      publishedVersion: studio.published.version,
    });
  } catch (error) {
    console.error("Failed to test prompt draft", error);
    const status = error instanceof PromptAdminError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof PromptAdminError ? error.message : "Não foi possível executar o teste dos prompts." },
      { status },
    );
  }
}

function summarize(result: Awaited<ReturnType<typeof generateWithMuvAgent>>) {
  return {
    content: result.content,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    durationMs: result.durationMs,
    usedKnowledgeBase: result.usedKnowledgeBase,
  };
}
