"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { EMPTY_APP_DATA, type AppData } from "@/lib/types";
import { createDemoData } from "@/lib/demo";

const STORAGE_KEY = "central-muv-v2";
type ContextValue = { data: AppData; ready: boolean; update: (recipe: (current: AppData) => AppData) => void; loginDemo: () => void; logout: () => void; reset: () => void };
const AppContext = createContext<ContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) setData(JSON.parse(stored) as AppData); } catch { localStorage.removeItem(STORAGE_KEY); }
      setReady(true);
    });
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data, ready]);
  const update = (recipe: (current: AppData) => AppData) => setData((current) => ({ ...recipe(current), lastActivityAt: new Date().toISOString() }));
  return <AppContext.Provider value={{ data, ready, update, loginDemo: () => setData(createDemoData()), logout: () => setData((current) => ({ ...current, authenticated: false })), reset: () => { localStorage.removeItem(STORAGE_KEY); setData(EMPTY_APP_DATA); } }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}
