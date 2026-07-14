import "server-only";

import type { EditablePromptConfig, PromptConfig, PromptStudioState } from "@/lib/prompt-config";
import { getDefaultPromptConfig } from "@/lib/server/stage-prompts";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const EVENT_NAME = "prompt_studio_state";

export async function loadPromptStudioState(): Promise<PromptStudioState> {
  const supabase = createSupabaseAdminClient();
  const result = await supabase.from("activity_events").select("event_data").eq("event_name", EVENT_NAME).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw result.error;
  if (result.data?.event_data) return result.data.event_data as PromptStudioState;

  const initial = createInitialState();
  await persistState(initial);
  return initial;
}

export async function loadPublishedPromptConfig(): Promise<PromptConfig> {
  return (await loadPromptStudioState()).published;
}

export async function savePromptDraft(id: string, expectedUpdatedAt: string, input: EditablePromptConfig) {
  const state = await loadPromptStudioState();
  if (state.draft.id !== id || state.draft.updatedAt !== expectedUpdatedAt) throw new Error("Este rascunho foi alterado em outra sessão. Recarregue a página antes de salvar.");

  const draft: PromptConfig = { ...state.draft, ...input, stagePrompts: { ...input.stagePrompts }, updatedAt: new Date().toISOString() };
  await persistState({ ...state, draft });
  return draft;
}

export async function publishPromptDraft(id: string) {
  const state = await loadPromptStudioState();
  if (state.draft.id !== id) throw new Error("Rascunho não encontrado.");

  const now = new Date().toISOString();
  const archived: PromptConfig = { ...state.published, status: "archived", updatedAt: now };
  const published: PromptConfig = { ...state.draft, status: "published", updatedAt: now, publishedAt: now };
  const draft: PromptConfig = { ...published, id: crypto.randomUUID(), version: Math.max(...state.history.map((config) => config.version), published.version) + 1, status: "draft", changeNotes: "", createdAt: now, updatedAt: now, publishedAt: undefined };
  const next = { draft, published, history: [published, archived, ...state.history.filter((config) => config.id !== state.published.id)] } satisfies PromptStudioState;
  await persistState(next);
  return next;
}

export async function restorePromptVersion(sourceId: string) {
  const state = await loadPromptStudioState();
  const source = state.history.find((config) => config.id === sourceId);
  if (!source) throw new Error("Versão não encontrada.");

  const draft: PromptConfig = {
    ...state.draft,
    agentInstructions: source.agentInstructions,
    stagePrompts: { ...source.stagePrompts },
    model: source.model,
    maxOutputTokens: source.maxOutputTokens,
    changeNotes: `Restaurado da versão ${source.version}`,
    updatedAt: new Date().toISOString(),
  };
  const next = { ...state, draft };
  await persistState(next);
  return next;
}

async function persistState(state: PromptStudioState) {
  const supabase = createSupabaseAdminClient();
  const result = await supabase.from("activity_events").insert({ event_name: EVENT_NAME, event_data: state });
  if (result.error) throw result.error;
}

function createInitialState(): PromptStudioState {
  const now = new Date().toISOString();
  const defaults = getDefaultPromptConfig();
  const published: PromptConfig = { ...defaults, id: crypto.randomUUID(), version: 1, status: "published", createdAt: now, updatedAt: now, publishedAt: now };
  const draft: PromptConfig = { ...defaults, id: crypto.randomUUID(), version: 2, status: "draft", changeNotes: "", createdAt: now, updatedAt: now };
  return { draft, published, history: [published] };
}
