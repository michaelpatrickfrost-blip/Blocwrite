import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 900;

/* ───────────────────── Types ───────────────────── */

type ProviderId = "openrouter" | "infermatic" | "lmstudio" | "huggingface";

interface CharacterInput {
  id: string;
  name: string;
  role?: string;
  logline?: string;
}

interface BatchRequest {
  provider: ProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  characters: CharacterInput[];
  storyContext: string;
}

interface ProfileData {
  appearance?: string;
  personality?: string;
  goals?: string;
  fears?: string;
  backstory?: string;
  accent?: string;
  speakingStyle?: string;
  reactionPattern?: string;
  voiceNotes?: string;
  secrets?: string;
  readerSecretHint?: string;
  tags?: string[];
}

interface RelationshipData {
  from: string;
  to: string;
  type: string;
  description?: string;
}

/* ───────────────────── AI Call ───────────────────── */

const PROVIDER_BASE: Record<ProviderId, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  infermatic: "https://api.totalgpt.ai/v1",
  lmstudio: "http://127.0.0.1:1234/v1",
  huggingface: "https://router.huggingface.co/v1",
};

function cleanBaseUrl(raw: string, provider: ProviderId): string {
  const value = raw.trim();
  if (!value) return PROVIDER_BASE[provider];
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
  if (provider === "huggingface") {
    if (normalized.endsWith("/v1")) return normalized;
    return `${normalized}/v1`;
  }
  return normalized;
}

async function callAi(
  provider: ProviderId,
  apiKey: string,
  baseUrl: string,
  model: string,
  system: string,
  prompt: string,
  maxTokens: number,
  temperature = 0.3,
): Promise<string> {
  const endpoint = `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  if (provider === "openrouter") headers["X-Title"] = "PilotWriter";

  const messages: Array<{ role: string; content: string }> = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages,
    stream: false,
    temperature,
  };
  if (provider === "infermatic") {
    body.stop = ["```", "\n\n\n\n"];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const errorMsg =
        typeof payload.error === "string"
          ? payload.error
          : typeof (payload.error as Record<string, unknown>)?.message === "string"
            ? (payload.error as Record<string, string>).message
            : `API error ${response.status}`;
      throw new Error(errorMsg);
    }

    const choices = payload.choices as Array<{ message?: { content?: string } }> | undefined;
    return choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ───────────────────── JSON Parsing ───────────────────── */

function stripThinkingBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function stripJsonFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function extractBalancedJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

function extractBalancedJsonArray(text: string): string | null {
  const start = text.indexOf("[");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "[") depth++;
    else if (ch === "]") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

function parseJson<T>(raw: string): T | null {
  const cleaned = stripThinkingBlocks(raw).trim();
  if (!cleaned) return null;

  const candidates: string[] = [];
  const push = (v: string) => { const t = v.trim(); if (t && !candidates.includes(t)) candidates.push(t); };

  push(cleaned);
  push(stripJsonFence(cleaned));
  const extracted = extractBalancedJson(cleaned);
  if (extracted) push(extracted);
  const arrExtracted = extractBalancedJsonArray(cleaned);
  if (arrExtracted) push(arrExtracted);
  const stripped = stripJsonFence(cleaned);
  const extracted2 = extractBalancedJson(stripped);
  if (extracted2) push(extracted2);

  for (const candidate of candidates) {
    try { return JSON.parse(candidate) as T; } catch { /* continue */ }
  }
  return null;
}

/* ───────────────────── SSE Helpers ───────────────────── */

function sseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/* ───────────────────── Main Handler ───────────────────── */

