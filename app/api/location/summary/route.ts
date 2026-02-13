import { NextResponse } from "next/server";

export const runtime = "nodejs";

type LocationSummaryRequest = {
  name?: string;
};

type NominatimLocation = {
  name?: string;
  display_name?: string;
  addresstype?: string;
  type?: string;
  importance?: number;
  lat?: string;
  lon?: string;
  extratags?: {
    wikipedia?: string;
    wikidata?: string;
  };
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

type WikipediaSearchPayload = {
  query?: {
    geosearch?: Array<{
      title?: string;
      dist?: number;
    }>;
  };
};

type WikipediaTextSearchPayload = {
  query?: {
    search?: Array<{
      title?: string;
    }>;
  };
};

type WikipediaSummaryPayload = {
  title?: string;
  extract?: string;
  description?: string;
};

type WikipediaExtractPayload = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        extract?: string;
      }
    >;
  };
};

type ParsedLocationQuery = {
  raw: string;
  placeName: string;
  countryCode: string;
  countryLabel: string;
};

const COUNTRY_HINTS: Array<{ code: string; label: string; aliases: string[] }> = [
  { code: "gb", label: "United Kingdom", aliases: ["uk", "u.k.", "united kingdom", "great britain", "britain", "england", "scotland", "wales", "northern ireland"] },
  { code: "us", label: "United States", aliases: ["us", "u.s.", "usa", "u.s.a.", "united states", "united states of america", "america"] },
  { code: "ca", label: "Canada", aliases: ["canada", "ca"] },
  { code: "au", label: "Australia", aliases: ["australia", "au"] },
  { code: "nz", label: "New Zealand", aliases: ["new zealand", "nz"] },
  { code: "za", label: "South Africa", aliases: ["south africa", "za"] },
  { code: "ie", label: "Ireland", aliases: ["ireland", "ire"] },
];

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseLocationQuery(rawInput: string): ParsedLocationQuery {
  const raw = rawInput.trim();
  const commaParts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  const placeName = commaParts[0] || raw;
  const searchable = raw.toLowerCase();

  for (const hint of COUNTRY_HINTS) {
    for (const alias of hint.aliases) {
      const pattern = new RegExp(`(^|[\\s,])${escapeForRegExp(alias.toLowerCase())}($|[\\s,])`, "i");
      if (pattern.test(searchable)) {
        return {
          raw,
          placeName,
          countryCode: hint.code,
          countryLabel: hint.label,
        };
      }
    }
  }

  return {
    raw,
    placeName,
    countryCode: "",
    countryLabel: "",
  };
}

function sentenceClamp(value: string, maxSentences = 3, maxChars = 430) {
  const clean = collapseWhitespace(value).replace(/\[[^\]]+\]/g, "").trim();
  if (!clean) return "";
  const sentenceParts = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const picked = sentenceParts.slice(0, maxSentences).join(" ").trim();
  if (!picked) return clean.slice(0, maxChars).trim();
  if (picked.length <= maxChars) return picked;
  return `${picked.slice(0, maxChars - 1).trim()}…`;
}

function describePlaceType(placeType: string) {
  const normalized = placeType.toLowerCase();
  if (normalized.includes("city")) return "a dense urban core, layered neighborhoods, and busy transit arteries";
  if (normalized.includes("town")) return "a walkable center, civic landmarks, and active local high streets";
  if (normalized.includes("village") || normalized.includes("hamlet")) {
    return "a slower rhythm, close community ties, and more intimate street scale";
  }
  if (normalized.includes("suburb")) return "residential streets, commuting flow, and neighborhood-scale amenities";
  if (normalized.includes("county") || normalized.includes("district")) {
    return "multiple local identities spread across towns, villages, and rural corridors";
  }
  if (normalized.includes("island")) return "coastal weather shifts, exposed horizons, and ferry or bridge dependencies";
  if (normalized.includes("state") || normalized.includes("region")) {
    return "broad geographic spread with varied local settings and cultural pockets";
  }
  return "distinct local texture shaped by geography, architecture, and daily movement";
}

function buildAtmosphereNotes(placeType: string, sourceText: string) {
  const lower = sourceText.toLowerCase();
  const hints: string[] = [];

  if (/historic|medieval|roman|cathedral|old town|heritage/.test(lower)) {
    hints.push("historic architecture and older street patterns that carry visible layers of time");
  }
  if (/river|waterfront|harbour|harbor|bay|coast|sea|canal|lake/.test(lower)) {
    hints.push("water-influenced movement, bridges, and weather-led shifts in mood");
  }
  if (/market|shopping|commercial|trade/.test(lower)) {
    hints.push("active commercial pockets with reliable foot traffic and social churn");
  }
  if (/university|college|student/.test(lower)) {
    hints.push("student-driven energy with term-time surges and mixed-age social spaces");
  }
  if (/spa|tourism|tourist|resort|visitor/.test(lower)) {
    hints.push("visitor-facing zones, hospitality cues, and polished public areas");
  }
  if (/industrial|manufacturing|factory|rail|warehouse/.test(lower)) {
    hints.push("working districts with practical architecture and logistical rhythm");
  }
  if (/rural|village|farmland|countryside|valley/.test(lower)) {
    hints.push("quieter edges, open views, and slower transitions between settlements");
  }

  if (!hints.length) {
    hints.push(describePlaceType(placeType));
  }

  return sentenceClamp(
    `For scene texture, write this place with ${hints.slice(0, 2).join(" and ")}.`,
    2,
    360,
  );
}

