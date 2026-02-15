"use client";

import { useState, useMemo } from "react";
import type { Character, Location, Item, TimelineEvent, LoreEntry, StoryBible, Chapter } from "../studio-store";
import { extractProseFromContent, countWords } from "../studio-store";

/* ─── Types ─── */

export type ThreadKeeperLayer = 1 | 2 | 3;

export type ThreadKeeperCategoryId =
  | "canon-traits"
  | "object-props"
  | "character-presence"
  | "state-drift"
  | "timeline"
  | "relationships"
  | "knowledge"
  | "spatial-logic"
  | "emotional-arc"
  | "setup-payoff"
  | "voice-drift";

export type ThreadKeeperIssue = {
  severity: "high" | "medium" | "low";
  category: ThreadKeeperCategoryId;
  categoryLabel: string;
  quote?: string;
  issue: string;
  suggestion: string;
  characterName?: string;
  field?: string;
};

export type ThreadKeeperCategory = {
  id: ThreadKeeperCategoryId;
  label: string;
  shortLabel: string;
  layer: ThreadKeeperLayer;
  description: string;
  icon: string; // SVG path
};

export type ThreadKeeperResult = {
  issues: ThreadKeeperIssue[];
  scannedCategories: ThreadKeeperCategoryId[];
  scanning: boolean;
  scanningLabel?: string;
};

/* ─── Category definitions ─── */

export const THREADKEEPER_CATEGORIES: ThreadKeeperCategory[] = [
  // Layer 1 — Hard Rules (deterministic, no AI)
  {
    id: "canon-traits",
    label: "Canon Traits",
    shortLabel: "Canon",
    layer: 1,
    description: "Eye colour, hair, age, physical traits — zero-tolerance Canon violations",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  },
  {
    id: "object-props",
    label: "Object & Props",
    shortLabel: "Objects",
    layer: 1,
    description: "Track items, weapons, artifacts — flag if they reappear without explanation",
    icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  },
  {
    id: "character-presence",
    label: "Character Presence",
    shortLabel: "Presence",
    layer: 1,
    description: "Who is mentioned vs who should be in this chapter",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  },
  // Layer 2 — Logical Transitions (light AI)
  {
    id: "state-drift",
    label: "State Drift",
    shortLabel: "State",
    layer: 2,
    description: "Injuries, conditions, possession changes between chapters",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  },
  {
    id: "timeline",
    label: "Timeline",
    shortLabel: "Time",
    layer: 2,
    description: "Time-of-day, event order, travel plausibility",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    id: "relationships",
    label: "Relationships",
    shortLabel: "Relations",
    layer: 2,
    description: "Emotional state between characters vs how they interact",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  },
  {
    id: "knowledge",
    label: "Knowledge",
    shortLabel: "Knowledge",
    layer: 2,
    description: "Who knows what — flag if characters reference things they shouldn't",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  {
    id: "spatial-logic",
    label: "Spatial Logic",
    shortLabel: "Spatial",
    layer: 2,
    description: "Who is in the room, entrance/exit tracking",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  // Layer 3 — Narrative Integrity (full AI, optional)
  {
    id: "emotional-arc",
    label: "Emotional Arc",
    shortLabel: "Emotion",
    layer: 3,
    description: "Grief, fear, love intensity tracking — proportional reactions",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    id: "setup-payoff",
    label: "Setup / Payoff",
    shortLabel: "Threads",
    layer: 3,
    description: "Open loops, foreshadowing, unresolved mysteries",
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  },
  {
    id: "voice-drift",
    label: "Voice Drift",
    shortLabel: "Voice",
    layer: 3,
    description: "Speech pattern consistency, accent shifts, tone changes",
    icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
  },
];

const LAYER_META: Record<ThreadKeeperLayer, { label: string; tag: string; color: string }> = {
  1: { label: "Hard Rules", tag: "Instant", color: "#a78bfa" },
  2: { label: "Logic", tag: "AI-assisted", color: "#818cf8" },
  3: { label: "Narrative", tag: "Deep AI", color: "#6366f1" },
};

const SEVERITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6b7280",
};

const SEVERITY_LABELS: Record<string, string> = {
  high: "Must fix",
  medium: "Should fix",
  low: "Consider",
};

/* ─── ThreadKeeper Logo SVG ─── */

export function ThreadKeeperLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Needle */}
      <path
        d="M6 26L22 10"
        stroke="url(#tkGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Needle head (eye) */}
      <ellipse cx="24" cy="8" rx="2.5" ry="3.5" stroke="url(#tkGrad)" strokeWidth="1.8" transform="rotate(-45 24 8)" />
      {/* Thread weaving */}
      <path
        d="M8 24C11 21 13 23 16 20C19 17 17 15 20 12"
        stroke="url(#tkGrad)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2 3"
        opacity="0.7"
      />
      {/* Shimmer dot */}
      <circle cx="16" cy="16" r="1.2" fill="#a78bfa" opacity="0.6">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <defs>
        <linearGradient id="tkGrad" x1="6" y1="26" x2="26" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Layer 1: Deterministic Checks ─── */

