"use client";

import { useState, useMemo } from "react";
import { ThreadKeeper, type ThreadKeeperCategoryId, type ThreadKeeperIssue } from "./ThreadKeeper";
import type { StoryBible, Chapter } from "../studio-store";

/* ─── Types ─── */

export type EditorMode = "quick-fix" | "targeted" | "report";

export type TargetedFocus =
  | "pacing"
  | "dialogue"
  | "tension"
  | "exposition"
  | "action";

export type EditorialIssue = {
  severity: "high" | "medium" | "low";
  category: string;
  quote?: string;
  issue: string;
  suggestion: string;
};

/** A single paragraph-level change from the AI */
export type EditorChange = {
  paragraphIndex: number;
  original: string;
  revised: string;
  reason: string;
  accepted: boolean | null; // null = pending, true = accepted, false = rejected
};

export type EditorResult = {
  mode: EditorMode;
  /** For quick-fix and targeted: list of per-paragraph changes */
  changes?: EditorChange[];
  /** For report mode: list of issues */
  issues?: EditorialIssue[];
  /** Summary of what was changed/found */
  summary: string;
  /** Word count delta from all accepted changes */
  wordCountDelta?: number;
};

/* ─── Constants ─── */

export const TARGETED_OPTIONS: Array<{ id: TargetedFocus; label: string; desc: string }> = [
  { id: "pacing", label: "Improve Pacing", desc: "Tighten slow sections, sharpen scene transitions" },
  { id: "dialogue", label: "Strengthen Dialogue", desc: "Make exchanges snappier, voices more distinct" },
  { id: "tension", label: "Increase Tension", desc: "Raise stakes, sharpen conflict, build suspense" },
  { id: "exposition", label: "Reduce Exposition", desc: "Cut info-dumps, weave details into action" },
  { id: "action", label: "Clarify Action", desc: "Make physical movement and choreography clearer" },
];

/* Editor pass tabs */
type EditorTab = "threadkeeper" | "grammar" | "polish";

const EDITOR_TABS: Array<{
  id: EditorTab;
  label: string;
  desc: string;
  icon: string;
  mode: EditorMode;
  targetedFocus?: TargetedFocus;
  isThreadKeeper?: boolean;
}> = [
  {
    id: "threadkeeper",
    label: "Continuity",
    desc: "Canon violations, state drift, timeline errors, relationship breaks, knowledge violations, and more",
    icon: "M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    mode: "report",
    isThreadKeeper: true,
  },
  {
    id: "grammar",
    label: "Grammar & Style",
    desc: "Spelling, punctuation, sentence structure, tense agreement, and professional prose quality",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    mode: "quick-fix",
  },
  {
    id: "polish",
    label: "Final Polish",
    desc: "Tighten prose, vary sentence rhythm, cut filler, strengthen verbs, and elevate to publication standard",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    mode: "quick-fix",
  },
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

/* ─── Helpers ─── */

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

type DiffSegment = { type: "same" | "added" | "removed"; text: string };

function wordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  const m = oldWords.length;
  const n = newWords.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldWords[i - 1] === newWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const segments: DiffSegment[] = [];
  let i = m, j = n;
  const raw: DiffSegment[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      raw.push({ type: "same", text: oldWords[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ type: "added", text: newWords[j - 1] });
      j--;
    } else {
      raw.push({ type: "removed", text: oldWords[i - 1] });
      i--;
    }
  }
  raw.reverse();

  for (const seg of raw) {
    const last = segments[segments.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      segments.push({ ...seg });
    }
  }
  return segments;
}

/* ─── Props ─── */

type TheEditorProps = {
  open: boolean;
  onClose: () => void;
  chapterTitle: string;
  chapterNumber: number;
  totalChapters: number;
  /** Characters detected in this chapter */
  charactersInChapter: string[];
  /** Locations detected in this chapter */
  locationsInChapter: string[];
  /** Current loading phase label */
  loadingPhase: string | null;
  error: string | null;
  result: EditorResult | null;
  onRun: (mode: EditorMode, targetedFocus?: TargetedFocus, editorTab?: string) => Promise<void>;
  /** Called with final text after user accepts changes */
  onApply: (revisedText: string) => void;
  /** Called to fix issues from a report */
  onFixIssues: (issues: EditorialIssue[]) => Promise<void>;
  /** Original paragraphs for reconstruction */
  originalParagraphs: string[];
  /** Update the result (for accept/reject toggling) */
  onResultUpdate: (result: EditorResult) => void;
  /** Word count of this chapter */
  wordCount: number;
  /** ThreadKeeper props */
  chapterProse: string;
  storyBible: StoryBible;
  allChapters: Chapter[];
  currentChapterIndex: number;
  planCharacterIds: string[];
  planLocationIds: string[];
  onThreadKeeperAiCheck: (
    categoryId: ThreadKeeperCategoryId,
    context: {
      chapterProse: string;
      prevChapterProse: string;
      nextChapterProse: string;
      canonSummary: string;
    },
  ) => Promise<ThreadKeeperIssue[]>;
};

