import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { EMPTY_APP_DATA, type AppData, type OutputKey } from "@/lib/types";

const DEV_CLERK_USER_ID = "dev_central_muv_user";

export async function loadDevelopmentStudentState(): Promise<AppData | null> {
  const supabase = createSupabaseAdminClient();
  const profile = await getOrCreateDevelopmentProfile();

  const [promptBase, xray, progress, outputs, immersion, entitlement] = await Promise.all([
    supabase.from("prompt_base_submissions").select("*").eq("profile_id", profile.id).maybeSingle(),
    supabase.from("funnel_xray_submissions").select("*").eq("profile_id", profile.id).maybeSingle(),
    supabase.from("lesson_progress").select("*").eq("profile_id", profile.id),
    supabase.from("student_outputs").select("*").eq("profile_id", profile.id),
    supabase.from("immersion_registrations").select("*").eq("profile_id", profile.id).maybeSingle(),
    supabase.from("entitlements").select("status").eq("profile_id", profile.id).eq("product_code", "muv_starter").maybeSingle(),
  ]);

  const error = [promptBase.error, xray.error, progress.error, outputs.error, immersion.error, entitlement.error].find(Boolean);
  if (error) throw error;
  const hasData = Boolean(promptBase.data || xray.data || outputs.data?.length || progress.data?.length);
  if (!hasData) return null;

  const outputMap = Object.fromEntries((outputs.data ?? []).map((output) => [output.output_key, {
    key: output.output_key as OutputKey,
    title: output.title ?? "Entregável MUV",
    content: output.content ?? "",
    completed: output.status === "completed",
    updatedAt: output.updated_at,
  }]));
  const progressMap = new Map((progress.data ?? []).map((item) => [item.lesson_key, item]));

  return {
    ...EMPTY_APP_DATA,
    authenticated: true,
    entitlement: entitlement.data?.status === "active" ? "active" : entitlement.data?.status === "blocked" ? "blocked" : "pending",
    user: { name: profile.name ?? "Aluno MUV", email: profile.primary_email ?? "aluno@muv.com.br", purchaseEmail: profile.purchase_email ?? profile.primary_email ?? "" },
    promptBase: {
      answers: promptBase.data?.answers ?? EMPTY_APP_DATA.promptBase.answers,
      generatedText: promptBase.data?.generated_text ?? "",
      completed: promptBase.data?.status === "completed",
      currentStep: Number(progressMap.get("prompt-base")?.percent ?? 0),
      updatedAt: promptBase.data?.updated_at,
    },
    xray: {
      answers: xray.data?.answers ?? [], score: Number(xray.data?.score ?? 0), classification: xray.data?.classification ?? "",
      leakLevel: xray.data?.leak_level ?? "", bottleneck: xray.data?.main_bottleneck ?? "mensagem", generatedText: xray.data?.generated_text ?? "",
      completed: xray.data?.status === "completed", currentStep: Number(progressMap.get("raio-x")?.percent ?? 0), updatedAt: xray.data?.updated_at,
    },
    outputs: outputMap,
    startedSteps: (progress.data ?? []).filter((item) => item.status !== "not_started").map((item) => item.lesson_key),
    comeceAquiCompleted: progressMap.get("comece-aqui")?.status === "completed",
    kitReviewed: progressMap.get("kit-final")?.status === "completed",
    immersion: {
      viewed: Boolean(immersion.data?.viewed_at), clicked: Boolean(immersion.data?.clicked_at), confirmed: immersion.data?.status === "confirmed",
      confirmedAt: immersion.data?.confirmed_at ?? undefined,
    },
    lastRoute: profile.last_route ?? "/central/comece-aqui",
    lastActivityAt: profile.last_access_at ?? profile.updated_at,
  } as AppData;
}