function buildFallbackSummary(locationName: string, match: NominatimLocation) {
  const address = match.address ?? {};
  const locality = address.city || address.town || address.village || address.county || "";
  const region = address.state || "";
  const country = address.country || "";
  const placeType = match.addresstype || match.type || "place";
  const where = [locality, region, country].filter(Boolean).join(", ");
  const coords =
    match.lat && match.lon
      ? ` It is located at approximately ${Number(match.lat).toFixed(3)}, ${Number(match.lon).toFixed(3)}.`
      : "";
  const sentence = `${locationName} is a real-world ${placeType}${where ? ` in ${where}` : ""}.${coords}`;
  const atmosphere = buildAtmosphereNotes(placeType, sentence);
  return sentenceClamp(`${sentence} ${atmosphere}`, 4, 760);
}

function pickBestMatch(query: ParsedLocationQuery, matches: NominatimLocation[]) {
  const normalizedQuery = query.placeName.trim().toLowerCase();
  const expectedCountry = query.countryCode.trim().toLowerCase();
  if (matches.length === 0) return null;
  const ranked = [...matches].sort((a, b) => {
    const nameA = `${a.name ?? ""} ${a.display_name ?? ""}`.toLowerCase();
    const nameB = `${b.name ?? ""} ${b.display_name ?? ""}`.toLowerCase();
    const exactA = nameA.includes(normalizedQuery) ? 1 : 0;
    const exactB = nameB.includes(normalizedQuery) ? 1 : 0;
    const countryA = (a.address?.country_code ?? "").toLowerCase();
    const countryB = (b.address?.country_code ?? "").toLowerCase();
    const countryScoreA = expectedCountry ? (countryA === expectedCountry ? 8 : -4) : 0;
    const countryScoreB = expectedCountry ? (countryB === expectedCountry ? 8 : -4) : 0;
    const displayStartsA = a.display_name?.toLowerCase().startsWith(normalizedQuery) ? 1 : 0;
    const displayStartsB = b.display_name?.toLowerCase().startsWith(normalizedQuery) ? 1 : 0;
    const scoreA = exactA * 5 + displayStartsA * 2 + countryScoreA + (a.importance ?? 0);
    const scoreB = exactB * 5 + displayStartsB * 2 + countryScoreB + (b.importance ?? 0);
    return scoreB - scoreA;
  });
  return ranked[0];
}