/* ─── Component ─── */

export function TheEditor({
  open,
  onClose,
  chapterTitle,
  chapterNumber,
  totalChapters,
  charactersInChapter,
  locationsInChapter,
  loadingPhase,
  error,
  result,
  onRun,
  onApply,
  onFixIssues,
  originalParagraphs,
  onResultUpdate,
  wordCount,
  chapterProse,
  storyBible,
  allChapters,
  currentChapterIndex,
  planCharacterIds,
  planLocationIds,
  onThreadKeeperAiCheck,
}: TheEditorProps) {
  const loading = !!loadingPhase;
  const [activeTab, setActiveTab] = useState<EditorTab>("threadkeeper");
  const [expandedChange, setExpandedChange] = useState<number | null>(null);

  /* Compute the assembled text and word delta from accepted changes */
  const { assembledText, wordDelta, acceptedCount, pendingCount, totalChanges } = useMemo(() => {
    if (!result?.changes || result.changes.length === 0) {
      return { assembledText: "", wordDelta: 0, acceptedCount: 0, pendingCount: 0, totalChanges: 0 };
    }
    const paragraphs = [...originalParagraphs];
    let delta = 0;
    let accepted = 0;
    let pending = 0;
    for (const c of result.changes) {
      if (c.accepted === true) {
        paragraphs[c.paragraphIndex] = c.revised;
        delta += countWords(c.revised) - countWords(c.original);
        accepted++;
      } else if (c.accepted === null) {
        pending++;
      }
    }
    return {
      assembledText: paragraphs.join("\n\n"),
      wordDelta: delta,
      acceptedCount: accepted,
      pendingCount: pending,
      totalChanges: result.changes.length,
    };
  }, [result, originalParagraphs]);

  if (!open) return null;

  const currentTabConfig = EDITOR_TABS.find((t) => t.id === activeTab)!;

  const handleRun = () => {
    void onRun(currentTabConfig.mode, currentTabConfig.targetedFocus, activeTab);
  };

  const handleApply = () => {
    if (assembledText) {
      onApply(assembledText);
    }
  };

  const toggleChange = (idx: number, accepted: boolean | null) => {
    if (!result?.changes) return;
    const updated = result.changes.map((c, i) => (i === idx ? { ...c, accepted } : c));
    onResultUpdate({ ...result, changes: updated });
  };

  const acceptAll = () => {
    if (!result?.changes) return;
    const updated = result.changes.map((c) => ({ ...c, accepted: true as boolean | null }));
    onResultUpdate({ ...result, changes: updated });
  };

  const rejectAll = () => {
    if (!result?.changes) return;
    const updated = result.changes.map((c) => ({ ...c, accepted: false as boolean | null }));
    onResultUpdate({ ...result, changes: updated });
  };

  const handleTabSwitch = (tab: EditorTab) => {
    setActiveTab(tab);
    // Clear results when switching tabs so stale results don't confuse
    if (result) {
      onResultUpdate({ ...result, changes: undefined, issues: undefined, summary: "" });
    }
  };

  return (
    <div className="pw-modal-overlay" onClick={onClose}>
      <div
        className="pw-chapter-review-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 820, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* ═══ HEADER ═══ */}
        <div style={{
          flexShrink: 0,
          padding: "20px 24px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>The Editor</h2>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                background: "var(--pw-accent-muted, rgba(163,230,53,0.1))",
                color: "var(--pw-accent, #a3e635)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Chapter {chapterNumber}/{totalChapters}
              </span>
            </div>
            <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>{chapterTitle}</p>
          </div>
          <button type="button" className="pw-bible-close" onClick={onClose} aria-label="Close" style={{ marginTop: -4 }}>
            &times;
          </button>
        </div>

        {/* ═══ CONTEXT BAR ═══ */}
        <div style={{
          display: "flex", gap: 12, padding: "12px 24px",
          fontSize: 11, color: "var(--pw-text-dim, #888)",
          flexWrap: "wrap", alignItems: "center",
          borderBottom: "1px solid var(--pw-border-light, #2a2a2a)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            <span>{wordCount.toLocaleString()} words</span>
          </div>
          {charactersInChapter.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>{charactersInChapter.slice(0, 4).join(", ")}{charactersInChapter.length > 4 ? ` +${charactersInChapter.length - 4}` : ""}</span>
            </div>
          )}
          {locationsInChapter.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{locationsInChapter.slice(0, 3).join(", ")}{locationsInChapter.length > 3 ? ` +${locationsInChapter.length - 3}` : ""}</span>
            </div>
          )}
          <div style={{ marginLeft: "auto", opacity: 0.5 }}>
            AI reads adjacent chapters for continuity
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div style={{
          display: "flex", gap: 0, padding: "0 24px",
          borderBottom: "1px solid var(--pw-border-light, #2a2a2a)",
          flexShrink: 0,
        }}>
          {EDITOR_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabSwitch(tab.id)}
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "12px 16px",
                fontSize: 13, fontWeight: activeTab === tab.id ? 650 : 500,
                color: activeTab === tab.id ? "var(--pw-accent, #a3e635)" : "var(--pw-text-dim, #888)",
                background: "none", border: "none", cursor: loading ? "default" : "pointer",
                borderBottom: activeTab === tab.id ? "2px solid var(--pw-accent, #a3e635)" : "2px solid transparent",
                transition: "all 0.15s",
                opacity: loading && activeTab !== tab.id ? 0.4 : 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ BODY ═══ */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 24px 24px" }}>
          {/* ═══ ThreadKeeper tab — dedicated component ═══ */}
          {activeTab === "threadkeeper" && (
            <ThreadKeeper
              chapterProse={chapterProse}
              chapterTitle={chapterTitle}
              chapterNumber={chapterNumber}
              totalChapters={totalChapters}
              storyBible={storyBible}
              allChapters={allChapters}
              currentChapterIndex={currentChapterIndex}
              planCharacterIds={planCharacterIds}
              planLocationIds={planLocationIds}
              onRunAiCheck={onThreadKeeperAiCheck}
              wordCount={wordCount}
            />
          )}

          {/* ═══ Grammar & Polish tabs — original editor flow ═══ */}
          {activeTab !== "threadkeeper" && (
          <>
          {/* Tab description + Run button */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            marginBottom: 16,
            padding: "12px 16px",
            background: "var(--pw-surface-alt, #161616)",
            borderRadius: 10,
            border: "1px solid var(--pw-border-light, #2a2a2a)",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                {currentTabConfig.label}
              </div>
              <div style={{ fontSize: 12, opacity: 0.5, lineHeight: 1.4 }}>
                {currentTabConfig.desc}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRun}
              disabled={loading}
              style={{ flexShrink: 0, padding: "10px 20px", fontSize: 13, fontWeight: 600 }}
            >
              {loading ? loadingPhase : `Run ${currentTabConfig.label}`}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: "12px 14px", borderRadius: 8, marginBottom: 12,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              fontSize: 13, color: "#f87171",
            }}>
              <p style={{ margin: "0 0 4px" }}>{error}</p>
              {(error.toLowerCase().includes("timeout") || error.toLowerCase().includes("timed out") || error.toLowerCase().includes("slow")) && (
                <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>
                  Tip: Slower models can take longer. Try running again, or switch to a faster model in your settings.
                </p>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{
                width: 32, height: 32, border: "2px solid var(--pw-border, #333)",
                borderTopColor: "var(--pw-accent, #a3e635)", borderRadius: "50%",
                animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
              }} />
              <p style={{ fontSize: 13, opacity: 0.6, margin: 0 }}>{loadingPhase}</p>
              <p style={{ fontSize: 11, opacity: 0.3, marginTop: 4 }}>
                Analysing against your Canon, adjacent chapters, and style rules
              </p>
              <p style={{ fontSize: 11, opacity: 0.25, marginTop: 10, maxWidth: 340, margin: "10px auto 0", lineHeight: 1.5 }}>
                Slower models may take a few minutes per section. Don&apos;t close this window — the editor will keep working.
              </p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* ═══ RESULTS ═══ */}
          {!loading && result && (
            <div>
              {/* Summary card */}
              {result.summary && (
                <div style={{
                  padding: "12px 16px",
                  background: "var(--pw-surface, #1a1a1a)",
                  borderRadius: 10,
                  marginBottom: 14,
                  fontSize: 13,
                  lineHeight: 1.6,
                  border: "1px solid var(--pw-border, #333)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        opacity: 0.35, letterSpacing: "0.08em", marginBottom: 6,
                      }}>
                        Summary
                      </div>
                      <p style={{ margin: 0 }}>{result.summary}</p>
                    </div>
                    {result.changes && result.changes.length > 0 && (
                      <div style={{ textAlign: "right", flexShrink: 0, fontSize: 12, opacity: 0.6 }}>
                        <div style={{ fontWeight: 600 }}>{totalChanges} edit{totalChanges !== 1 ? "s" : ""}</div>
                        {wordDelta !== 0 && (
                          <div style={{ color: wordDelta < 0 ? "#f87171" : "#a3e635", fontSize: 11 }}>
                            {wordDelta > 0 ? "+" : ""}{wordDelta} words
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── REPORT: Issue cards (Consistency tab) ─── */}
              {result.mode === "report" && result.issues && result.issues.length > 0 && (
                <>
                  {/* Fix Issues bridge */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void onFixIssues(result.issues ?? [])}
                      disabled={loading}
                      style={{ fontSize: 13, padding: "8px 18px" }}
                    >
                      Auto-Fix These Issues
                    </button>
                    <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 4 }}>
                      AI will fix only the issues found — you review each change
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {result.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "12px 16px",
                          background: "var(--pw-surface, #1a1a1a)",
                          borderRadius: 10,
                          borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity] || "#6b7280"}`,
                          border: `1px solid var(--pw-border, #333)`,
                          borderLeftWidth: 3,
                          borderLeftColor: SEVERITY_COLORS[issue.severity] || "#6b7280",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                              background: `${SEVERITY_COLORS[issue.severity]}15`,
                              color: SEVERITY_COLORS[issue.severity],
                              textTransform: "uppercase", letterSpacing: "0.04em",
                            }}>
                              {SEVERITY_LABELS[issue.severity] || issue.severity}
                            </span>
                            <span style={{
                              fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                              opacity: 0.5, letterSpacing: "0.04em",
                            }}>
                              {issue.category}
                            </span>
                          </div>
                        </div>
                        {issue.quote && (
                          <p style={{
                            fontSize: 12, fontStyle: "italic", opacity: 0.4, marginBottom: 6,
                            padding: "4px 10px", borderLeft: "2px solid var(--pw-border, #444)",
                          }}>
                            &ldquo;{issue.quote}&rdquo;
                          </p>
                        )}
                        <p style={{ fontSize: 13, marginBottom: 4, lineHeight: 1.5 }}>{issue.issue}</p>
                        <p style={{ fontSize: 12, opacity: 0.5, lineHeight: 1.4 }}>
                          <strong style={{ fontWeight: 600, opacity: 0.7 }}>Fix:</strong> {issue.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {result.mode === "report" && (!result.issues || result.issues.length === 0) && (
                <div style={{
                  textAlign: "center", padding: "32px 0", fontSize: 14, opacity: 0.5,
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block", opacity: 0.6 }}>
                    <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  No consistency issues found. Chapter looks clean.
                </div>
              )}

              {/* ─── QUICK FIX / TARGETED: Per-change review ─── */}
              {(result.mode === "quick-fix" || result.mode === "targeted") && result.changes && result.changes.length > 0 && (
                <>
                  {/* Batch actions bar */}
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
                    <button type="button" className="btn" onClick={rejectAll}
                      style={{ fontSize: 11, padding: "5px 12px", fontWeight: 600 }}>
                      Reject All
                    </button>
                    <div style={{ flex: 1 }} />
                    <div style={{ fontSize: 11, opacity: 0.4 }}>
                      {acceptedCount} accepted &middot; {pendingCount} pending &middot; {totalChanges - acceptedCount - pendingCount} rejected
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleApply}
                      disabled={acceptedCount === 0}
                      style={{ fontSize: 12, padding: "6px 16px", fontWeight: 600 }}
                    >
                      Apply {acceptedCount} Change{acceptedCount !== 1 ? "s" : ""}
                    </button>
                  </div>

                  {/* Change cards */}
                  <div style={{ display: "grid", gap: 8 }}>
                    {result.changes.map((change, idx) => {
                      const isExpanded = expandedChange === idx;
                      return (
                        <div
                          key={idx}
                          style={{
                            borderRadius: 10,
                            border: change.accepted === true
                              ? "1px solid rgba(163,230,53,0.35)"
                              : change.accepted === false
                              ? "1px solid rgba(239,68,68,0.2)"
                              : "1px solid var(--pw-border, #333)",
                            background: change.accepted === true
                              ? "rgba(163,230,53,0.03)"
                              : change.accepted === false
                              ? "rgba(239,68,68,0.02)"
                              : "var(--pw-surface, #1a1a1a)",
                            overflow: "hidden",
                            opacity: change.accepted === false ? 0.45 : 1,
                            transition: "all 0.15s",
                          }}
                        >
                          {/* Change header */}
                          <div
                            style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "10px 14px",
                              cursor: "pointer",
                            }}
                            onClick={() => setExpandedChange(isExpanded ? null : idx)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", opacity: 0.4, flexShrink: 0 }}>
                                <path d="M9 18l6-6-6-6" />
                              </svg>
                              <span style={{ fontSize: 11, opacity: 0.4, flexShrink: 0 }}>P{change.paragraphIndex + 1}</span>
                              <span style={{
                                fontSize: 12, opacity: 0.7, fontStyle: "italic",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {change.reason}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleChange(idx, change.accepted === true ? null : true); }}
                                style={{
                                  padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  cursor: "pointer",
                                  border: change.accepted === true ? "1px solid rgba(163,230,53,0.5)" : "1px solid var(--pw-border, #444)",
                                  background: change.accepted === true ? "rgba(163,230,53,0.12)" : "transparent",
                                  color: change.accepted === true ? "#a3e635" : "var(--pw-text-dim, #aaa)",
                                  transition: "all 0.12s",
                                }}
                              >
                                {change.accepted === true ? "✓ Accepted" : "Accept"}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleChange(idx, change.accepted === false ? null : false); }}
                                style={{
                                  padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  cursor: "pointer",
                                  border: change.accepted === false ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--pw-border, #444)",
                                  background: change.accepted === false ? "rgba(239,68,68,0.12)" : "transparent",
                                  color: change.accepted === false ? "#ef4444" : "var(--pw-text-dim, #aaa)",
                                  transition: "all 0.12s",
                                }}
                              >
                                {change.accepted === false ? "✗ Rejected" : "Reject"}
                              </button>
                            </div>
                          </div>

                          {/* Expanded inline diff view */}
                          {isExpanded && (
                            <div style={{ borderTop: "1px solid var(--pw-border-light, #2a2a2a)", padding: "12px 16px" }}>
                              <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                {wordDiff(change.original, change.revised).map((seg, si) => (
                                  <span
                                    key={si}
                                    style={{
                                      background: seg.type === "removed" ? "rgba(239,68,68,0.15)"
                                        : seg.type === "added" ? "rgba(163,230,53,0.18)"
                                        : "transparent",
                                      textDecoration: seg.type === "removed" ? "line-through" : "none",
                                      color: seg.type === "removed" ? "#f87171"
                                        : seg.type === "added" ? "#a3e635"
                                        : "inherit",
                                      borderRadius: seg.type !== "same" ? 2 : undefined,
                                      padding: seg.type !== "same" ? "1px 0" : undefined,
                                    }}
                                  >
                                    {seg.text}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {(result.mode === "quick-fix" || result.mode === "targeted") && (!result.changes || result.changes.length === 0) && (
                <div style={{
                  textAlign: "center", padding: "32px 0", fontSize: 14, opacity: 0.5,
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block", opacity: 0.6 }}>
                    <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  No changes needed. Chapter looks clean.
                </div>
              )}
            </div>
          )}

          {/* No results yet — initial state */}
          {!loading && !result && !error && (
            <div style={{ textAlign: "center", padding: "40px 0", opacity: 0.4 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block" }}>
                <path d={currentTabConfig.icon} />
              </svg>
              <p style={{ fontSize: 14, margin: "0 0 4px" }}>Ready to run {currentTabConfig.label}</p>
              <p style={{ fontSize: 12 }}>{currentTabConfig.desc}</p>
              <p style={{ fontSize: 11, opacity: 0.6, marginTop: 12, maxWidth: 340, margin: "12px auto 0", lineHeight: 1.5 }}>
                Slower AI models may take longer. The editor will keep working — don&apos;t close this window.
              </p>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}
