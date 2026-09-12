import { NextResponse } from "next/server";
import { z } from "zod";
import { processEduzzCartPostback } from "@/lib/server/eduzz-checkout";

const querySchema = z.object({ orderId: z.uuid(), token: z.string().min(32).max(100) });

export async function POST(request: Request) {
  const url = new URL(request.url);
  const query = querySchema.safeParse({ orderId: url.searchParams.get("orderId"), token: url.searchParams.get("token") });
  if (!query.success) return NextResponse.json({ error: "Postback inválido." }, { status: 400 });

  try {
    const result = await processEduzzCartPostback({ ...query.data, payload: await readPayload(request) });
    if (!result.accepted) return NextResponse.json({ error: "Postback não encontrado." }, { status: result.status });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Failed to process Eduzz cart postback", error);
    return NextResponse.json({ error: "Falha ao confirmar o pagamento." }, { status: 422 });
  }
}

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) return request.json();
  if (contentType.includes("multipart/form-data")) return Object.fromEntries((await request.formData()).entries());
  const body = await request.text();
  if (!body) return {};
  return Object.fromEntries(new URLSearchParams(body));
}