function extractTraitPhrases(text: string): Array<{ trait: string; value: string }> {
  const traits: Array<{ trait: string; value: string }> = [];
  const eyeMatch = text.match(/\b(blue|green|brown|hazel|grey|gray|black|amber|violet|dark|light)\s+eyes?\b/gi);
  if (eyeMatch) eyeMatch.forEach((m) => traits.push({ trait: "eye colour", value: m.toLowerCase() }));
  const hairMatch = text.match(/\b(blonde|blond|brunette|black|brown|red|auburn|ginger|grey|gray|silver|white|dark|light|curly|straight|wavy)\s+hair\b/gi);
  if (hairMatch) hairMatch.forEach((m) => traits.push({ trait: "hair", value: m.toLowerCase() }));
  return traits;
}

function extractCanonTraits(character: Character): Array<{ trait: string; value: string; field: string }> {
  const traits: Array<{ trait: string; value: string; field: string }> = [];
  if (character.appearance) {
    const appTraits = extractTraitPhrases(character.appearance);
    appTraits.forEach((t) => traits.push({ ...t, field: "appearance" }));
  }
  if (character.backstory) {
    const bsTraits = extractTraitPhrases(character.backstory);
    bsTraits.forEach((t) => traits.push({ ...t, field: "backstory" }));
  }
  return traits;
}

function normalizeTraitValue(trait: string, value: string): string {
  // Normalize to core colour/descriptor
  const v = value.toLowerCase().replace(/\s+(eyes?|hair)\s*$/i, "").trim();
  return v;
}

export function runCanonTraitChecks(
  characters: Character[],
  chapterProse: string,
): ThreadKeeperIssue[] {
  const issues: ThreadKeeperIssue[] = [];
  const lower = chapterProse.toLowerCase();

  for (const char of characters) {
    if (!char.name || !lower.includes(char.name.toLowerCase())) continue;
    const canonTraits = extractCanonTraits(char);
    const proseTraits = extractTraitPhrases(chapterProse);

    // For each trait type the Canon defines, check if the prose contradicts it
    const canonByType = new Map<string, { value: string; field: string }>();
    for (const ct of canonTraits) {
      const key = ct.trait;
      if (!canonByType.has(key)) canonByType.set(key, { value: ct.value, field: ct.field });
    }

    for (const pt of proseTraits) {
      const canon = canonByType.get(pt.trait);
      if (!canon) continue;
      const canonNorm = normalizeTraitValue(pt.trait, canon.value);
      const proseNorm = normalizeTraitValue(pt.trait, pt.value);
      if (canonNorm && proseNorm && canonNorm !== proseNorm) {
        // Check the prose mention is near this character's name
        const charIdx = lower.indexOf(char.name.toLowerCase());
        const traitIdx = lower.indexOf(pt.value.toLowerCase());
        if (Math.abs(charIdx - traitIdx) < 500) {
          issues.push({
            severity: "high",
            category: "canon-traits",
            categoryLabel: "Canon Violation",
            quote: pt.value,
            issue: `Canon states ${char.name} has "${canon.value}" (${canon.field}), but the prose says "${pt.value}".`,
            suggestion: `Change "${pt.value}" to match Canon: "${canon.value}".`,
            characterName: char.name,
            field: canon.field,
          });
        }
      }
    }
  }
  return issues;
}

