import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";

export class PromptAdminError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function isPromptAdmin() {
  const { userId } = await auth();
  if (!userId) return false;
  if (getBootstrapAdminIds().includes(userId)) return true;
  const user = await (await clerkClient()).users.getUser(userId);
  return user.privateMetadata.muvRole === "admin";
}

export function getBootstrapAdminIds() {
  return (process.env.ADMIN_CLERK_USER_IDS || "").split(",").map((id) => id.trim()).filter(Boolean);
}

export async function assertPromptAdmin() {
  const { userId } = await auth();
  if (!userId) throw new PromptAdminError("Faça login para acessar o Prompt Studio.", 401);
  if (!await isPromptAdmin()) throw new PromptAdminError("Seu usuário não possui acesso administrativo.", 403);
}
