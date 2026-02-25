import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 900;

type ProviderId = "openrouter";

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

interface ProfileResult {
  characterId: string;
  profile: Record<string, unknown> | null;
  error?: string;
}

/* ───────────────────── Provider URL ───────────────────── */

const PROVIDER_BASE: Record<ProviderId, string> = {
  openrouter: "https://openrouter.ai/api/v1",
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
  return normalized;
}

/* ───────────────────── AI Call ───────────────────── */

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    console.log(`[batch-profiles] Calling ${provider} model=${model} endpoint=${endpoint}`);
    const t0 = Date.now();
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const rawText = await response.text();
    console.log(`[batch-profiles] Response status=${response.status} time=${Date.now() - t0}ms bodyLen=${rawText.length}`);

    if (!response.ok) {
      console.error(`[batch-profiles] API error: ${rawText.slice(0, 500)}`);
      throw new Error(`API error ${response.status}: ${rawText.slice(0, 200)}`);
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawText);
    } catch {
      console.error(`[batch-profiles] Failed to parse API response as JSON: ${rawText.slice(0, 300)}`);
      throw new Error("API response was not JSON");
    }

    const choices = payload.choices as Array<{ message?: { content?: string } }> | undefined;
    const content = choices?.[0]?.message?.content ?? "";
    console.log(`[batch-profiles] AI content length=${content.length}, first 200 chars: ${content.slice(0, 200)}`);
    return content;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error(`[batch-profiles] Timeout after 120s`);
      throw new Error("AI request timed out after 120 seconds");
    }
    throw err;
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
  const push = (v: string) => {
    const t = v.trim();
    if (t && !candidates.includes(t)) candidates.push(t);
  };

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
    try {
      return JSON.parse(candidate) as T;
    } catch {
      /* continue */
    }
  }
  return null;
}

/* ───────────────────── Main Handler ───────────────────── */

const PROFILE_SHAPE = `{
  "appearance": "2-3 sentences describing physical appearance",
  "personality": "2-3 sentences on personality traits",
  "goals": "1-2 sentences on what they want",
  "fears": "1-2 sentences on their deepest fears",
  "backstory": "2-3 sentences on their background",
  "accent": "dialect or accent notes",
  "speakingStyle": "how they talk — formal, slang, etc.",
  "reactionPattern": "how they react under stress",
  "voiceNotes": "unique vocal characteristics",
  "secrets": "1-2 hidden facts about them",
  "readerSecretHint": "a spoiler-safe hint for the reader",
  "tags": ["keyword1", "keyword2", "keyword3"]
}`;

const REQUIRED_PROFILE_STRING_FIELDS = [
  "appearance",
  "personality",
  "goals",
  "fears",
  "backstory",
  "accent",
  "speakingStyle",
  "reactionPattern",
  "voiceNotes",
  "secrets",
  "readerSecretHint",
] as const;

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function fallbackFieldText(field: (typeof REQUIRED_PROFILE_STRING_FIELDS)[number], char: CharacterInput) {
  const baseRole = (char.role || "supporting character").toLowerCase();
  switch (field) {
    case "appearance":
      return `${char.name} has a presence that fits their role as ${baseRole}, with distinctive visual details that make them easy to recognize on the page.`;
    case "personality":
      return `${char.name} is layered and emotionally readable, showing clear strengths, flaws, and contradictions that drive scene-to-scene behavior.`;
    case "goals":
      return `${char.name} wants something specific and personal, and that goal creates pressure on their choices throughout the story.`;
    case "fears":
      return `${char.name} fears loss, failure, or exposure in ways that influence their decisions, especially under stress.`;
    case "backstory":
      return `${char.name} carries formative experiences from their past that explain their worldview, loyalties, and present-day motivations.`;
    case "accent":
      return `${char.name} speaks in a grounded, natural voice with subtle regional flavor rather than exaggerated dialect.`;
    case "speakingStyle":
      return `${char.name} communicates in a distinct cadence and vocabulary, making their dialogue easy to identify without tags.`;
    case "reactionPattern":
      return `Under pressure, ${char.name} shows a consistent reaction pattern that reveals character and escalates conflict.`;
    case "voiceNotes":
      return `Write ${char.name}'s dialogue with clear intent, specific word choice, and emotional subtext tied to each scene objective.`;
    case "secrets":
      return `${char.name} is holding back information that could change relationships or plot direction if revealed.`;
    case "readerSecretHint":
      return `Subtle contradictions in ${char.name}'s behavior foreshadow that there is more beneath the surface without spoiling the reveal.`;
    default:
      return `${char.name} has a defined characterization for this field.`;
  }
}

function normalizeTags(value: unknown, char: CharacterInput) {
  const raw = Array.isArray(value) ? value : [];
  const tags = raw
    .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
    .filter(Boolean)
    .slice(0, 6);
  if (tags.length >= 3) return tags;
  const roleTag = (char.role || "supporting").toLowerCase().replace(/\s+/g, "-");
  const defaults = [roleTag, "character-arc", "story-driver"];
  for (const tag of defaults) {
    if (!tags.includes(tag)) tags.push(tag);
    if (tags.length >= 3) break;
  }
  return tags;
}

