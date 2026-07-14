import { redirect } from "next/navigation";
import { PrivateShell } from "@/components/shell";
import { hasAuthenticatedStudentAccess } from "@/lib/server/student-repository";

export default async function CentralLayout({ children }: { children: React.ReactNode }) {
  if (!await hasAuthenticatedStudentAccess()) redirect("/acesso-nao-encontrado");
  return <PrivateShell>{children}</PrivateShell>;
}