export async function saveDevelopmentStudentState(data: AppData) {
  const supabase = createSupabaseAdminClient();
  const profile = await getOrCreateDevelopmentProfile();
  const now = new Date().toISOString();

  const operations = [
    supabase.from("profiles").update({ name: data.user.name, primary_email: data.user.email, purchase_email: data.user.purchaseEmail, last_access_at: now, updated_at: now, last_route: data.lastRoute }).eq("id", profile.id),
    supabase.from("entitlements").upsert({ profile_id: profile.id, product_code: "muv_starter", source: "development", purchase_email: data.user.purchaseEmail, status: data.entitlement, updated_at: now }, { onConflict: "profile_id,product_code" }),
    supabase.from("prompt_base_submissions").upsert({ profile_id: profile.id, answers: data.promptBase.answers, generated_text: data.promptBase.generatedText, status: data.promptBase.completed ? "completed" : "draft", completed_at: data.promptBase.completed ? now : null, updated_at: now }, { onConflict: "profile_id" }),
    supabase.from("funnel_xray_submissions").upsert({ profile_id: profile.id, answers: data.xray.answers, score: data.xray.score, classification: data.xray.classification, leak_level: data.xray.leakLevel, main_bottleneck: data.xray.bottleneck, generated_text: data.xray.generatedText, status: data.xray.completed ? "completed" : "draft", completed_at: data.xray.completed ? now : null, updated_at: now }, { onConflict: "profile_id" }),
    supabase.from("immersion_registrations").upsert({ profile_id: profile.id, status: data.immersion.confirmed ? "confirmed" : "pending", viewed_at: data.immersion.viewed ? now : null, clicked_at: data.immersion.clicked ? now : null, confirmed_at: data.immersion.confirmedAt ?? null, updated_at: now }, { onConflict: "profile_id" }),
  ];
  const results = await Promise.all(operations);
  const error = results.find((result) => result.error)?.error;
  if (error) throw error;

  const progressRows = buildProgressRows(profile.id, data, now);
  const progressResult = await supabase.from("lesson_progress").upsert(progressRows, { onConflict: "profile_id,lesson_key" });
  if (progressResult.error) throw progressResult.error;

  const outputRows = Object.values(data.outputs).filter(Boolean).map((output) => ({
    profile_id: profile.id, output_key: output!.key, title: output!.title, content: output!.content,
    status: output!.completed ? "completed" : "draft", version: 1, updated_at: now,
  }));
  if (outputRows.length) {
    const outputResult = await supabase.from("student_outputs").upsert(outputRows, { onConflict: "profile_id,output_key" });
    if (outputResult.error) throw outputResult.error;
  }
}

async function getOrCreateDevelopmentProfile() {
  if (process.env.NODE_ENV === "production") throw new Error("A identidade Clerk deve ser configurada antes de usar o Supabase em produção.");
  const supabase = createSupabaseAdminClient();
  const result = await supabase.from("profiles").upsert({ clerk_user_id: DEV_CLERK_USER_ID, name: "Aluno MUV", primary_email: "aluno@muv.com.br", purchase_email: "aluno@muv.com.br", updated_at: new Date().toISOString() }, { onConflict: "clerk_user_id" }).select("*").single();
  if (result.error) throw result.error;
  return result.data;
}

function buildProgressRows(profileId: string, data: AppData, now: string) {
  const entries = [
    ["comece-aqui", data.comeceAquiCompleted], ["prompt-base", data.promptBase.completed], ["raio-x", data.xray.completed],
    ["step_1_diagnosis", data.outputs.step_1_diagnosis?.completed], ["step_2_buyer_map", data.outputs.step_2_buyer_map?.completed],
    ["step_3_filter_message", data.outputs.step_3_filter_message?.completed], ["step_4_triage_script", data.outputs.step_4_triage_script?.completed],
    ["kit-final", data.kitReviewed],
  ] as const;
  return entries.map(([lessonKey, completed]) => ({ profile_id: profileId, lesson_key: lessonKey, status: completed ? "completed" : data.startedSteps.includes(lessonKey) ? "in_progress" : "not_started", percent: completed ? 100 : data.startedSteps.includes(lessonKey) ? 25 : 0, completed_at: completed ? now : null, updated_at: now }));
}