export async function POST(request: NextRequest) {
  const body = (await request.json()) as BatchRequest;
  const { provider, apiKey, model, characters, storyContext } = body;
  const baseUrl = cleanBaseUrl(body.baseUrl, provider);

  if (!model || !characters?.length) {
    return new Response(JSON.stringify({ error: "Missing model or characters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseMessage(event, data)));
      };

      const completedIds: string[] = [];
      const PROFILE_SHAPE = `{
  "appearance": "string (2-3 sentences describing physical appearance)",
  "personality": "string (2-3 sentences on personality traits)",
  "goals": "string (1-2 sentences on what they want)",
  "fears": "string (1-2 sentences on their deepest fears)",
  "backstory": "string (2-3 sentences on their background)",
  "accent": "string (dialect or accent notes)",
  "speakingStyle": "string (how they talk — formal, slang, etc.)",
  "reactionPattern": "string (how they react under stress)",
  "voiceNotes": "string (unique vocal characteristics)",
  "secrets": "string (1-2 hidden facts about them)",
  "readerSecretHint": "string (a spoiler-safe hint for the reader)",
  "tags": ["string (keywords like 'brave', 'cunning')"]
}`;

      /* ── Phase 1: Generate profiles one by one ── */
      for (let i = 0; i < characters.length; i++) {
        const char = characters[i];

        send("progress", {
          current: i + 1,
          total: characters.length,
          name: char.name,
          phase: "profile",
        });

        if (i > 0) await new Promise((r) => setTimeout(r, 2000));

        const systemMsg =
          "You are a character development specialist. Build vivid, Canon-consistent profiles for novel drafting. Return ONLY valid JSON. No markdown fences, no explanation, no thinking tags.";

        const prompt = [
          `Build a full profile for: ${char.name} (${char.role || "Supporting"})`,
          char.logline ? `Character hook: ${char.logline}` : "",
          "Build a vivid, detailed character profile — appearance, personality, goals, fears, backstory, and voice.",
          "Anchor everything to the Story canon only. Do not invent unrelated storylines.",
          `Return JSON ONLY in this exact shape:\n${PROFILE_SHAPE}`,
          "Rules:",
          "- Fill in EVERY field with 1-3 vivid sentences. Do NOT leave any field blank or empty.",
          "- tags should be an array of 3-6 keyword strings.",
          "- readerSecretHint must remain spoiler-safe.",
          `\nStory context:\n${storyContext.slice(0, 3000)}`,
        ]
          .filter(Boolean)
          .join("\n\n");

        try {
          const raw = await callAi(provider, apiKey, baseUrl, model, systemMsg, prompt, 850, 0.4);
          let profile = parseJson<ProfileData>(raw);

          // Retry once with stricter prompt if parsing failed
          if (!profile) {
            await new Promise((r) => setTimeout(r, 1500));
            const retryPrompt = `Your previous response was not valid JSON. Return ONLY the JSON object.\n\nOriginal request:\n${prompt.slice(0, 2500)}`;
            const raw2 = await callAi(
              provider, apiKey, baseUrl, model,
              "Return ONLY valid JSON. No markdown, no text, no explanation.",
              retryPrompt, 850, 0.1,
            );
            profile = parseJson<ProfileData>(raw2);
          }

          if (profile && typeof profile === "object") {
            const fields = Object.entries(profile).filter(
              ([, v]) => (typeof v === "string" && v.trim()) || (Array.isArray(v) && v.length > 0),
            );

            if (fields.length >= 3) {
              completedIds.push(char.id);
              send("profile", { characterId: char.id, profile });
            } else {
              send("error", {
                characterId: char.id,
                message: `Only ${fields.length} fields filled — skipped`,
              });
            }
          } else {
            send("error", { characterId: char.id, message: "Could not parse profile JSON" });
          }
        } catch (err) {
          send("error", {
            characterId: char.id,
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      /* ── Phase 2: Link relationships ── */
      if (completedIds.length >= 2) {
        send("progress", {
          current: characters.length,
          total: characters.length,
          name: "Linking...",
          phase: "relationships",
        });

        await new Promise((r) => setTimeout(r, 2000));

        const nameList = characters
          .filter((c) => completedIds.includes(c.id))
          .map((c) => `${c.name} (${c.role || "Supporting"})`)
          .join(", ");

        const relPrompt = [
          `Characters: ${nameList}`,
          `Story: ${storyContext.slice(0, 1500)}`,
          "Return a JSON array of meaningful relationships between these characters:",
          '[{"from":"Name","to":"Name","type":"friend/rival/lover/mentor/sibling/parent/child/ally/enemy/colleague","description":"brief description"}]',
          "Only include meaningful, story-relevant relationships. Return ONLY the JSON array.",
        ].join("\n");

        try {
          const raw = await callAi(
            provider, apiKey, baseUrl, model,
            "Relationship mapper. Return ONLY a valid JSON array. No markdown, no explanation.",
            relPrompt, 500, 0.3,
          );
          const parsed = parseJson<RelationshipData[]>(raw);
          const relationships = Array.isArray(parsed) ? parsed : [];

          if (relationships.length > 0) {
            send("relationships", {
              relationships: relationships.filter((r) => r.from && r.to && r.type),
            });
          }
        } catch {
          // Relationships are a bonus — don't fail the whole batch
        }
      }

      send("done", { completedIds });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
