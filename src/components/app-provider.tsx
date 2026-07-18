"use client";

import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getPromptCurrentStep, isLegacyTicket } from "@/lib/prompt-base";
import { normalizeLegacyProductTerms } from "@/lib/product-copy";
import { EMPTY_APP_DATA, type AppData } from "@/lib/types";
import { generateXrayText } from "@/lib/xray";

const STORAGE_PREFIX = "central-muv-v3";
type ContextValue = { data: AppData; ready: boolean; update: (recipe: (current: AppData) => AppData) => void; logout: () => void; reset: () => void };
const AppContext = createContext<ContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const pathname = usePathname();
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA);
  const [ready, setReady] = useState(false);
  const hydratedIdentity = useRef<string | null>(null);
  const remoteAttempted = useRef(false);
  const remoteReady = useRef(false);
  const storageKey = userId ? `${STORAGE_PREFIX}:${userId}` : null;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  useEffect(() => {
    if (!isLoaded) return;
    const identity = userId ?? "signed-out";
    if (hydratedIdentity.current === identity) return;
    hydratedIdentity.current = identity;
    remoteAttempted.current = false;
    remoteReady.current = false;
    queueMicrotask(() => {
      let initial = EMPTY_APP_DATA;
      if (storageKey) {
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) initial = normalizePersistedContent(JSON.parse(stored) as AppData);
        } catch {
          localStorage.removeItem(storageKey);
        }
      }
      setData({ ...initial, authenticated: Boolean(isSignedIn), user: clerkUser(initial, user) });
      setReady(true);
    });
  }, [isLoaded, isSignedIn, storageKey, user, userId]);

  useEffect(() => {
    if (!ready || !isLoaded) return;
    queueMicrotask(() => setData((current) => ({ ...current, authenticated: Boolean(isSignedIn), user: clerkUser(current, user) })));
  }, [isLoaded, isSignedIn, ready, user]);

  useEffect(() => {
    if (ready && storageKey) localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data, ready, storageKey]);

  useEffect(() => {
    if (!ready || !isSignedIn || remoteAttempted.current) return;
    remoteAttempted.current = true;
    void fetch("/api/student/state").then(async (response) => {
      if (!response.ok) throw new Error("Supabase indisponível");
      const payload = await response.json() as { data: AppData | null };
      remoteReady.current = true;
      if (payload.data) setData({ ...payload.data, authenticated: true, user: clerkUser(payload.data, user) });
      else await fetch("/api/student/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    }).catch(() => {
      remoteReady.current = false;
    });
  }, [data, isSignedIn, ready, user]);

  useEffect(() => {
    if (!ready || !isSignedIn || !remoteReady.current) return;
    const timeout = window.setTimeout(() => {
      void fetch("/api/student/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [data, isSignedIn, ready]);

  const update = (recipe: (current: AppData) => AppData) => setData((current) => ({ ...recipe(current), lastActivityAt: new Date().toISOString() }));
  const reset = () => {
    remoteAttempted.current = false;
    remoteReady.current = false;
    if (storageKey) localStorage.removeItem(storageKey);
    setData({ ...EMPTY_APP_DATA, authenticated: Boolean(isSignedIn), user: clerkUser(EMPTY_APP_DATA, user) });
  };

  return <AppContext.Provider value={{ data, ready, update, logout: () => { void signOut({ redirectUrl: "/" }); }, reset }}>{children}</AppContext.Provider>;
}

function normalizePersistedContent(data: AppData): AppData {
  const outputs = Object.fromEntries(Object.entries(data.outputs).map(([key, output]) => {
    if (!output) return [key, output];
    if (key === "step_1_diagnosis" && !/prioridade comercial/i.test(output.content)) return [key, { ...output, content: "", completed: false }];
    return [key, { ...output, title: normalizeLegacyProductTerms(output.title), content: normalizeLegacyProductTerms(output.content) }];
  })) as AppData["outputs"];
  const legacyTicket = isLegacyTicket(data.promptBase.answers.ticket);
  return {
    ...data,
    promptBase: { ...data.promptBase, completed: data.promptBase.completed && !legacyTicket, currentStep: getPromptCurrentStep(data.promptBase.answers), generatedText: normalizeLegacyProductTerms(data.promptBase.generatedText) },
    xray: { ...data.xray, generatedText: data.xray.completed ? generateXrayText(data.xray.answers) : normalizeLegacyProductTerms(data.xray.generatedText) },
    outputs,
  };
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

function clerkUser(current: AppData, user: ReturnType<typeof useUser>["user"]): AppData["user"] {
  if (!user) return current.user;
  const email = user.primaryEmailAddress?.emailAddress ?? current.user.email;
  return {
    name: user.fullName || user.firstName || current.user.name,
    email,
    purchaseEmail: current.user.purchaseEmail || email,
    avatarUrl: user.imageUrl,
  };
}
