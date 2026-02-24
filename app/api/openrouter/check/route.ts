import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProviderId = "openrouter" | "arli" | "lmstudio";

const PROVIDER_DEFAULT_BASE_URL: Record<ProviderId, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  arli: "https://api.arliai.com/v1",
  lmstudio: "http://127.0.0.1:1234/v1",
};
const CHECK_TIMEOUT_MS = 15000;

function providerLabel(provider: ProviderId) {
  if (provider === "openrouter") return "OpenRouter";
  if (provider === "arli") return "Arli AI";
  return "LM Studio";
}

function normalizeProvider(raw: string | null): ProviderId {
  if (raw === "openrouter" || raw === "arli" || raw === "lmstudio") return raw;
  return "openrouter";
}

function normalizeApiKey(raw: string | null) {
  const trimmed = (raw ?? "").trim().replace(/^["']|["']$/g, "");
  return trimmed.replace(/^Bearer\s+/i, "").trim();
}

function cleanBaseUrl(raw: string | null, provider: ProviderId) {
  const fallback = PROVIDER_DEFAULT_BASE_URL[provider];
  const value = (raw ?? "").trim();
  if (!value) return fallback;
  const normalized = value.replace(/\/+$/, "");
  if (provider === "openrouter") {
    if (normalized.endsWith("/api/v1") || normalized.endsWith("/v1")) return normalized;
    return `${normalized}/api/v1`;
  }
  if (provider === "arli") {
    if (normalized.endsWith("/v1")) return normalized;
    return `${normalized}/v1`;
  }
  if (provider === "lmstudio") {
    const fixed = normalized.replace(/\/api\/v1$/i, "/v1").replace(/\/api$/i, "");
    if (fixed.endsWith("/v1")) return fixed;
    return `${fixed}/v1`;
  }
  return normalized;
}

function extractCheckError(payload: {
  error?: { message?: string } | string;
  detail?: string | { message?: string } | Array<unknown>;
  message?: string;
}, provider: ProviderId) {
  const detailMessage =
    typeof payload.detail === "string"
      ? payload.detail
      : payload.detail && typeof payload.detail === "object" && "message" in payload.detail
        ? (payload.detail as { message?: string }).message
        : Array.isArray(payload.detail)
          ? payload.detail.map((item) => String(item)).join("; ")
          : undefined;
  const raw =
    (typeof payload.error === "string" ? payload.error : payload.error?.message) ??
    detailMessage ??
    payload.message ??
    "";
  const normalized = raw.trim();
  if (normalized === '{"detail":"Bad Request"}' || normalized.toLowerCase() === "bad request") {
    return `${providerLabel(provider)} rejected the key check request. Re-save your key and try again.`;
  }
  return normalized;
}

function buildCheckEndpoints(_provider: ProviderId, baseUrl: string) {
  return [`${baseUrl}/models`];
}

export async function POST(request: Request) {
  try {
    const provider = normalizeProvider(request.headers.get("x-provider"));
    const apiKey = normalizeApiKey(request.headers.get("x-provider-key") || request.headers.get("x-openrouter-key"));
    const baseUrl = cleanBaseUrl(request.headers.get("x-provider-base-url"), provider);
    const requiresKey = provider === "openrouter" || provider === "arli";

    if (requiresKey && !apiKey) {
      return NextResponse.json({ ok: false, error: "Missing API key." }, { status: 400 });
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const endpoints = buildCheckEndpoints(provider, baseUrl);
    let lastStatus = 500;
    let lastPayload: {
      error?: { message?: string } | string;
      detail?: string | { message?: string } | Array<unknown>;
      message?: string;
    } = {};

    for (const endpoint of endpoints) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return NextResponse.json(
            { ok: false, error: `${providerLabel(provider)} timed out while checking connection.` },
            { status: 504 },
          );
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
      if (response.ok) {
        return NextResponse.json({ ok: true });
      }
      const payload = (await response.json().catch(() => ({}))) as typeof lastPayload;
      lastStatus = response.status;
      lastPayload = payload;
      if (response.status !== 404) break;
    }

    const message =
      extractCheckError(lastPayload, provider) ||
      `${providerLabel(provider)} responded with status ${lastStatus}`;
    return NextResponse.json({ ok: false, error: message }, { status: lastStatus });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach OpenRouter.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
