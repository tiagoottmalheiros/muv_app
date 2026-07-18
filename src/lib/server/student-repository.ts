import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { isFinalStepCompleted } from "@/lib/journey";
import { getPromptCurrentStep, isLegacyTicket, isValidExactTicket } from "@/lib/prompt-base";
import { normalizeLegacyProductTerms } from "@/lib/product-copy";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { EMPTY_APP_DATA, type AppData, type OutputKey } from "@/lib/types";
import { generateXrayText } from "@/lib/xray";

export class StudentAccessError extends Error {}
export class StudentStateResetError extends Error {}

export async function hasAuthenticatedStudentAccess() {
  const profile = await getOrCreateAuthenticatedProfile();
  const entitlement = await resolveStudentEntitlement(profile);
  return entitlement?.status === "active" && (!entitlement.expires_at || new Date(entitlement.expires_at) > new Date());
}

export async function assertAuthenticatedStudentAccess() {
  if (!await hasAuthenticatedStudentAccess()) throw new StudentAccessError("Não encontramos um acesso ativo para o e-mail desta conta.");
}

export async function loadDevelopmentStudentState(): Promise<AppData | null> {
  const supabase = createSupabaseAdminClient();
  const profile = await getOrCreateAuthenticatedProfile();

  const [promptBase, xray, progress, outputs, immersion, entitlement] = await Promise.all([supabase.from("prompt_base_submissions").select("*").eq("profile_id", profile.id).maybeSingle(), supabase.from("funnel_xray_submissions").select("*").eq("profile_id", profile.id).maybeSingle(), supabase.from("lesson_progress").select("*").eq("profile_id", profile.id), supabase.from("student_outputs").select("*").eq("profile_id", profile.id), supabase.from("immersion_registrations").select("*").eq("profile_id", profile.id).maybeSingle(), resolveStudentEntitlement(profile)]);

  const error = [promptBase.error, xray.error, progress.error, outputs.error, immersion.error].find(Boolean);
  if (error) throw error;
  const outputMap = Object.fromEntries(
    (outputs.data ?? []).map((output) => {
      const legacyPlan = output.output_key === "step_1_diagnosis" && Number(output.version ?? 1) < 2;
      return [output.output_key, {
        key: output.output_key as OutputKey,
        title: normalizeLegacyProductTerms(output.title ?? "Entregável MUV"),
        content: legacyPlan ? "" : normalizeLegacyProductTerms(output.content ?? ""),
        completed: output.status === "completed" && !legacyPlan,
        updatedAt: output.updated_at,
      }];
    }),
  );
  const progressMap = new Map((progress.data ?? []).map((item) => [item.lesson_key, item]));
  const promptAnswers = { ...(promptBase.data?.answers ?? EMPTY_APP_DATA.promptBase.answers), name: profile.name ?? "Aluno MUV", email: profile.primary_email ?? "" };
  const legacyTicket = isLegacyTicket(String(promptAnswers.ticket || ""));
  const xrayAnswers = xray.data?.answers ?? [];

  return {
    ...EMPTY_APP_DATA,
    authenticated: true,
    entitlement: entitlement?.status === "active" && (!entitlement.expires_at || new Date(entitlement.expires_at) > new Date()) ? "active" : entitlement?.status === "blocked" ? "blocked" : "pending",
    user: {
      name: profile.name ?? "Aluno MUV",
      email: profile.primary_email ?? "aluno@muv.com.br",
      purchaseEmail: profile.purchase_email ?? profile.primary_email ?? "",
      avatarUrl: profile.avatar_url ?? undefined,
    },
    promptBase: {
      answers: promptAnswers,
      generatedText: normalizeLegacyProductTerms(promptBase.data?.generated_text ?? ""),
      completed: promptBase.data?.status === "completed" && !legacyTicket,
      currentStep: getPromptCurrentStep(promptAnswers),
      updatedAt: promptBase.data?.updated_at,
    },
    xray: {
      answers: xrayAnswers,
      score: Number(xray.data?.score ?? 0),
      classification: xray.data?.classification ?? "",
      leakLevel: xray.data?.leak_level ?? "",
      bottleneck: xray.data?.main_bottleneck ?? "mensagem",
      generatedText: xray.data?.status === "completed" ? generateXrayText(xray.data?.answers ?? []) : normalizeLegacyProductTerms(xray.data?.generated_text ?? ""),
      completed: xray.data?.status === "completed",
      currentStep: xrayAnswers.length ? Math.min(xrayAnswers.length + 1, 12) : 0,
      updatedAt: xray.data?.updated_at,
    },
    outputs: outputMap,
    startedSteps: (progress.data ?? []).filter((item) => item.status !== "not_started").map((item) => item.lesson_key),
    comeceAquiCompleted: progressMap.get("comece-aqui")?.status === "completed",
    kitReviewed: progressMap.get("kit-final")?.status === "completed",
    immersion: {
      viewed: Boolean(immersion.data?.viewed_at),
      clicked: Boolean(immersion.data?.clicked_at),
      confirmed: immersion.data?.status === "confirmed",
      confirmedAt: immersion.data?.confirmed_at ?? undefined,
    },
    lastRoute: profile.last_route ?? "/central/comece-aqui",
    lastActivityAt: profile.last_access_at ?? profile.updated_at,
    journeyResetAt: profile.journey_reset_at ?? EMPTY_APP_DATA.journeyResetAt,
  } as AppData;
}

