import { NextRequest, NextResponse } from "next/server";

type WikiSearchItem = {
  pageid: number;
  title: string;
  snippet?: string;
};

type WikiQueryResponse = {
  query?: {
    search?: WikiSearchItem[];
  };
};

type EraResearchNote = {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  tags: string[];
  createdAt: string;
};

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toTags(text: string): string[] {
  const value = text.toLowerCase();
  const tags = new Set<string>();
  if (/(culture|social|daily life|community|tradition)/.test(value)) tags.add("culture");
  if (/(technology|internet|computer|mobile|tv|radio)/.test(value)) tags.add("technology");
  if (/(music|film|television|media|song|album)/.test(value)) tags.add("media");
  if (/(politic|election|war|riot|policy|law|strike)/.test(value)) tags.add("historical");
  if (!tags.size) tags.add("context");
  return [...tags];
}

function buildSourceUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
}

async function wikiSearch(query: string, limit: number): Promise<WikiSearchItem[]> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("format", "json");
  url.searchParams.set("utf8", "1");
  url.searchParams.set("srsearch", query);
  url.searchParams.set("srlimit", String(Math.max(1, Math.min(limit, 10))));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json()) as WikiQueryResponse;
  return json.query?.search ?? [];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { query?: string; era?: string; setting?: string; limit?: number };
    const query = String(body?.query || "").trim();
    const era = String(body?.era || "").trim();
    const setting = String(body?.setting || "").trim();
    const limit = Math.max(3, Math.min(Number(body?.limit || 8), 12));

    if (!query) {
      return NextResponse.json({ error: "Please provide an era research query." }, { status: 400 });
    }

    const searchTerms = [
      query,
      [query, era, setting].filter(Boolean).join(" "),
      `${query} social history`,
      `${query} culture`,
      `${query} daily life`,
    ].filter((v, i, arr) => v && arr.indexOf(v) === i);

    const merged = new Map<number, WikiSearchItem>();
    for (const term of searchTerms) {
      const rows = await wikiSearch(term, 5);
      for (const row of rows) {
        if (!merged.has(row.pageid)) merged.set(row.pageid, row);
      }
      if (merged.size >= limit) break;
    }

    const notes: EraResearchNote[] = [...merged.values()].slice(0, limit).map((item, idx) => {
      const summary = stripHtml(item.snippet || item.title || "").slice(0, 340);
      const combined = `${item.title} ${summary}`;
      return {
        id: `ern-${Date.now()}-${idx}`,
        title: item.title,
        summary: summary || `Context about ${item.title}.`,
        sourceName: "Wikipedia",
        sourceUrl: buildSourceUrl(item.title),
        tags: toTags(combined),
        createdAt: new Date().toISOString(),
      };
    });

    return NextResponse.json({ notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to research this era.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