async function fetchWikipediaSummaryByTitle(title: string) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`;
  const summaryResponse = await fetch(summaryUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const summaryPayload = summaryResponse.ok
    ? ((await summaryResponse.json().catch(() => null)) as WikipediaSummaryPayload | null)
    : null;
  const summaryExtract = summaryPayload?.extract ? sentenceClamp(summaryPayload.extract, 6, 1100) : "";

  const extractUrl = new URL("https://en.wikipedia.org/w/api.php");
  extractUrl.searchParams.set("action", "query");
  extractUrl.searchParams.set("prop", "extracts");
  extractUrl.searchParams.set("format", "json");
  extractUrl.searchParams.set("utf8", "1");
  extractUrl.searchParams.set("redirects", "1");
  extractUrl.searchParams.set("exintro", "1");
  extractUrl.searchParams.set("explaintext", "1");
  extractUrl.searchParams.set("exsentences", "8");
  extractUrl.searchParams.set("titles", cleanTitle);
  const extractResponse = await fetch(extractUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const extractPayload = extractResponse.ok
    ? ((await extractResponse.json().catch(() => null)) as WikipediaExtractPayload | null)
    : null;
  const firstPage = extractPayload?.query?.pages ? Object.values(extractPayload.query.pages)[0] : null;
  const introExtract = firstPage?.extract ? sentenceClamp(firstPage.extract, 8, 1400) : "";
  const extract = introExtract || summaryExtract;
  if (!extract) return null;

  return {
    title: firstPage?.title?.trim() || summaryPayload?.title?.trim() || cleanTitle,
    extract,
  };
}

function extractWikipediaTitleFromNominatim(match: NominatimLocation) {
  const raw = match.extratags?.wikipedia?.trim();
  if (!raw) return "";
  // Common OSM shapes: "en:Harrogate" or full page URL.
  if (raw.includes("://")) {
    const parts = raw.split("/");
    const last = parts[parts.length - 1] || "";
    return decodeURIComponent(last).replace(/_/g, " ").trim();
  }
  const colonIndex = raw.indexOf(":");
  const title = colonIndex === -1 ? raw : raw.slice(colonIndex + 1);
  return title.replace(/_/g, " ").trim();
}

async function fetchWikipediaTitleFromGeo(
  match: NominatimLocation,
  preferredName: string,
) {
  if (!match.lat || !match.lon) return "";
  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "geosearch");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("utf8", "1");
  searchUrl.searchParams.set("gscoord", `${match.lat}|${match.lon}`);
  searchUrl.searchParams.set("gsradius", "12000");
  searchUrl.searchParams.set("gslimit", "8");

  const response = await fetch(searchUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return "";
  const payload = (await response.json().catch(() => null)) as WikipediaSearchPayload | null;
  const nearby = payload?.query?.geosearch ?? [];
  if (!nearby.length) return "";
  const normalizedName = preferredName.trim().toLowerCase();
  const byName = nearby.find((entry) => {
    const title = entry.title?.trim().toLowerCase() || "";
    return normalizedName ? title.includes(normalizedName) || normalizedName.includes(title) : false;
  });
  return (byName?.title || nearby[0]?.title || "").trim();
}

async function fetchWikipediaTitleFromText(searchQuery: string) {
  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("utf8", "1");
  searchUrl.searchParams.set("srlimit", "3");
  searchUrl.searchParams.set("srsearch", searchQuery);

  const searchResponse = await fetch(searchUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!searchResponse.ok) return "";
  const searchPayload = (await searchResponse.json().catch(() => null)) as
    | WikipediaTextSearchPayload
    | null;
  return searchPayload?.query?.search?.[0]?.title?.trim() || "";
}

function buildWriterLocationSummary(
  locationName: string,
  match: NominatimLocation,
  wikiExtract: string,
) {
  const address = match.address ?? {};
  const locality = address.city || address.town || address.village || "";
  const region = address.state || address.county || "";
  const country = address.country || "";
  const placeType = match.addresstype || match.type || "place";
  const whereParts = [locality, region, country].filter(Boolean);
  const where = whereParts.join(", ");

  const factual = wikiExtract.trim()
    ? sentenceClamp(wikiExtract, 7, 1300)
    : buildFallbackSummary(locationName, match);
  const grounding = sentenceClamp(
    `${locationName} can be grounded as a ${placeType}${where ? ` in ${where}` : ""}.`,
    2,
    220,
  );
  const atmosphere = buildAtmosphereNotes(
    placeType,
    [wikiExtract, match.display_name ?? "", where, placeType].filter(Boolean).join(" "),
  );
  const writingUse = sentenceClamp(
    "Use this as scene context: combine landmark cues, local rhythm, and social texture so AI outputs stay place-consistent.",
    2,
    260,
  );

  return sentenceClamp(
    [factual, grounding, atmosphere, writingUse].filter(Boolean).join(" "),
    10,
    1650,
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LocationSummaryRequest;
    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ found: false, error: "Location name is required." }, { status: 400 });
    }

    const query = parseLocationQuery(name);
    const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
    nominatimUrl.searchParams.set("q", query.placeName || name);
    nominatimUrl.searchParams.set("format", "jsonv2");
    nominatimUrl.searchParams.set("addressdetails", "1");
    nominatimUrl.searchParams.set("extratags", "1");
    nominatimUrl.searchParams.set("limit", "5");
    nominatimUrl.searchParams.set("accept-language", "en");
    if (query.countryCode) {
      nominatimUrl.searchParams.set("countrycodes", query.countryCode);
    }

    const nominatimResponse = await fetch(nominatimUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "PilotWriter/0.1 (Canon location lookup)",
      },
      cache: "no-store",
    });
    if (!nominatimResponse.ok) {
      return NextResponse.json(
        { found: false, error: `Location search unavailable (status ${nominatimResponse.status}).` },
        { status: 502 },
      );
    }

    const matches = (await nominatimResponse.json().catch(() => [])) as NominatimLocation[];
    if (!Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json({
        found: false,
        error: `No real-world location match was found for "${name}".`,
      });
    }

    const bestMatch = pickBestMatch(query, matches);
    if (!bestMatch) {
      return NextResponse.json({
        found: false,
        error: `No real-world location match was found for "${name}".`,
      });
    }

    const matchName = (bestMatch.name || bestMatch.display_name?.split(",")[0] || name).trim();
    const country = bestMatch.address?.country?.trim() || "";
    let wikiTitle = extractWikipediaTitleFromNominatim(bestMatch);
    if (!wikiTitle) {
      wikiTitle = await fetchWikipediaTitleFromGeo(bestMatch, matchName);
    }
    if (!wikiTitle) {
      const query = `${matchName}${country ? ` ${country}` : ""}`;
      wikiTitle = await fetchWikipediaTitleFromText(query);
    }
    const wiki = wikiTitle ? await fetchWikipediaSummaryByTitle(wikiTitle) : null;
    const summary = buildWriterLocationSummary(matchName, bestMatch, wiki?.extract ?? "");

    return NextResponse.json({
      found: true,
      name: matchName,
      displayName: bestMatch.display_name ?? matchName,
      type: bestMatch.addresstype || bestMatch.type || "",
      summary,
      source: wiki ? `Wikipedia: ${wiki.title}` : "OpenStreetMap Nominatim",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to look up location details.";
    return NextResponse.json({ found: false, error: message }, { status: 500 });
  }
}