export async function saveDevelopmentStudentState(data: AppData) {
  const supabase = createSupabaseAdminClient();
  const profile = await getOrCreateAuthenticatedProfile();
  if (new Date(data.journeyResetAt || 0).getTime() < new Date(profile.journey_reset_at || 0).getTime()) throw new StudentStateResetError("A jornada foi zerada por um administrador.");
  if (data.promptBase.completed && !isValidExactTicket(data.promptBase.answers.ticket)) throw new Error("O ticket médio deve ser um valor exato maior que zero.");
  const now = new Date().toISOString();

  const operations = [
    supabase
      .from("profiles")
      .update({
        last_access_at: now,
        updated_at: now,
        last_route: data.lastRoute,
      })
      .eq("id", profile.id)
      .eq("journey_reset_at", data.journeyResetAt),
    supabase.from("prompt_base_submissions").upsert(
      {
        profile_id: profile.id,
        answers: { ...data.promptBase.answers, name: profile.name ?? "Aluno MUV", email: profile.primary_email ?? "" },
        generated_text: data.promptBase.generatedText,
        status: data.promptBase.completed ? "completed" : "draft",
        completed_at: data.promptBase.completed ? now : null,
        journey_reset_at: data.journeyResetAt,
        updated_at: now,
      },
      { onConflict: "profile_id" },
    ),
    supabase.from("funnel_xray_submissions").upsert(
      {
        profile_id: profile.id,
        answers: data.xray.answers,
        score: data.xray.score,
        classification: data.xray.classification,
        leak_level: data.xray.leakLevel,
        main_bottleneck: data.xray.bottleneck,
        generated_text: data.xray.generatedText,
        status: data.xray.completed ? "completed" : "draft",
        completed_at: data.xray.completed ? now : null,
        journey_reset_at: data.journeyResetAt,
        updated_at: now,
      },
      { onConflict: "profile_id" },
    ),
    supabase.from("immersion_registrations").upsert(
      {
        profile_id: profile.id,
        status: data.immersion.confirmed ? "confirmed" : "pending",
        viewed_at: data.immersion.viewed ? now : null,
        clicked_at: data.immersion.clicked ? now : null,
        confirmed_at: data.immersion.confirmedAt ?? null,
        journey_reset_at: data.journeyResetAt,
        updated_at: now,
      },
      { onConflict: "profile_id" },
    ),
  ];
  const results = await Promise.all(operations);
  const error = results.find((result) => result.error)?.error;
  if (error) throwStudentRepositoryError(error);

  const progressRows = buildProgressRows(profile.id, data, now);
  const progressResult = await supabase.from("lesson_progress").upsert(progressRows, { onConflict: "profile_id,lesson_key" });
  if (progressResult.error) throwStudentRepositoryError(progressResult.error);

  const outputRows = Object.values(data.outputs)
    .filter(Boolean)
    .map((output) => ({
      profile_id: profile.id,
      output_key: output!.key,
      title: output!.title,
      content: output!.content,
      status: output!.completed ? "completed" : "draft",
      version: output!.key === "step_1_diagnosis" ? 2 : 1,
      journey_reset_at: data.journeyResetAt,
      updated_at: now,
    }));
  if (outputRows.length) {
    const outputResult = await supabase.from("student_outputs").upsert(outputRows, { onConflict: "profile_id,output_key" });
    if (outputResult.error) throwStudentRepositoryError(outputResult.error);
  }
}

