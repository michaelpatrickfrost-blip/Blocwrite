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
  sourceType?: "encyclopedia" | "book" | "archive" | "news";
  confidence?: number;
  tags: string[];
  createdAt: string;
};

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  subject?: string[];
};

type OpenLibraryResponse = {
  docs?: OpenLibraryDoc[];
};

type ArchiveDoc = {
  identifier?: string;
  title?: string;
  description?: string | string[];
  year?: string;
  mediatype?: string;
};

type ArchiveResponse = {
  response?: {
    docs?: ArchiveDoc[];
  };
};

type CandidateNote = {
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: EraResearchNote["sourceType"];
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

function buildWikipediaSourceUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
}

function safeText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean).join(" ");
  return "";
}

function overlapScore(query: string, text: string): number {
  const q = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  if (!q.length) return 0;
  const hay = text.toLowerCase();
  let score = 0;
  for (const token of q) {
    if (hay.includes(token)) score += 1;
  }
  return score / q.length;
}

function scoreCandidate(query: string, candidate: CandidateNote): number {
  const baseBySource: Record<string, number> = {
    archive: 1.2,
    book: 1.1,
    news: 1.05,
    encyclopedia: 0.95,
  };
  const text = `${candidate.title} ${candidate.summary}`;
  const overlap = overlapScore(query, text);
  const sourceBoost = baseBySource[candidate.sourceType || "encyclopedia"] ?? 1;
  return Math.max(0, Math.min(1, overlap * sourceBoost));
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

async function openLibrarySearch(query: string, limit: number): Promise<OpenLibraryDoc[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.max(1, Math.min(limit, 10))));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json()) as OpenLibraryResponse;
  return json.docs ?? [];
}

async function archiveSearch(query: string, limit: number): Promise<ArchiveDoc[]> {
  const url = new URL("https://archive.org/advancedsearch.php");
  url.searchParams.set("q", query);
  url.searchParams.set("fl[]", "identifier");
  url.searchParams.append("fl[]", "title");
  url.searchParams.append("fl[]", "description");
  url.searchParams.append("fl[]", "year");
  url.searchParams.append("fl[]", "mediatype");
  url.searchParams.set("rows", String(Math.max(1, Math.min(limit, 12))));
  url.searchParams.set("page", "1");
  url.searchParams.set("output", "json");
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      "User-Agent": "BlocwriteEraResearch/1.0 (+https://blocwrite.com)",
    },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as ArchiveResponse;
  return json.response?.docs ?? [];
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
      era ? `${query} ${era} primary sources` : "",
      `${query} everyday life`,
    ].filter((v, i, arr) => v && arr.indexOf(v) === i);

    const merged = new Map<number, WikiSearchItem>();
    const candidates: CandidateNote[] = [];
    for (const term of searchTerms) {
      const [wikiRows, libraryRows, archiveRows] = await Promise.all([
        wikiSearch(term, 5),
        openLibrarySearch(term, 5),
        archiveSearch(term, 5),
      ]);
      const rows = wikiRows;
      for (const row of rows) {
        if (!merged.has(row.pageid)) merged.set(row.pageid, row);
      }
      for (const item of libraryRows) {
        const title = (item.title || "").trim();
        if (!title) continue;
        const author = Array.isArray(item.author_name) ? item.author_name.slice(0, 2).join(", ") : "";
        const year = item.first_publish_year ? String(item.first_publish_year) : "";
        const subject = Array.isArray(item.subject) ? item.subject.slice(0, 4).join(", ") : "";
        const summary = [author ? `By ${author}.` : "", year ? `Published ${year}.` : "", subject ? `Subjects: ${subject}.` : ""]
          .filter(Boolean)
          .join(" ")
          .slice(0, 340);
        const sourceUrl = item.key ? `https://openlibrary.org${item.key}` : "https://openlibrary.org/";
        candidates.push({
          title,
          summary: summary || `Book source relevant to ${query}.`,
          sourceName: "Open Library",
          sourceUrl,
          sourceType: "book",
        });
      }
      for (const item of archiveRows) {
        const title = (item.title || "").trim();
        if (!title || !item.identifier) continue;
        const description = safeText(item.description).slice(0, 260);
        const meta = [item.year ? `Year ${item.year}.` : "", item.mediatype ? `Type: ${item.mediatype}.` : ""].filter(Boolean).join(" ");
        candidates.push({
          title,
          summary: [description, meta].filter(Boolean).join(" ").trim() || `Archive material relevant to ${query}.`,
          sourceName: "Internet Archive",
          sourceUrl: `https://archive.org/details/${encodeURIComponent(item.identifier)}`,
          sourceType: "archive",
        });
      }
      if (merged.size + candidates.length >= limit * 3) break;
    }

    for (const item of [...merged.values()]) {
      const summary = stripHtml(item.snippet || item.title || "").slice(0, 340);
      candidates.push({
        title: item.title,
        summary: summary || `Context about ${item.title}.`,
        sourceName: "Wikipedia",
        sourceUrl: buildWikipediaSourceUrl(item.title),
        sourceType: "encyclopedia",
      });
    }

    const deDupe = new Map<string, CandidateNote>();
    for (const candidate of candidates) {
      const key = `${candidate.sourceUrl}|${candidate.title.toLowerCase()}`;
      if (!deDupe.has(key)) deDupe.set(key, candidate);
    }

    const ranked = [...deDupe.values()]
      .map((candidate) => ({
        candidate,
        score: scoreCandidate(query, candidate),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const notes: EraResearchNote[] = ranked.map(({ candidate, score }, idx) => {
      const combined = `${candidate.title} ${candidate.summary}`;
      return {
        id: `ern-${Date.now()}-${idx}`,
        title: candidate.title,
        summary: candidate.summary,
        sourceName: candidate.sourceName,
        sourceUrl: candidate.sourceUrl,
        sourceType: candidate.sourceType,
        confidence: Math.round(score * 100),
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
