import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Force long-lived connections for slow model providers
export const maxDuration = 900; // 15 minutes for self-hosted/slow providers

type ProviderId = "openrouter" | "arli" | "lmstudio";
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
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  error?: { message?: string; code?: number | string } | string;
  detail?: string | { message?: string } | Array<unknown>;
  message?: string | { content?: string };
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

const PROVIDER_DEFAULT_BASE_URL: Record<ProviderId, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  arli: "https://api.arliai.com/v1",
  lmstudio: "http://127.0.0.1:1234/v1",
};
const PROVIDER_TIMEOUT_MS: Record<ProviderId, number> = {
  openrouter: 300000,
  arli: 300000,
  lmstudio: 300000,
};

function normalizeProvider(raw: unknown): ProviderId {
  if (raw === "openrouter" || raw === "arli" || raw === "lmstudio") return raw;
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
  const providerLabel =
    provider === "openrouter" ? "OpenRouter" : provider === "arli" ? "Arli AI" : "LM Studio";
  if (message === '{"detail":"Bad Request"}' || message.toLowerCase() === "bad request") {
    return `${providerLabel} rejected this request for model "${model}". Choose a different model or shorten the request.`;
  }
  if (status === 401) return `${providerLabel} rejected your API key. Re-save your key in Settings.`;
  if (status === 402) return `${providerLabel} credits or billing are required for this model.`;
  if (status === 429) return `${providerLabel} rate limit reached. Wait a moment, then try again.`;
  if (/Model Group.*Fallbacks=None/i.test(message) || /model.*not found/i.test(message) || /does not exist/i.test(message)) {
    return `Model "${model}" is no longer available on ${providerLabel}. Open Settings and pick a different model.`;
  }
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
    const requiresKey = provider === "openrouter" || provider === "arli";

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

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    // OpenRouter-specific: skip moderation for speed, request no streaming
    if (provider === "openrouter") {
      headers["X-Title"] = "PilotWriter";
    }
    const requestBody: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages,
      stream: false, // Explicit: never stream — faster TTFT for non-streaming endpoints
    };
    if (temperature != null) requestBody.temperature = temperature;
    if (jsonMode) requestBody.response_format = { type: "json_object" };
    const controller = new AbortController();
    const timeoutMs = PROVIDER_TIMEOUT_MS[provider];
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return NextResponse.json(
          { error: `Provider timeout after ${Math.round(timeoutMs / 1000)}s. Try again or switch model.` },
          { status: 504 },
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    const payload = (await response.json().catch(() => ({}))) as OpenRouterErrorPayload;

    if (!response.ok) {
      const upstream = extractUpstreamError(payload);
      const errorMsg = normalizeProviderError(upstream, response.status, model, provider);
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    const text = payload.choices?.[0]?.message?.content ?? "";
    const finishReason = payload.choices?.[0]?.finish_reason ?? "";

    // Debug logging for empty responses
    if (!text) {
      console.error("[AI EMPTY RESPONSE]", JSON.stringify({
        model,
        provider,
        finishReason,
        choicesLength: payload.choices?.length ?? 0,
        hasMessage: !!payload.choices?.[0]?.message,
        contentType: typeof payload.choices?.[0]?.message?.content,
        payloadKeys: Object.keys(payload),
        usage: payload.usage,
        rawFirstChoice: JSON.stringify(payload.choices?.[0])?.slice(0, 500),
      }));
    }

    return NextResponse.json({ text, finishReason });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
