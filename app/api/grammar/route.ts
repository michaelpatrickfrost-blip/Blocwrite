import { NextResponse } from "next/server";

const DEFAULT_LT_ENDPOINT = "https://api.languagetool.org/v2/check";
const DEFAULT_LANGUAGE = "en-US";
const SUPPORTED_LANGUAGES = new Set([
  "en-US",
  "en-GB",
  "en-CA",
  "en-AU",
  "en-NZ",
  "en-ZA",
]);

type LanguageToolMatch = {
  offset?: number;
  [key: string]: unknown;
};

function normalizeLanguage(input: unknown) {
  if (typeof input !== "string") return DEFAULT_LANGUAGE;
  const cleaned = input.trim();
  return SUPPORTED_LANGUAGES.has(cleaned) ? cleaned : DEFAULT_LANGUAGE;
}

function splitTextIntoChunks(text: string, maxLength = 4500) {
  const chunks: Array<{ start: number; text: string }> = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxLength, text.length);
    if (end < text.length) {
      const newline = text.lastIndexOf("\n", end);
      const space = text.lastIndexOf(" ", end);
      const breakpoint = Math.max(newline, space);
      if (breakpoint > start + Math.floor(maxLength * 0.6)) {
        end = breakpoint + 1;
      }
    }
    chunks.push({ start, text: text.slice(start, end) });
    start = end;
  }

  return chunks;
}

async function checkChunk(endpoint: string, chunkText: string, language: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      text: chunkText,
      language,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Grammar service returned ${response.status}`);
  }

  const data = (await response.json()) as { matches?: LanguageToolMatch[] };
  return Array.isArray(data.matches) ? data.matches : [];
}

export async function POST(request: Request) {
  try {
    const { text, language } = await request.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const endpoint = process.env.LT_ENDPOINT ?? DEFAULT_LT_ENDPOINT;
    const selectedLanguage = normalizeLanguage(language);
    const chunks = splitTextIntoChunks(text);

    // Process chunks in parallel (batch of 3 to avoid rate-limiting the grammar service)
    const BATCH_SIZE = 3;
    const allMatches: LanguageToolMatch[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((chunk) => checkChunk(endpoint, chunk.text, selectedLanguage)),
      );
      batchResults.forEach((chunkMatches, batchIndex) => {
        const chunk = batch[batchIndex];
        for (const match of chunkMatches) {
          const safeOffset = typeof match.offset === "number" ? match.offset : 0;
          allMatches.push({
            ...match,
            offset: safeOffset + chunk.start,
          });
        }
      });
    }

    return NextResponse.json({
      matches: allMatches,
      language: selectedLanguage,
    });
  } catch (error) {
    console.error("Grammar check failed", error);
    return NextResponse.json(
      {
        matches: [],
        error: "Grammar service is currently unavailable. Please try again.",
      },
      { status: 200 },
    );
  }
}
