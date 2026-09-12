import "server-only";

type EduzzToken = { access_token: string; expires_in?: number };

type EduzzCart = {
  id: string;
  key: string;
  orderId: string;
  paymentUrl: string;
  postbackUrl?: string;
  returnUrl?: string;
};

export type EduzzSale = {
  id: string;
  status: string;
  paidAt?: string | null;
  total?: { currency?: string; value?: number };
  buyer?: { email?: string };
  product?: { id?: string };
  items?: Array<{ productId?: string }>;
};

let cachedToken: { value: string; expiresAt: number } | undefined;
let tokenRequest: Promise<string> | undefined;

export async function createEduzzCart(input: { orderId: string; postbackUrl: string; returnUrl: string }) {
  return eduzzRequest<EduzzCart>("/sun/v1/cart", {
    method: "POST",
    body: JSON.stringify({
      orderId: input.orderId,
      postbackUrl: input.postbackUrl,
      returnUrl: input.returnUrl,
      items: [{
        productId: getEduzzProductId(),
        description: "MUV Starter - Central de Comando Anti-Curiosos",
        price: { value: 29.9, currency: "BRL" },
        quantity: 1,
      }],
    }),
  });
}

export async function getEduzzSale(saleId: string) {
  return eduzzRequest<EduzzSale>(`/myeduzz/v1/sales/${encodeURIComponent(saleId)}`);
}

export function getEduzzProductId() {
  const productId = process.env.EDUZZ_PRODUCT_ID;
  if (!productId) throw new Error("EDUZZ_PRODUCT_ID não foi configurado.");
  return productId;
}

async function eduzzRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`https://api.eduzz.com${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: "no-store",
  });

  if (response.status === 401 && retry) {
    cachedToken = undefined;
    return eduzzRequest<T>(path, init, false);
  }
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Eduzz API ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response.json() as Promise<T>;
}

async function getAccessToken() {
  const configuredToken = process.env.EDUZZ_ACCESS_TOKEN
    ?.trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^['\"]|['\"]$/g, "")
    .trim();
  if (configuredToken) return configuredToken;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  if (tokenRequest) return tokenRequest;
  tokenRequest = requestAccessToken();
  try {
    return await tokenRequest;
  } finally {
    tokenRequest = undefined;
  }
}

async function requestAccessToken() {
  const clientId = process.env.EDUZZ_CLIENT_ID;
  const clientSecret = process.env.EDUZZ_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("As credenciais OAuth da Eduzz não foram configuradas.");

  const response = await fetch("https://accounts-api.eduzz.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha na autenticação Eduzz (${response.status}): ${detail.slice(0, 300)}`);
  }
  const token = await response.json() as EduzzToken;
  if (!token.access_token) throw new Error("A Eduzz não retornou um access token.");

  const lifetime = token.expires_in && token.expires_in > 120 ? (token.expires_in - 60) * 1000 : 24 * 60 * 60 * 1000;
  cachedToken = { value: token.access_token, expiresAt: Date.now() + lifetime };
  return token.access_token;
}
