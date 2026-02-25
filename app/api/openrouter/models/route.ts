import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProviderId = "openrouter";
type OpenRouterModel = {
  id?: string;
  name?: string;
  context_length?: number;
  top_provider?: {
    context_length?: number;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
  };
};

type OpenRouterModelsPayload = {
  data?: OpenRouterModel[];
};

const PROVIDER_DEFAULT_BASE_URL: Record<ProviderId, string> = {
  openrouter: "https://openrouter.ai/api/v1",
};
const MODELS_TIMEOUT_MS = 40000;

function providerLabel(_provider: ProviderId) {
  return "OpenRouter";
}

function normalizeProvider(raw: string | null): ProviderId {
  if (raw === "openrouter") return raw;
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
  return normalized;
}

function readOpenRouterError(payload: {
  error?: { message?: string } | string;
  detail?: string | { message?: string } | Array<unknown>;
  message?: string;
}) {
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
    return "Provider rejected this models request. Check your API key and try Refresh.";
  }
  return normalized;
}

function buildModelEndpoints(baseUrl: string) {
  return [`${baseUrl}/models`];
}

export async function GET(request: Request) {
  try {
    const provider = normalizeProvider(request.headers.get("x-provider"));
    const apiKey = normalizeApiKey(request.headers.get("x-provider-key") || request.headers.get("x-openrouter-key"));
    const baseUrl = cleanBaseUrl(request.headers.get("x-provider-base-url"), provider);
    const modelsPublic = provider === "openrouter";
    const requiresKey = !modelsPublic;
    if (requiresKey && !apiKey) {
      return NextResponse.json({ error: "Missing API key." }, { status: 400 });
    }
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (apiKey && !modelsPublic) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const endpoints = buildModelEndpoints(baseUrl);
    let response: Response | null = null;
    let payload: OpenRouterModelsPayload & {
      error?: { message?: string } | string;
      detail?: string | { message?: string } | Array<unknown>;
      message?: string;
    } = {};

    console.log(`[models] provider=${provider} baseUrl=${baseUrl} hasKey=${!!apiKey} sendAuth=${!!apiKey && !modelsPublic}`);

    for (const endpoint of endpoints) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MODELS_TIMEOUT_MS);
      try {
        response = await fetch(endpoint, {
          method: "GET",
          headers,
          cache: "no-store",
          signal: controller.signal,
        });
        console.log(`[models] endpoint=${endpoint} status=${response.status}`);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          console.log(`[models] TIMEOUT fetching ${endpoint}`);
          return NextResponse.json(
            { error: `${providerLabel(provider)} timed out while loading models.` },
            { status: 504 },
          );
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
      payload = (await response.json().catch(() => ({}))) as typeof payload;
      if (response.ok) break;
      if (response.status !== 404) break;
    }

    if (!response || !response.ok) {
      const status = response?.status ?? 500;
      const errorMsg =
        readOpenRouterError(payload as Parameters<typeof readOpenRouterError>[0]) ||
        `${providerLabel(provider)} error ${status}`;
      console.log(`[models] ERROR: ${errorMsg} (status ${status})`);
      return NextResponse.json({ error: errorMsg }, { status });
    }

    const models = (payload.data ?? [])
      .filter((item): item is OpenRouterModel & { id: string } => typeof item.id === "string" && item.id.length > 0)
      .map((item) => ({
        id: item.id,
        name: item.name || item.id,
        contextLength: item.top_provider?.context_length ?? item.context_length ?? null,
        pricing: {
          prompt: item.pricing?.prompt ?? null,
          completion: item.pricing?.completion ?? null,
        },
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`[models] OK: ${models.length} OpenRouter models returned`);
    return NextResponse.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch models.";
    console.log(`[models] EXCEPTION: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
