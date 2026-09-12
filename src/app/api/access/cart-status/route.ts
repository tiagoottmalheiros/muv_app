import { NextResponse } from "next/server";
import { z } from "zod";
import { getEduzzCheckoutActivation } from "@/lib/server/eduzz-checkout";
import { getMuvInvitationDestination } from "@/lib/server/eduzz-entitlements";

const tokenSchema = z.string().regex(/^[a-f0-9]{32}$/);

export async function GET(request: Request) {
  if (process.env.EDUZZ_SUN_CHECKOUT_ENABLED !== "true") {
    return NextResponse.json({ status: "unavailable" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const token = tokenSchema.safeParse(new URL(request.url).searchParams.get("token"));
  if (!token.success) return NextResponse.json({ status: "invalid" }, { headers: { "Cache-Control": "no-store" } });

  try {
    const activation = await getEduzzCheckoutActivation(token.data);
    if (activation.status !== "paid") {
      return NextResponse.json(activation, { headers: { "Cache-Control": "no-store" } });
    }
    const destination = await getMuvInvitationDestination(activation.email);
    return NextResponse.json(destination.status === "existing_user"
      ? { status: "existing_user", redirectUrl: "/sign-in" }
      : { status: "ready", redirectUrl: destination.url }, {
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    console.error("Failed to resolve Eduzz checkout activation", error);
    return NextResponse.json({ status: "error" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
