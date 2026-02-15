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
  /** User decision: null=pending, true=accepted, false=dismissed */
  accepted?: boolean | null;
};

export type ThreadKeeperCategory = {
  id: ThreadKeeperCategoryId;
  label: string;
  shortLabel: string;
  layer: ThreadKeeperLayer;
  description: string;
  icon: string;
};

/* ─── Category definitions ─── */

export const THREADKEEPER_CATEGORIES: ThreadKeeperCategory[] = [
  // Layer 1 — Instant checks
  { id: "canon-traits", label: "Canon Traits", shortLabel: "Canon", layer: 1, description: "Physical traits vs Canon", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
  { id: "object-props", label: "Object & Props", shortLabel: "Objects", layer: 1, description: "Item continuity", icon: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" },
  { id: "character-presence", label: "Character Presence", shortLabel: "Presence", layer: 1, description: "Who appears vs plan", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
  // Layer 2 — AI-assisted
  { id: "state-drift", label: "State Drift", shortLabel: "State", layer: 2, description: "Injuries, conditions between chapters", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
  { id: "timeline", label: "Timeline", shortLabel: "Time", layer: 2, description: "Event order, time logic", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "relationships", label: "Relationships", shortLabel: "Relations", layer: 2, description: "Emotional state consistency", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  { id: "knowledge", label: "Knowledge", shortLabel: "Knowledge", layer: 2, description: "Who knows what", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
  { id: "spatial-logic", label: "Spatial Logic", shortLabel: "Spatial", layer: 2, description: "Physical location logic", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  // Layer 3 — Deep AI
  { id: "emotional-arc", label: "Emotional Arc", shortLabel: "Emotion", layer: 3, description: "Proportional reactions", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { id: "setup-payoff", label: "Setup / Payoff", shortLabel: "Threads", layer: 3, description: "Open loops, foreshadowing", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
  { id: "voice-drift", label: "Voice Drift", shortLabel: "Voice", layer: 3, description: "Speech pattern consistency", icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" },
];

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
    extractTraitPhrases(character.appearance).forEach((t) => traits.push({ ...t, field: "appearance" }));
  }
  if (character.backstory) {
    extractTraitPhrases(character.backstory).forEach((t) => traits.push({ ...t, field: "backstory" }));
  }
  return traits;
}

function normalizeTraitValue(trait: string, value: string): string {
  return value.toLowerCase().replace(/\s+(eyes?|hair)\s*$/i, "").trim();
}

export function runCanonTraitChecks(characters: Character[], chapterProse: string): ThreadKeeperIssue[] {
  const issues: ThreadKeeperIssue[] = [];
  const lower = chapterProse.toLowerCase();
  for (const char of characters) {
    if (!char.name || !lower.includes(char.name.toLowerCase())) continue;
    const canonTraits = extractCanonTraits(char);
    const proseTraits = extractTraitPhrases(chapterProse);
    const canonByType = new Map<string, { value: string; field: string }>();
    for (const ct of canonTraits) {
      if (!canonByType.has(ct.trait)) canonByType.set(ct.trait, { value: ct.value, field: ct.field });
    }
    for (const pt of proseTraits) {
      const canon = canonByType.get(pt.trait);
      if (!canon) continue;
      const canonNorm = normalizeTraitValue(pt.trait, canon.value);
      const proseNorm = normalizeTraitValue(pt.trait, pt.value);
      if (canonNorm && proseNorm && canonNorm !== proseNorm) {
        const charIdx = lower.indexOf(char.name.toLowerCase());
        const traitIdx = lower.indexOf(pt.value.toLowerCase());
        if (Math.abs(charIdx - traitIdx) < 500) {
          issues.push({
            severity: "high", category: "canon-traits", categoryLabel: "Canon Violation",
            quote: pt.value,
            issue: `Canon states ${char.name} has "${canon.value}" (${canon.field}), but the prose says "${pt.value}".`,
            suggestion: `Change "${pt.value}" to match Canon: "${canon.value}".`,
            characterName: char.name, field: canon.field, accepted: null,
          });
        }
      }
    }
  }
  return issues;
}

export function runObjectPropChecks(items: Item[], chapterProse: string, allChapters: Chapter[], currentChapterIndex: number): ThreadKeeperIssue[] {
  const issues: ThreadKeeperIssue[] = [];
  if (items.length === 0) return issues;
  const lower = chapterProse.toLowerCase();
  for (const item of items) {
    if (!item.name || !lower.includes(item.name.toLowerCase())) continue;
    const lostPatterns = [
      `destroyed the ${item.name.toLowerCase()}`, `lost the ${item.name.toLowerCase()}`,
      `${item.name.toLowerCase()} was destroyed`, `${item.name.toLowerCase()} was lost`,
      `gave away the ${item.name.toLowerCase()}`, `burned the ${item.name.toLowerCase()}`,
    ];
    for (let i = 0; i < currentChapterIndex; i++) {
      const prevProse = extractProseFromContent(allChapters[i].content).toLowerCase();
      for (const pattern of lostPatterns) {
        if (prevProse.includes(pattern)) {
          issues.push({
            severity: "medium", category: "object-props", categoryLabel: "Object Continuity",
            issue: `"${item.name}" appears in this chapter, but Chapter ${i + 1} ("${allChapters[i].title}") indicates it was lost/destroyed.`,
            suggestion: `Explain how "${item.name}" was recovered, or remove the reference.`,
            accepted: null,
          });
          break;
        }
      }
    }
  }
  return issues;
}

export function runCharacterPresenceChecks(characters: Character[], chapterProse: string, planCharacterIds: string[]): ThreadKeeperIssue[] {
  const issues: ThreadKeeperIssue[] = [];
  const lower = chapterProse.toLowerCase();
  for (const char of characters) {
    if (!char.name) continue;
    const inProse = lower.includes(char.name.toLowerCase());
    const inPlan = planCharacterIds.includes(char.id);
    if (inProse && !inPlan && planCharacterIds.length > 0) {
      issues.push({
        severity: "low", category: "character-presence", categoryLabel: "Character Presence",
        issue: `${char.name} is mentioned in the prose but is not listed in the chapter plan.`,
        suggestion: `Either add ${char.name} to the chapter plan, or verify they should appear here.`,
        characterName: char.name, accepted: null,
      });
    }
  }
  for (const charId of planCharacterIds) {
    const char = characters.find((c) => c.id === charId);
    if (!char || !char.name) continue;
    if (!lower.includes(char.name.toLowerCase())) {
      issues.push({
        severity: "low", category: "character-presence", categoryLabel: "Character Presence",
        issue: `${char.name} is listed in the chapter plan but never mentioned in the prose.`,
        suggestion: `Include ${char.name} in the scene, or remove them from the plan.`,
        characterName: char.name, accepted: null,
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
  onRunAiCheck: (
    categoryId: ThreadKeeperCategoryId,
    context: { chapterProse: string; prevChapterProse: string; nextChapterProse: string; canonSummary: string },
  ) => Promise<ThreadKeeperIssue[]>;
  wordCount: number;
};

/* ─── Component ─── */

export function ThreadKeeper({
  chapterProse, chapterTitle, chapterNumber, totalChapters,
  storyBible, allChapters, currentChapterIndex, planCharacterIds,
  onRunAiCheck, wordCount,
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
    for (const iss of issues) {
      const arr = map.get(iss.category) ?? [];
      arr.push(iss);
      map.set(iss.category, arr);
    }
    return map;
  }, [issues]);

  const prevProse = currentChapterIndex > 0 ? extractProseFromContent(allChapters[currentChapterIndex - 1].content) : "";
  const nextProse = currentChapterIndex + 1 < allChapters.length ? extractProseFromContent(allChapters[currentChapterIndex + 1].content) : "";

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
      if (catId === "canon-traits") newIssues = runCanonTraitChecks(characters, chapterProse);
      else if (catId === "object-props") newIssues = runObjectPropChecks(items, chapterProse, allChapters, currentChapterIndex);
      else if (catId === "character-presence") newIssues = runCharacterPresenceChecks(characters, chapterProse, planCharacterIds);
    } else {
      try {
        newIssues = await onRunAiCheck(catId, { chapterProse, prevChapterProse: prevProse, nextChapterProse: nextProse, canonSummary: buildCanonSummary() });
      } catch { newIssues = []; }
    }
    // Ensure all new issues have accepted = null
    newIssues = newIssues.map((i) => ({ ...i, accepted: i.accepted ?? null }));
    setIssues((prev) => [...prev.filter((i) => i.category !== catId), ...newIssues]);
    setScannedCategories((prev) => new Set([...prev, catId]));
  }

  async function runFullScan() {
    setScanning(true);
    setIssues([]);
    setScannedCategories(new Set());
    setExpandedIssue(null);
    for (const cat of THREADKEEPER_CATEGORIES) {
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

  function toggleIssue(idx: number, value: boolean | null) {
    setIssues((prev) => prev.map((iss, i) => i === idx ? { ...iss, accepted: value } : iss));
  }

  function acceptAll() {
    setIssues((prev) => prev.map((iss) => ({ ...iss, accepted: true })));
  }

  function dismissAll() {
    setIssues((prev) => prev.map((iss) => ({ ...iss, accepted: false })));
  }

  const pendingCount = issues.filter((i) => i.accepted === null || i.accepted === undefined).length;
  const acceptedCount = issues.filter((i) => i.accepted === true).length;
  const dismissedCount = issues.filter((i) => i.accepted === false).length;
  const highCount = issues.filter((i) => i.severity === "high").length;
  const medCount = issues.filter((i) => i.severity === "medium").length;
  const lowCount = issues.filter((i) => i.severity === "low").length;

  const sortedIssues = useMemo(() =>
    [...issues].sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
    }),
    [issues],
  );

  return (
    <div>
      {/* ═══ Run bar ═══ */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, marginBottom: 16,
        padding: "12px 16px", background: "var(--pw-surface-alt, #161616)",
        borderRadius: 10, border: "1px solid var(--pw-border-light, #2a2a2a)",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Continuity Check</div>
          <div style={{ fontSize: 12, opacity: 0.5, lineHeight: 1.4 }}>
            Scan for canon violations, state drift, timeline errors, and more
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void runFullScan()}
          disabled={scanning}
          style={{ flexShrink: 0, padding: "10px 20px", fontSize: 13, fontWeight: 600 }}
        >
          {scanning ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff", borderRadius: "50%",
                animation: "spin 0.7s linear infinite", display: "inline-block",
              }} />
              {scanningLabel ? `${scanningLabel}...` : "Scanning..."}
            </span>
          ) : "Run Full Scan"}
        </button>
      </div>

      {/* ═══ Category pills ═══ */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {THREADKEEPER_CATEGORIES.map((cat) => {
          const catIssues = issuesByCategory.get(cat.id) ?? [];
          const isScanned = scannedCategories.has(cat.id);
          const isActive = scanning && scanningLabel === cat.label;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => void runSingleCategory(cat.id)}
              disabled={scanning}
              title={cat.description}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 10px", fontSize: 11, fontWeight: 500,
                color: isActive ? "var(--pw-accent, #a3e635)" : isScanned ? "var(--pw-text, #f0f0f0)" : "var(--pw-text-dim, #888)",
                background: isActive ? "rgba(var(--pw-accent-rgb, 163,230,53), 0.06)" : "var(--pw-surface-alt, #161616)",
                border: `1px solid ${isActive ? "rgba(var(--pw-accent-rgb, 163,230,53), 0.2)" : "var(--pw-border-light, #2a2a2a)"}`,
                borderRadius: 6, cursor: scanning ? "default" : "pointer",
                transition: "all 0.15s", opacity: scanning && !isActive ? 0.5 : 1,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={cat.icon} /></svg>
              {cat.shortLabel}
              {isActive && (
                <span style={{
                  width: 8, height: 8, border: "1.5px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.3)",
                  borderTopColor: "var(--pw-accent, #a3e635)", borderRadius: "50%",
                  animation: "spin 0.7s linear infinite", display: "inline-block",
                }} />
              )}
              {isScanned && catIssues.length > 0 && (
                <span style={{
                  minWidth: 14, height: 14, padding: "0 3px", borderRadius: 7,
                  fontSize: 9, fontWeight: 700, color: "#fff", display: "inline-flex",
                  alignItems: "center", justifyContent: "center",
                  background: catIssues.some((i) => i.severity === "high") ? "#ef4444" : catIssues.some((i) => i.severity === "medium") ? "#f59e0b" : "#6b7280",
                }}>
                  {catIssues.length}
                </span>
              )}
              {isScanned && catIssues.length === 0 && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ Results ═══ */}
      {issues.length > 0 && (
        <div>
          {/* Batch actions bar — matches existing Editor pattern */}
          <div style={{
            display: "flex", gap: 8, marginBottom: 14, alignItems: "center",
            padding: "8px 12px", borderRadius: 8,
            background: "var(--pw-surface-alt, #161616)",
            border: "1px solid var(--pw-border-light, #2a2a2a)",
            flexWrap: "wrap",
          }}>
            <button type="button" className="btn" onClick={acceptAll}
              style={{ fontSize: 11, padding: "5px 12px", fontWeight: 600 }}>
              Accept All
            </button>
            <button type="button" className="btn" onClick={dismissAll}
              style={{ fontSize: 11, padding: "5px 12px", fontWeight: 600 }}>
              Dismiss All
            </button>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 11, opacity: 0.4 }}>
              {acceptedCount} accepted &middot; {pendingCount} pending &middot; {dismissedCount} dismissed
            </div>
            {highCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444" }}>{highCount} critical</span>}
            {medCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b" }}>{medCount} warning{medCount !== 1 ? "s" : ""}</span>}
            {lowCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280" }}>{lowCount} minor</span>}
          </div>

          {/* Issue cards */}
          <div style={{ display: "grid", gap: 8 }}>
            {sortedIssues.map((issue, idx) => {
              const realIdx = issues.indexOf(issue);
              const isExpanded = expandedIssue === realIdx;
              return (
                <div
                  key={realIdx}
                  style={{
                    borderRadius: 10,
                    border: issue.accepted === true
                      ? "1px solid rgba(163,230,53,0.35)"
                      : issue.accepted === false
                      ? "1px solid rgba(239,68,68,0.2)"
                      : "1px solid var(--pw-border, #333)",
                    borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity] || "#6b7280"}`,
                    background: issue.accepted === true
                      ? "rgba(163,230,53,0.03)"
                      : issue.accepted === false
                      ? "rgba(239,68,68,0.02)"
                      : "var(--pw-surface, #1a1a1a)",
                    overflow: "hidden",
                    opacity: issue.accepted === false ? 0.45 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {/* Header row */}
                  <div
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px", cursor: "pointer",
                    }}
                    onClick={() => setExpandedIssue(isExpanded ? null : realIdx)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", opacity: 0.4, flexShrink: 0 }}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: "0.05em", padding: "2px 7px", borderRadius: 4,
                        background: `${SEVERITY_COLORS[issue.severity]}15`,
                        color: SEVERITY_COLORS[issue.severity], flexShrink: 0,
                      }}>
                        {SEVERITY_LABELS[issue.severity]}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--pw-text-muted)", flexShrink: 0 }}>
                        {issue.categoryLabel}
                      </span>
                      {issue.characterName && (
                        <span style={{ fontSize: 10, opacity: 0.4, flexShrink: 0 }}>{issue.characterName}</span>
                      )}
                      <span style={{
                        fontSize: 12, opacity: 0.7, fontStyle: "italic",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {issue.issue.slice(0, 80)}{issue.issue.length > 80 ? "..." : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleIssue(realIdx, issue.accepted === true ? null : true); }}
                        style={{
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          border: issue.accepted === true ? "1px solid rgba(163,230,53,0.5)" : "1px solid var(--pw-border, #444)",
                          background: issue.accepted === true ? "rgba(163,230,53,0.12)" : "transparent",
                          color: issue.accepted === true ? "#a3e635" : "var(--pw-text-dim, #aaa)",
                          transition: "all 0.12s",
                        }}
                      >
                        {issue.accepted === true ? "✓ Accepted" : "Accept"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleIssue(realIdx, issue.accepted === false ? null : false); }}
                        style={{
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          border: issue.accepted === false ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--pw-border, #444)",
                          background: issue.accepted === false ? "rgba(239,68,68,0.12)" : "transparent",
                          color: issue.accepted === false ? "#ef4444" : "var(--pw-text-dim, #aaa)",
                          transition: "all 0.12s",
                        }}
                      >
                        {issue.accepted === false ? "✗ Dismissed" : "Dismiss"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid var(--pw-border-light, #2a2a2a)", padding: "12px 14px" }}>
                      {issue.quote && (
                        <div style={{
                          padding: "8px 12px", marginBottom: 10, borderRadius: 6,
                          background: "rgba(255,255,255,0.02)",
                          borderLeft: `2px solid ${SEVERITY_COLORS[issue.severity]}44`,
                          fontStyle: "italic", fontSize: 13, opacity: 0.6,
                        }}>
                          &ldquo;{issue.quote}&rdquo;
                        </div>
                      )}
                      <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 10px", opacity: 0.85 }}>{issue.issue}</p>
                      <div style={{
                        padding: "10px 12px", borderRadius: 8, fontSize: 12, lineHeight: 1.5,
                        background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.03)",
                        border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
                      }}>
                        <strong style={{ color: "var(--pw-accent, #a3e635)", fontWeight: 700 }}>Suggested Fix:</strong> {issue.suggestion}
                      </div>
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
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 14, opacity: 0.5 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block", opacity: 0.6 }}>
            <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          No continuity issues found. Chapter looks clean.
        </div>
      )}

      {/* Initial state */}
      {scannedCategories.size === 0 && !scanning && (
        <div style={{ textAlign: "center", padding: "40px 0", opacity: 0.4 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block" }}>
            <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ fontSize: 14, margin: "0 0 4px" }}>Ready to run Continuity Check</p>
          <p style={{ fontSize: 12 }}>Scan for canon violations, state drift, timeline errors, and more</p>
          <p style={{ fontSize: 11, opacity: 0.6, marginTop: 12, maxWidth: 340, margin: "12px auto 0", lineHeight: 1.5 }}>
            Run a full scan or tap individual categories above. Instant checks run locally — AI checks need your configured provider.
          </p>
        </div>
      )}
    </div>
  );
}
