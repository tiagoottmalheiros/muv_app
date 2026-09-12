import "server-only";

import { aiRuntimeSettingsSchema, defaultAiRuntimeSettings, type AiRuntimeSettings } from "@/lib/ai-runtime-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export async function loadAiRuntimeSettings(): Promise<AiRuntimeSettings> {
  const supabase = createSupabaseAdminClient();
  const result = await supabase.from("ai_runtime_settings").select("settings").eq("id", SETTINGS_ID).maybeSingle();
  if (result.error) throw result.error;
  const parsed = aiRuntimeSettingsSchema.safeParse(result.data?.settings);
  return parsed.success ? parsed.data : defaultAiRuntimeSettings;
}

export async function saveAiRuntimeSettings(settings: AiRuntimeSettings) {
  const supabase = createSupabaseAdminClient();
  const result = await supabase.from("ai_runtime_settings").upsert({ id: SETTINGS_ID, settings, updated_at: new Date().toISOString() });
  if (result.error) throw result.error;
  return settings;
}