export function runObjectPropChecks(
  items: Item[],
  chapterProse: string,
  allChapters: Chapter[],
  currentChapterIndex: number,
): ThreadKeeperIssue[] {
  const issues: ThreadKeeperIssue[] = [];
  if (items.length === 0) return issues;
  const lower = chapterProse.toLowerCase();

  for (const item of items) {
    if (!item.name || !lower.includes(item.name.toLowerCase())) continue;
    // Check if any prior chapter mentions the item being destroyed/lost/given away
    const lostPatterns = [
      `destroyed the ${item.name.toLowerCase()}`,
      `lost the ${item.name.toLowerCase()}`,
      `${item.name.toLowerCase()} was destroyed`,
      `${item.name.toLowerCase()} was lost`,
      `gave away the ${item.name.toLowerCase()}`,
      `burned the ${item.name.toLowerCase()}`,
      `threw away the ${item.name.toLowerCase()}`,
    ];
    for (let i = 0; i < currentChapterIndex; i++) {
      const prevProse = extractProseFromContent(allChapters[i].content).toLowerCase();
      for (const pattern of lostPatterns) {
        if (prevProse.includes(pattern)) {
          issues.push({
            severity: "medium",
            category: "object-props",
            categoryLabel: "Object Continuity",
            issue: `"${item.name}" appears in this chapter, but Chapter ${i + 1} ("${allChapters[i].title}") indicates it was lost/destroyed.`,
            suggestion: `Explain how "${item.name}" was recovered, or remove the reference.`,
          });
          break;
        }
      }
    }
  }
  return issues;
}

export function runCharacterPresenceChecks(
  characters: Character[],
  chapterProse: string,
  planCharacterIds: string[],
): ThreadKeeperIssue[] {
  const issues: ThreadKeeperIssue[] = [];
  const lower = chapterProse.toLowerCase();

  // Characters mentioned in prose but NOT in the plan for this chapter
  for (const char of characters) {
    if (!char.name) continue;
    const inProse = lower.includes(char.name.toLowerCase());
    const inPlan = planCharacterIds.includes(char.id);
    if (inProse && !inPlan && planCharacterIds.length > 0) {
      issues.push({
        severity: "low",
        category: "character-presence",
        categoryLabel: "Character Presence",
        issue: `${char.name} is mentioned in the prose but is not listed in the chapter plan.`,
        suggestion: `Either add ${char.name} to the chapter plan, or verify they should appear here.`,
        characterName: char.name,
      });
    }
  }
  // Characters in the plan but NOT mentioned in prose
  for (const charId of planCharacterIds) {
    const char = characters.find((c) => c.id === charId);
    if (!char || !char.name) continue;
    if (!lower.includes(char.name.toLowerCase())) {
      issues.push({
        severity: "low",
        category: "character-presence",
        categoryLabel: "Character Presence",
        issue: `${char.name} is listed in the chapter plan but never mentioned in the prose.`,
        suggestion: `Include ${char.name} in the scene, or remove them from the plan.`,
        characterName: char.name,
      });
    }
  }
  return issues;
}

/* ─── Props ─── */

type ThreadKeeperProps = {
  chapterProse: string;
  chapterTitle: string;
  chapterNumber: number;
  totalChapters: number;
  storyBible: StoryBible;
  allChapters: Chapter[];
  currentChapterIndex: number;
  planCharacterIds: string[];
  planLocationIds: string[];
  /** Callback to run an AI check for Layer 2/3 categories */
  onRunAiCheck: (
    categoryId: ThreadKeeperCategoryId,
    context: {
      chapterProse: string;
      prevChapterProse: string;
      nextChapterProse: string;
      canonSummary: string;
    },
  ) => Promise<ThreadKeeperIssue[]>;
  wordCount: number;
};

