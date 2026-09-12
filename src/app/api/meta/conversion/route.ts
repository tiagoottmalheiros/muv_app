import { NextResponse } from "next/server";

const META_PIXEL_ID = "915934768257865";
const ALLOWED_EVENTS = new Set(["PageView", "InitiateCheckout"]);

export async function POST(request: Request) {
  const token = process.env.META_CONVERSIONS_API_TOKEN;
  if (!token) return NextResponse.json({ error: "Conversions API indisponivel." }, { status: 503 });

  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem invalida." }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!ALLOWED_EVENTS.has(body.eventName) || typeof body.eventId !== "string" || typeof body.eventSourceUrl !== "string") {
      return NextResponse.json({ error: "Evento invalido." }, { status: 400 });
    }

    const pageUrl = new URL(body.eventSourceUrl);
    if (!/^(www\.)?appmuv\.com$/.test(pageUrl.hostname)) {
      return NextResponse.json({ error: "Pagina invalida." }, { status: 400 });
    }

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const userAgent = request.headers.get("user-agent");
    const response = await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [{
          event_name: body.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: body.eventId.slice(0, 100),
          event_source_url: pageUrl.toString(),
          action_source: "website",
          user_data: {
            client_ip_address: clientIp,
            client_user_agent: userAgent,
            fbp: typeof body.fbp === "string" ? body.fbp.slice(0, 200) : undefined,
            fbc: typeof body.fbc === "string" ? body.fbc.slice(0, 200) : undefined,
          },
        }],
      }),
    });

    if (!response.ok) {
      console.error("Meta Conversions API rejected event", response.status);
      return NextResponse.json({ error: "Evento nao enviado." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Meta Conversions API request failed", error);
    return NextResponse.json({ error: "Evento nao enviado." }, { status: 500 });
  }
}
