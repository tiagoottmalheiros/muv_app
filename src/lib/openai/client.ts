import "server-only";

import OpenAI from "openai";

let client: OpenAI | undefined;

export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não foi configurada.");
  client ??= new OpenAI({ apiKey });
  return client;
}
