import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getKnownEduzzPurchaseStatus,
  inviteEduzzBuyer,
  recordEduzzEntitlement,
} from "@/lib/server/eduzz-entitlements";

const identifierSchema = z.union([z.string(), z.number()]).transform(String);
const deliverySchema = z.object({
  type: z.enum(["create", "remove"]),
  fields: z.object({
    edz_fat_cod: identifierSchema,
    edz_cnt_cod: identifierSchema,
    edz_cli_email: z.string().trim().toLowerCase().pipe(z.email()).optional(),
    edz_cli_origin_secret: z.string().min(1),
    edz_fat_dtcadastro: z.string().optional(),
    edz_fat_status: identifierSchema.optional(),
    edz_produtor_cod: identifierSchema.optional(),
  }).passthrough(),
}).passthrough();

export async function POST(request: Request) {
  const originKey = process.env.EDUZZ_ORIGIN_KEY;
  const configuredProductId = process.env.EDUZZ_PRODUCT_ID;
  if (!originKey || !configuredProductId) {
    return NextResponse.json({ error: "Entrega customizada não configurada." }, { status: 503 });
  }

  try {
    const payload = await readPayload(request);

    // Eduzz probes the URL before saving it, without sending a delivery operation.
    if (!hasDeliveryType(payload)) return NextResponse.json({ ready: true });

    const parsed = deliverySchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload de entrega inválido." }, { status: 422 });
    }

    const { type, fields } = parsed.data;
    // URL validation uses Eduzz fixture data for another product. Acknowledge it without changing access.
    if (fields.edz_cnt_cod !== configuredProductId) {
      return NextResponse.json({ received: true, ignored: true });
    }
    if (!secretsMatch(fields.edz_cli_origin_secret, originKey)) {
      console.warn("Eduzz custom delivery Origin Key mismatch", {
        producerId: fields.edz_produtor_cod,
        productId: fields.edz_cnt_cod,
      });
      return NextResponse.json({ error: "Origin Key inválida." }, { status: 401 });
    }

    const externalPurchaseId = `eduzz:${fields.edz_fat_cod}`;
    const knownStatus = await getKnownEduzzPurchaseStatus(externalPurchaseId);
    if (type === "create" && knownStatus && knownStatus !== "active") {
      return NextResponse.json({ received: true, ignored: true, reason: "access_already_revoked" });
    }

    const email = fields.edz_cli_email;
    if (type === "create" && !email) {
      return NextResponse.json({ error: "Entrega sem e-mail do comprador." }, { status: 422 });
    }

    const eventId = `custom:${type}:${fields.edz_fat_cod}:${fields.edz_cnt_cod}`;
    await recordEduzzEntitlement({
      eventId,
      eventType: `custom_delivery.${type}`,
      eventCreatedAt: getEventCreatedAt(type, fields.edz_fat_dtcadastro),
      externalPurchaseId,
      purchaseEmail: email,
      status: type === "create" ? "active" : getRemovalStatus(fields.edz_fat_status),
    });

    const invitation = type === "create" && email ? await inviteEduzzBuyer(email) : undefined;
    return NextResponse.json({ received: true, invitation });
  } catch (error) {
    console.error("Failed to process Eduzz custom delivery", error);
    return NextResponse.json({ error: "Falha ao processar a entrega." }, { status: 500 });
  }
}

function hasDeliveryType(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === "object" && payload !== null && "type" in payload;
}

async function readPayload(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("multipart/form-data")) {
    return normalizeFormEntries(await request.formData());
  }

  const rawBody = await request.text();
  if (!rawBody.trim()) return null;
  if (contentType.includes("application/json")) return JSON.parse(rawBody);
  return normalizeFormEntries(new URLSearchParams(rawBody));
}

function normalizeFormEntries(entries: FormData | URLSearchParams) {
  const payload: Record<string, unknown> = {};
  const fields: Record<string, string> = {};

  for (const [key, rawValue] of entries.entries()) {
    if (typeof rawValue !== "string") continue;
    const fieldMatch = key.match(/^fields(?:\[([^\]]+)\]|\.([\w]+))$/);
    if (fieldMatch) {
      fields[fieldMatch[1] ?? fieldMatch[2]] = rawValue;
    } else if (key.startsWith("edz_")) {
      fields[key] = rawValue;
    } else if (key === "fields") {
      try {
        const parsedFields = JSON.parse(rawValue);
        if (typeof parsedFields === "object" && parsedFields !== null) Object.assign(fields, parsedFields);
      } catch {
        // Keep parsing the remaining form fields; schema validation will reject incomplete deliveries.
      }
    } else {
      payload[key] = rawValue;
    }
  }

  if (Object.keys(fields).length > 0) payload.fields = fields;
  return payload;
}

function secretsMatch(received: string, expected: string) {
  const receivedHash = createHash("sha256").update(received.trim()).digest();
  const expectedHash = createHash("sha256").update(expected.trim()).digest();
  return timingSafeEqual(receivedHash, expectedHash);
}

function getEventCreatedAt(type: "create" | "remove", invoiceCreatedAt?: string) {
  if (type === "create" && invoiceCreatedAt) {
    const timestamp = Date.parse(invoiceCreatedAt);
    if (!Number.isNaN(timestamp)) return new Date(timestamp).toISOString();
  }
  return new Date().toISOString();
}

function getRemovalStatus(invoiceStatus?: string) {
  if (invoiceStatus === "7") return "refunded" as const;
  if (invoiceStatus === "4") return "canceled" as const;
  return "blocked" as const;
}
