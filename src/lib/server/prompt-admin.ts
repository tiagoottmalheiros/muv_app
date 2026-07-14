import "server-only";

import { auth } from "@clerk/nextjs/server";

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
  const adminIds = (process.env.ADMIN_CLERK_USER_IDS || "").split(",").map((id) => id.trim()).filter(Boolean);
  return adminIds.length ? adminIds.includes(userId) : process.env.NODE_ENV !== "production";
}

export async function assertPromptAdmin() {
  const { userId } = await auth();
  if (!userId) throw new PromptAdminError("Faça login para acessar o Prompt Studio.", 401);
  if (!await isPromptAdmin()) throw new PromptAdminError("Seu usuário não possui acesso administrativo.", 403);
}