/* ─── Component ─── */

export function ThreadKeeper({
  chapterProse,
  chapterTitle,
  chapterNumber,
  totalChapters,
  storyBible,
  allChapters,
  currentChapterIndex,
  planCharacterIds,
  onRunAiCheck,
  wordCount,
}: ThreadKeeperProps) {
  const [issues, setIssues] = useState<ThreadKeeperIssue[]>([]);
  const [scannedCategories, setScannedCategories] = useState<Set<ThreadKeeperCategoryId>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [scanningLabel, setScanningLabel] = useState<string | null>(null);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  const characters = storyBible.characters ?? [];
  const items = storyBible.items ?? [];

  const issuesByCategory = useMemo(() => {
    const map = new Map<ThreadKeeperCategoryId, ThreadKeeperIssue[]>();
    for (const issue of issues) {
      const arr = map.get(issue.category) ?? [];
      arr.push(issue);
      map.set(issue.category, arr);
    }
    return map;
  }, [issues]);

  const prevProse = currentChapterIndex > 0
    ? extractProseFromContent(allChapters[currentChapterIndex - 1].content)
    : "";
  const nextProse = currentChapterIndex + 1 < allChapters.length
    ? extractProseFromContent(allChapters[currentChapterIndex + 1].content)
    : "";

  function buildCanonSummary(): string {
    const parts: string[] = [];
    const summary = storyBible.summary;
    if (summary.premise) parts.push(`Premise: ${summary.premise.slice(0, 200)}`);
    if (summary.genre?.length) parts.push(`Genre: ${summary.genre.join(", ")}`);
    for (const char of characters.slice(0, 8)) {
      const d: string[] = [`${char.name} (${char.role})`];
      if (char.appearance) d.push(`Appearance: ${char.appearance.slice(0, 100)}`);
      if (char.personality) d.push(`Personality: ${char.personality.slice(0, 80)}`);
      if (char.speakingStyle) d.push(`Speech: ${char.speakingStyle.slice(0, 60)}`);
      if (char.secrets) d.push(`Secret: ${char.secrets.slice(0, 80)}`);
      if (char.goals) d.push(`Goals: ${char.goals.slice(0, 60)}`);
      if (char.relationships?.length) {
        const rels = char.relationships.slice(0, 3).map((r) => {
          const target = characters.find((c) => c.id === r.targetCharacterId);
          return target ? `${target.name}: ${r.type || r.description || "linked"}` : null;
        }).filter(Boolean);
        if (rels.length) d.push(`Relationships: ${rels.join("; ")}`);
      }
      parts.push(d.join(" | "));
    }
    for (const loc of (storyBible.locations ?? []).slice(0, 4)) {
      parts.push(`Location "${loc.name}": ${(loc.description || "").slice(0, 80)}`);
    }
    for (const item of items.slice(0, 4)) {
      parts.push(`Item "${item.name}": ${item.description.slice(0, 60)}${item.powersOrUse ? ` (${item.powersOrUse.slice(0, 40)})` : ""}`);
    }
    for (const lore of (storyBible.lore ?? []).slice(0, 3)) {
      if (lore.constraints?.length) parts.push(`Rule (${lore.title}): ${lore.constraints.join("; ").slice(0, 100)}`);
    }
    const sv = storyBible.styleVoice;
    if (sv?.pov) parts.push(`POV: ${sv.pov}`);
    if (sv?.tense) parts.push(`Tense: ${sv.tense}`);
    return parts.join("\n");
  }

  async function runCategory(catId: ThreadKeeperCategoryId) {
    const cat = THREADKEEPER_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    setScanningLabel(cat.label);

    let newIssues: ThreadKeeperIssue[] = [];

    if (cat.layer === 1) {
      // Deterministic — run client-side
      if (catId === "canon-traits") {
        newIssues = runCanonTraitChecks(characters, chapterProse);
      } else if (catId === "object-props") {
        newIssues = runObjectPropChecks(items, chapterProse, allChapters, currentChapterIndex);
      } else if (catId === "character-presence") {
        newIssues = runCharacterPresenceChecks(characters, chapterProse, planCharacterIds);
      }
    } else {
      // Layer 2 & 3 — AI-assisted
      try {
        newIssues = await onRunAiCheck(catId, {
          chapterProse,
          prevChapterProse: prevProse,
          nextChapterProse: nextProse,
          canonSummary: buildCanonSummary(),
        });
      } catch {
        newIssues = [];
      }
    }

    setIssues((prev) => [...prev.filter((i) => i.category !== catId), ...newIssues]);
    setScannedCategories((prev) => new Set([...prev, catId]));
  }

  async function runFullScan() {
    setScanning(true);
    setIssues([]);
    setScannedCategories(new Set());

    // Layer 1 first (instant)
    const layer1Cats = THREADKEEPER_CATEGORIES.filter((c) => c.layer === 1);
    for (const cat of layer1Cats) {
      await runCategory(cat.id);
    }

    // Layer 2
    const layer2Cats = THREADKEEPER_CATEGORIES.filter((c) => c.layer === 2);
    for (const cat of layer2Cats) {
      await runCategory(cat.id);
    }

    // Layer 3
    const layer3Cats = THREADKEEPER_CATEGORIES.filter((c) => c.layer === 3);
    for (const cat of layer3Cats) {
      await runCategory(cat.id);
    }

    setScanningLabel(null);
    setScanning(false);
  }

  async function runSingleCategory(catId: ThreadKeeperCategoryId) {
    setScanning(true);
    await runCategory(catId);
    setScanningLabel(null);
    setScanning(false);
  }

  const highCount = issues.filter((i) => i.severity === "high").length;
  const medCount = issues.filter((i) => i.severity === "medium").length;
  const lowCount = issues.filter((i) => i.severity === "low").length;

  return (
    <div>
      {/* ═══ HEADER with logo ═══ */}
      <div className="pw-tk-header">
        <div className="pw-tk-header-left">
          <ThreadKeeperLogo size={28} />
          <div>
            <div className="pw-tk-title">ThreadKeeper</div>
            <div className="pw-tk-tagline">Every thread. Every detail. Nothing slips.</div>
          </div>
        </div>
        <button
          type="button"
          className="pw-tk-full-scan-btn"
          onClick={() => void runFullScan()}
          disabled={scanning}
        >
          {scanning ? (
            <>
              <div className="pw-tk-spinner" />
              {scanningLabel ? `Scanning ${scanningLabel}...` : "Scanning..."}
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              Run Full Scan
            </>
          )}
        </button>
      </div>

      {/* ═══ CONTEXT BAR ═══ */}
      <div className="pw-tk-context">
        <span>Ch {chapterNumber}/{totalChapters}</span>
        <span>&middot;</span>
        <span>{wordCount.toLocaleString()} words</span>
        <span>&middot;</span>
        <span>{chapterTitle}</span>
      </div>

      {/* ═══ CATEGORY GRID by layer ═══ */}
      {([1, 2, 3] as ThreadKeeperLayer[]).map((layer) => {
        const cats = THREADKEEPER_CATEGORIES.filter((c) => c.layer === layer);
        const meta = LAYER_META[layer];
        return (
          <div key={layer} className="pw-tk-layer-section">
            <div className="pw-tk-layer-header">
              <span className="pw-tk-layer-label" style={{ color: meta.color }}>Layer {layer}</span>
              <span className="pw-tk-layer-name">{meta.label}</span>
              <span className="pw-tk-layer-tag" style={{ background: `${meta.color}18`, color: meta.color }}>{meta.tag}</span>
            </div>
            <div className="pw-tk-category-grid">
              {cats.map((cat) => {
                const catIssues = issuesByCategory.get(cat.id) ?? [];
                const isScanned = scannedCategories.has(cat.id);
                const isActive = scanning && scanningLabel === cat.label;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`pw-tk-category-pill${isScanned ? " scanned" : ""}${isActive ? " active" : ""}`}
                    onClick={() => void runSingleCategory(cat.id)}
                    disabled={scanning}
                    title={cat.description}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={cat.icon} />
                    </svg>
                    <span className="pw-tk-pill-label">{cat.shortLabel}</span>
                    {isActive && <div className="pw-tk-pill-spinner" />}
                    {isScanned && catIssues.length > 0 && (
                      <span className="pw-tk-pill-badge" style={{
                        background: catIssues.some((i) => i.severity === "high") ? "#ef4444" : catIssues.some((i) => i.severity === "medium") ? "#f59e0b" : "#6b7280",
                      }}>
                        {catIssues.length}
                      </span>
                    )}
                    {isScanned && catIssues.length === 0 && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ═══ RESULTS ═══ */}
      {issues.length > 0 && (
        <div className="pw-tk-results">
          <div className="pw-tk-results-header">
            <span className="pw-tk-results-title">
              {issues.length} Issue{issues.length !== 1 ? "s" : ""} Found
            </span>
            <div className="pw-tk-severity-summary">
              {highCount > 0 && <span style={{ color: SEVERITY_COLORS.high }}>{highCount} critical</span>}
              {medCount > 0 && <span style={{ color: SEVERITY_COLORS.medium }}>{medCount} warning{medCount !== 1 ? "s" : ""}</span>}
              {lowCount > 0 && <span style={{ color: SEVERITY_COLORS.low }}>{lowCount} minor</span>}
            </div>
          </div>
          <div className="pw-tk-issues-list">
            {issues
              .sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 };
                return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
              })
              .map((issue, idx) => {
                const cat = THREADKEEPER_CATEGORIES.find((c) => c.id === issue.category);
                const isExpanded = expandedIssue === idx;
                return (
                  <div
                    key={idx}
                    className={`pw-tk-issue-card${isExpanded ? " expanded" : ""}`}
                    style={{ borderLeftColor: SEVERITY_COLORS[issue.severity] || "#6b7280" }}
                    onClick={() => setExpandedIssue(isExpanded ? null : idx)}
                  >
                    <div className="pw-tk-issue-head">
                      <div className="pw-tk-issue-badges">
                        <span className="pw-tk-severity-badge" style={{
                          background: `${SEVERITY_COLORS[issue.severity]}15`,
                          color: SEVERITY_COLORS[issue.severity],
                        }}>
                          {SEVERITY_LABELS[issue.severity] || issue.severity}
                        </span>
                        <span className="pw-tk-category-badge">
                          {issue.categoryLabel || cat?.label || issue.category}
                        </span>
                        {issue.characterName && (
                          <span className="pw-tk-char-badge">{issue.characterName}</span>
                        )}
                      </div>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", opacity: 0.3, flexShrink: 0 }}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                    {issue.quote && (
                      <p className="pw-tk-issue-quote">&ldquo;{issue.quote}&rdquo;</p>
                    )}
                    <p className="pw-tk-issue-text">{issue.issue}</p>
                    {isExpanded && (
                      <div className="pw-tk-issue-fix">
                        <strong>Suggested Fix:</strong> {issue.suggestion}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Clean state */}
      {scannedCategories.size > 0 && issues.length === 0 && !scanning && (
        <div className="pw-tk-clean">
          <ThreadKeeperLogo size={36} />
          <p className="pw-tk-clean-title">All Clear</p>
          <p className="pw-tk-clean-sub">No continuity issues found. Every thread holds.</p>
        </div>
      )}

      {/* Initial state — nothing scanned yet */}
      {scannedCategories.size === 0 && !scanning && (
        <div className="pw-tk-empty">
          <ThreadKeeperLogo size={40} />
          <p className="pw-tk-empty-title">Ready to Scan</p>
          <p className="pw-tk-empty-sub">
            Run a full scan to check canon traits, state drift, timelines, relationships, knowledge violations, and more — or tap individual categories above.
          </p>
        </div>
      )}
    </div>
  );
}
