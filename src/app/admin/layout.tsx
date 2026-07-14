import { redirect } from "next/navigation";
import { isPromptAdmin } from "@/lib/server/prompt-admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!await isPromptAdmin()) redirect("/central");
  return children;
}
