import { NextResponse } from "next/server";
import { startEduzzCheckout } from "@/lib/server/eduzz-checkout";

export async function POST(request: Request) {
  const fallbackUrl = process.env.NEXT_PUBLIC_EDUZZ_CHECKOUT_URL;
  if (process.env.EDUZZ_SUN_CHECKOUT_ENABLED !== "true") {
    if (fallbackUrl) return NextResponse.redirect(fallbackUrl, 303);
    return NextResponse.json({ error: "Checkout Sun indisponível." }, { status: 503 });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL não foi configurada.");
    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && new URL(requestOrigin).origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
    }
    return NextResponse.redirect(await startEduzzCheckout(appUrl), 303);
  } catch (error) {
    console.error("Failed to create Eduzz cart", error);
    if (fallbackUrl) return NextResponse.redirect(fallbackUrl, 303);
    return NextResponse.json({ error: "Não foi possível iniciar o checkout da Eduzz." }, { status: 500 });
  }
}
