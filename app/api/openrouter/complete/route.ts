import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProviderId = "openrouter" | "infermatic" | "lmstudio";
type CompletionRequest = {
  provider?: ProviderId;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  prompt?: string;
  system?: string;
  maxTokens?: number;
  jsonMode?: boolean;
  temperature?: number;
};

type OpenRouterErrorPayload = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; code?: number | string } | string;
  detail?: string | { message?: string } | Array<unknown>;
  message?: string | { content?: string };
};

const PROVIDER_DEFAULT_BASE_URL: Record<ProviderId, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  infermatic: "https://api.totalgpt.ai/v1",
  lmstudio: "http://127.0.0.1:1234/v1",
};

function normalizeProvider(raw: unknown): ProviderId {
  if (raw === "openrouter" || raw === "infermatic" || raw === "lmstudio") return raw;
  return "openrouter";
}

function normalizeApiKey(raw: unknown) {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  return trimmed.replace(/^Bearer\s+/i, "").trim();
}

function cleanBaseUrl(raw: unknown, provider: ProviderId) {
  const fallback = PROVIDER_DEFAULT_BASE_URL[provider];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return fallback;
  const normalized = value
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/models(?:\?.*)?$/i, "");
  if (provider === "openrouter") {
    if (normalized.endsWith("/api/v1") || normalized.endsWith("/v1")) return normalized;
    return `${normalized}/api/v1`;
  }
  if (provider === "infermatic") {
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

function extractUpstreamError(payload: OpenRouterErrorPayload) {
  const detailMessage =
    typeof payload.detail === "string"
      ? payload.detail
      : payload.detail && typeof payload.detail === "object" && "message" in payload.detail
        ? (payload.detail as { message?: string }).message
        : Array.isArray(payload.detail)
          ? payload.detail.map((item) => String(item)).join("; ")
          : undefined;
  const messageText =
    typeof payload.message === "string"
      ? payload.message
      : payload.message && typeof payload.message === "object" && "content" in payload.message
        ? payload.message.content
        : undefined;
  return (
    (typeof payload.error === "string" ? payload.error : payload.error?.message) ??
    detailMessage ??
    messageText ??
    ""
  ).trim();
}

function normalizeProviderError(message: string, status: number, model: string, provider: ProviderId) {
  const providerLabel = provider === "openrouter" ? "OpenRouter" : provider === "infermatic" ? "Infermatic" : "LM Studio";
  if (message === '{"detail":"Bad Request"}' || message.toLowerCase() === "bad request") {
    return `${providerLabel} rejected this request for model "${model}". Choose a different model or shorten the request.`;
  }
  if (status === 401) return `${providerLabel} rejected your API key. Re-save your key in Settings.`;
  if (status === 402) return `${providerLabel} credits or billing are required for this model.`;
  if (status === 429) return `${providerLabel} rate limit reached. Wait a moment, then try again.`;
  return message || `${providerLabel} error ${status}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CompletionRequest;
    const provider = normalizeProvider(body.provider);
    const apiKey = normalizeApiKey(body.apiKey);
    const baseUrl = cleanBaseUrl(body.baseUrl, provider);
    const model = body.model?.trim();
    const prompt = body.prompt?.trim();
    const system = typeof body.system === "string" ? body.system.trim() : "";
    const maxTokens = body.maxTokens && Number.isFinite(body.maxTokens) ? body.maxTokens : 600;
    const jsonMode = body.jsonMode === true;
    const temperature =
      typeof body.temperature === "number" && Number.isFinite(body.temperature)
        ? Math.max(0, Math.min(2, body.temperature))
        : undefined;
    const requiresKey = provider === "openrouter" || provider === "infermatic";

    if (requiresKey && !apiKey) {
      return NextResponse.json({ error: "Missing API key." }, { status: 400 });
    }
    if (!model) {
      return NextResponse.json({ error: "Model is required." }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const endpoint = `${baseUrl}/chat/completions`;

    const messages: Array<{ role: string; content: string }> = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages,
        ...(temperature != null ? { temperature } : {}),
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as OpenRouterErrorPayload;

    if (!response.ok) {
      const upstream = extractUpstreamError(payload);
      const errorMsg = normalizeProviderError(upstream, response.status, model, provider);
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    const text = payload.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
