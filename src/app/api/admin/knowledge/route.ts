import { NextResponse } from "next/server";
import { createOpenAIClient } from "@/lib/openai/client";
import { assertPromptAdmin, PromptAdminError } from "@/lib/server/prompt-admin";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "md", "html", "pptx"]);

export const maxDuration = 60;

export async function GET() {
  try {
    await assertPromptAdmin();
    const { openai, vectorStoreId } = getKnowledgeClient();
    const page = await openai.vectorStores.files.list(vectorStoreId, { limit: 100, order: "desc" });
    const files = await Promise.all(page.data.map(async (item) => {
      try {
        const source = await openai.files.retrieve(item.id);
        return { id: item.id, name: source.filename, bytes: source.bytes, status: item.status, createdAt: item.created_at, error: item.last_error?.message };
      } catch {
        return { id: item.id, name: item.id, bytes: item.usage_bytes, status: item.status, createdAt: item.created_at, error: item.last_error?.message };
      }
    }));
    return NextResponse.json({ files, vectorStoreId });
  } catch (error) {
    return handleError("Failed to list knowledge files", error);
  }
}

export async function POST(request: Request) {
  try {
    await assertPromptAdmin();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um arquivo válido." }, { status: 400 });
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(extension)) return NextResponse.json({ error: "Formato não aceito. Use PDF, DOC, DOCX, TXT, MD, HTML ou PPTX." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "O arquivo deve ter no máximo 4 MB." }, { status: 400 });

    const { openai, vectorStoreId } = getKnowledgeClient();
    const uploaded = await openai.files.create({ file, purpose: "assistants" });
    try {
      const attached = await openai.vectorStores.files.createAndPoll(vectorStoreId, { file_id: uploaded.id });
      if (attached.status !== "completed") throw new Error(attached.last_error?.message || "A indexação do arquivo falhou.");
      return NextResponse.json({ ok: true, id: uploaded.id });
    } catch (error) {
      await openai.files.delete(uploaded.id).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return handleError("Failed to upload knowledge file", error);
  }
}

export async function DELETE(request: Request) {
  try {
    await assertPromptAdmin();
    const fileId = new URL(request.url).searchParams.get("fileId");
    if (!fileId?.startsWith("file-")) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
    const { openai, vectorStoreId } = getKnowledgeClient();
    await openai.vectorStores.files.delete(fileId, { vector_store_id: vectorStoreId });
    await openai.files.delete(fileId).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError("Failed to delete knowledge file", error);
  }
}

function getKnowledgeClient() {
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
  if (!vectorStoreId) throw new Error("OPENAI_VECTOR_STORE_ID não foi configurado.");
  return { openai: createOpenAIClient(), vectorStoreId };
}

function handleError(context: string, error: unknown) {
  console.error(context, error);
  const status = error instanceof PromptAdminError ? error.status : error instanceof Error && error.message.includes("não foi configurado") ? 503 : 500;
  const message = error instanceof PromptAdminError || error instanceof Error && error.message.includes("não foi configurado")
    ? error.message
    : "Não foi possível atualizar a base de conhecimento.";
  return NextResponse.json({ error: message }, { status });
}