export async function recordDevelopmentGeneration(input: { outputKey: string; model: string; responseId?: string; status: "completed" | "failed"; usedKnowledgeBase?: boolean; inputTokens?: number; outputTokens?: number; durationMs?: number; errorMessage?: string }) {
  const supabase = createSupabaseAdminClient();
  const profile = await getOrCreateAuthenticatedProfile();
  const result = await supabase.from("ai_generations").insert({
    profile_id: profile.id,
    output_key: input.outputKey,
    model: input.model,
    response_id: input.responseId,
    status: input.status,
    used_knowledge_base: input.usedKnowledgeBase ?? false,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    duration_ms: input.durationMs,
    error_message: input.errorMessage,
    journey_reset_at: profile.journey_reset_at ?? EMPTY_APP_DATA.journeyResetAt,
  });
  if (result.error) throw result.error;
}

export async function resetAuthenticatedStudentJourney() {
  const profile = await getOrCreateAuthenticatedProfile();
  await resetStudentJourneyByProfileId(profile.id);
}

export async function resetStudentJourneyByProfileId(profileId: string) {
  const supabase = createSupabaseAdminClient();
  const result = await supabase.rpc("reset_student_journey", { target_profile_id: profileId });
  if (result.error) throw result.error;
}

async function getOrCreateAuthenticatedProfile() {
  const [{ userId }, clerkUser] = await Promise.all([auth(), currentUser()]);
  if (!userId) throw new Error("Sessão Clerk não autenticada.");
  const supabase = createSupabaseAdminClient();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  const name = clerkUser?.fullName || clerkUser?.firstName || undefined;
  const result = await supabase
    .from("profiles")
    .upsert(
      {
        clerk_user_id: userId,
        name,
        primary_email: email,
        avatar_url: clerkUser?.imageUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_user_id" },
    )
    .select("*")
    .single();
  if (result.error) throw result.error;
  return result.data;
}

async function resolveStudentEntitlement(profile: { id: string; primary_email?: string | null }) {
  const supabase = createSupabaseAdminClient();
  const direct = await supabase.from("entitlements").select("*").eq("profile_id", profile.id).eq("product_code", "muv_starter").maybeSingle();
  if (direct.error) throw direct.error;
  if (direct.data) return direct.data;

  const email = profile.primary_email?.trim().toLowerCase();
  if (!email) return null;
  const matching = await supabase.from("entitlements").select("*").eq("product_code", "muv_starter").ilike("purchase_email", email).eq("status", "active").limit(1).maybeSingle();
  if (matching.error) throw matching.error;
  if (!matching.data) return null;

  const linked = await supabase.from("entitlements").update({ profile_id: profile.id, updated_at: new Date().toISOString() }).eq("id", matching.data.id).select("*").single();
  if (linked.error) throw linked.error;
  const profileUpdate = await supabase.from("profiles").update({ purchase_email: matching.data.purchase_email, updated_at: new Date().toISOString() }).eq("id", profile.id);
  if (profileUpdate.error) throw profileUpdate.error;
  return linked.data;
}

function buildProgressRows(profileId: string, data: AppData, now: string) {
  const entries = [
    ["comece-aqui", data.comeceAquiCompleted],
    ["prompt-base", data.promptBase.completed],
    ["raio-x", data.xray.completed],
    ["step_1_diagnosis", data.outputs.step_1_diagnosis?.completed],
    ["step_2_buyer_map", data.outputs.step_2_buyer_map?.completed],
    ["step_3_filter_message", data.outputs.step_3_filter_message?.completed],
    ["step_4_triage_script", data.outputs.step_4_triage_script?.completed],
    ["kit-final", isFinalStepCompleted(data)],
  ] as const;
  return entries.map(([lessonKey, completed]) => ({
    profile_id: profileId,
    lesson_key: lessonKey,
    status: completed ? "completed" : data.startedSteps.includes(lessonKey) ? "in_progress" : "not_started",
    percent: completed ? 100 : data.startedSteps.includes(lessonKey) ? 25 : 0,
    completed_at: completed ? now : null,
    journey_reset_at: data.journeyResetAt,
    updated_at: now,
  }));
}

function throwStudentRepositoryError(error: { code?: string; message?: string }): never {
  if (error.code === "40001" || error.message?.includes("stale student journey state")) throw new StudentStateResetError("A jornada foi zerada por um administrador.");
  throw error;
}
