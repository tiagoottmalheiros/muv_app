"use client";

import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { EMPTY_APP_DATA, type AppData } from "@/lib/types";

const STORAGE_PREFIX = "central-muv-v3";
type ContextValue = { data: AppData; ready: boolean; update: (recipe: (current: AppData) => AppData) => void; logout: () => void; reset: () => void };
const AppContext = createContext<ContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA);
  const [ready, setReady] = useState(false);
  const hydratedIdentity = useRef<string | null>(null);
  const remoteAttempted = useRef(false);
  const remoteReady = useRef(false);
  const storageKey = userId ? `${STORAGE_PREFIX}:${userId}` : null;

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
          if (stored) initial = JSON.parse(stored) as AppData;
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