function normalizeProfile(profile: Record<string, unknown>, char: CharacterInput) {
  const out: Record<string, unknown> = { ...profile };
  for (const field of REQUIRED_PROFILE_STRING_FIELDS) {
    const current = asText(out[field]);
    out[field] = current || fallbackFieldText(field, char);
  }
  out.tags = normalizeTags(out.tags, char);
  return out;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as BatchRequest;
  const { provider, apiKey, model, characters, storyContext } = body;
  const baseUrl = cleanBaseUrl(body.baseUrl, provider);

  console.log(`[batch-profiles] START: ${characters.length} characters, provider=${provider}, model=${model}`);

  if (!model || !characters?.length) {
    return NextResponse.json({ error: "Missing model or characters" }, { status: 400 });
  }
  if (!apiKey && provider === "openrouter") {
    return NextResponse.json({ error: "Missing API key" }, { status: 400 });
  }

  const results: ProfileResult[] = [];

  /* ── Generate each profile ── */
  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    console.log(`[batch-profiles] Processing ${i + 1}/${characters.length}: ${char.name}`);

    if (i > 0) {
      console.log(`[batch-profiles] Waiting 2.5s before next character...`);
      await new Promise((r) => setTimeout(r, 2500));
    }

    const systemMsg =
      "You are a character development specialist for novels. Return ONLY valid JSON. No markdown fences, no explanation, no thinking tags, no extra text.";

    const prompt = [
      `Create a detailed character profile for: ${char.name} (Role: ${char.role || "Supporting"})`,
      char.logline ? `Character hook: ${char.logline}` : null,
      "",
      "Return a JSON object with EXACTLY these fields, each filled with 1-3 vivid sentences:",
      PROFILE_SHAPE,
      "",
      "CRITICAL RULES:",
      "- Output ONLY the JSON object. Nothing else.",
      "- Every field MUST have a non-empty string value.",
      "- tags MUST be an array of 3-6 keyword strings.",
      "- Anchor to the story context below. Do not invent unrelated storylines.",
      "",
      `Story context:\n${storyContext.slice(0, 3000)}`,
    ]
      .filter((line) => line !== null)
      .join("\n");

    try {
      const raw = await callAi(provider, apiKey, baseUrl, model, systemMsg, prompt, 900, 0.4);
      let profile = parseJson<Record<string, unknown>>(raw);

      if (!profile) {
        console.log(`[batch-profiles] First parse failed for ${char.name}, retrying with strict prompt...`);
        await new Promise((r) => setTimeout(r, 2000));
        const retryRaw = await callAi(
          provider,
          apiKey,
          baseUrl,
          model,
          "Return ONLY valid JSON. No markdown fences, no text.",
          `Return a character profile as JSON for ${char.name}. Fields: appearance, personality, goals, fears, backstory, accent, speakingStyle, reactionPattern, voiceNotes, secrets, readerSecretHint, tags. Each field 1-3 sentences. tags is array of strings.\n\nStory: ${storyContext.slice(0, 1500)}`,
          900,
          0.1,
        );
        profile = parseJson<Record<string, unknown>>(retryRaw);
      }

      if (profile && typeof profile === "object") {
        const normalized = normalizeProfile(profile, char);
        const filledFields = Object.entries(normalized).filter(
          ([, v]) => (typeof v === "string" && v.trim().length > 0) || (Array.isArray(v) && v.length > 0),
        );
        console.log(`[batch-profiles] ${char.name}: parsed OK, ${filledFields.length} fields filled`);
        results.push({ characterId: char.id, profile: normalized });
      } else {
        console.error(`[batch-profiles] ${char.name}: could not parse JSON from AI response`);
        results.push({ characterId: char.id, profile: null, error: "Could not parse AI response as JSON" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[batch-profiles] ${char.name}: error — ${msg}`);
      results.push({ characterId: char.id, profile: null, error: msg });
    }
  }

  /* ── Link relationships ── */
  let relationships: Array<{ from: string; to: string; type: string; description?: string }> = [];
  const completedNames = results
    .filter((r) => r.profile)
    .map((r) => {
      const char = characters.find((c) => c.id === r.characterId);
      return char ? `${char.name} (${char.role || "Supporting"})` : null;
    })
    .filter(Boolean);

  if (completedNames.length >= 2) {
    console.log(`[batch-profiles] Generating relationships for ${completedNames.length} characters...`);
    await new Promise((r) => setTimeout(r, 2500));

    try {
      const relRaw = await callAi(
        provider,
        apiKey,
        baseUrl,
        model,
        "Relationship mapper. Return ONLY a valid JSON array. No markdown, no explanation.",
        `Characters: ${completedNames.join(", ")}\nStory: ${storyContext.slice(0, 1500)}\n\nReturn a JSON array of relationships:\n[{"from":"CharName","to":"CharName","type":"friend/rival/lover/mentor/sibling/parent/child/ally/enemy/colleague","description":"brief"}]\nOnly meaningful relationships.`,
        500,
        0.3,
      );
      const parsed = parseJson<Array<{ from?: string; to?: string; type?: string; description?: string }>>(relRaw);
      if (Array.isArray(parsed)) {
        relationships = parsed.filter((r) => r.from && r.to && r.type) as typeof relationships;
      }
      console.log(`[batch-profiles] Parsed ${relationships.length} relationships`);
    } catch (err) {
      console.warn(`[batch-profiles] Relationship generation failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  const successCount = results.filter((r) => r.profile).length;
  console.log(`[batch-profiles] DONE: ${successCount}/${characters.length} profiles generated, ${relationships.length} relationships`);

  return NextResponse.json({ results, relationships });
}
