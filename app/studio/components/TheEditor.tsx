"use client";

import { useState, useMemo } from "react";

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

const SEVERITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6b7280",
};

/* ─── Helpers ─── */

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ─── Props ─── */

type TheEditorProps = {
  open: boolean;
  onClose: () => void;
  chapterTitle: string;
  /** Current loading phase label */
  loadingPhase: string | null;
  error: string | null;
  result: EditorResult | null;
  onRun: (mode: EditorMode, targetedFocus?: TargetedFocus) => Promise<void>;
  /** Called with final text after user accepts changes */
  onApply: (revisedText: string) => void;
  /** Called to fix issues from a report */
  onFixIssues: (issues: EditorialIssue[]) => Promise<void>;
  /** Original paragraphs for reconstruction */
  originalParagraphs: string[];
  /** Update the result (for accept/reject toggling) */
  onResultUpdate: (result: EditorResult) => void;
};

/* ─── Component ─── */

export function TheEditor({
  open,
  onClose,
  chapterTitle,
  loadingPhase,
  error,
  result,
  onRun,
  onApply,
  onFixIssues,
  originalParagraphs,
  onResultUpdate,
}: TheEditorProps) {
  const loading = !!loadingPhase;

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

  const handleRun = () => {
    void onRun("quick-fix");
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

  return (
    <div className="pw-modal-overlay" onClick={onClose}>
      <div
        className="pw-chapter-review-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 760, maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="pw-chapter-review-head" style={{ flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 22, letterSpacing: "-0.02em" }}>The Editor</h2>
            <p style={{ opacity: 0.6, fontSize: 13, marginTop: 2 }}>{chapterTitle}</p>
          </div>
          <button type="button" className="pw-bible-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "0 0 16px" }}>
          <p className="pw-chapter-review-desc" style={{ marginBottom: 16 }}>
            Professional chapter-level editing. Enhances prose, catches inconsistencies, respects your story.
          </p>

          <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 12, lineHeight: 1.5 }}>
            Safe polish and continuity pass — checks prose quality plus scene/place consistency across the chapter. Only changed paragraphs are returned for speed.
          </div>

          {/* Run button */}
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRun}
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading
                ? loadingPhase
                : "Run Editor Check"}
            </button>
          </div>

          {/* Error */}
          {error && <p className="pw-chapter-review-error">{error}</p>}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{
                width: 28, height: 28, border: "2px solid var(--pw-border, #333)",
                borderTopColor: "var(--pw-accent, #a3e635)", borderRadius: "50%",
                animation: "spin 0.8s linear infinite", margin: "0 auto 10px",
              }} />
              <p style={{ fontSize: 13, opacity: 0.6 }}>{loadingPhase}</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* ═══ RESULTS ═══ */}
          {!loading && result && (
            <div style={{ marginTop: 4 }}>
              {/* Summary bar */}
              <div style={{
                padding: "10px 14px",
                background: "var(--pw-surface, #1a1a1a)",
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 13,
                lineHeight: 1.5,
                border: "1px solid var(--pw-border, #333)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.4, letterSpacing: "0.06em" }}>Summary</strong>
                  <p style={{ marginTop: 4 }}>{result.summary}</p>
                </div>
                {result.changes && result.changes.length > 0 && (
                  <div style={{ textAlign: "right", flexShrink: 0, fontSize: 12, opacity: 0.6 }}>
                    <div>{totalChanges} edit{totalChanges !== 1 ? "s" : ""}</div>
                    {wordDelta !== 0 && (
                      <div style={{ color: wordDelta < 0 ? "#f87171" : "#a3e635" }}>
                        {wordDelta > 0 ? "+" : ""}{wordDelta} words
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── Quick Fix / Targeted: Per-change review ─── */}
              {(result.mode === "quick-fix" || result.mode === "targeted") && result.changes && result.changes.length > 0 && (
                <>
                  {/* Batch actions */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    <button type="button" className="btn" onClick={acceptAll} style={{ fontSize: 12, padding: "5px 12px" }}>
                      Accept All
                    </button>
                    <button type="button" className="btn" onClick={rejectAll} style={{ fontSize: 12, padding: "5px 12px" }}>
                      Reject All
                    </button>
                    <div style={{ flex: 1 }} />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleApply}
                      disabled={acceptedCount === 0}
                      style={{ fontSize: 12, padding: "5px 14px" }}
                    >
                      Apply {acceptedCount} Change{acceptedCount !== 1 ? "s" : ""}
                    </button>
                  </div>

                  {/* Change cards */}
                  {result.changes.map((change, idx) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom: 8,
                        borderRadius: 8,
                        border: change.accepted === true
                          ? "1px solid rgba(163,230,53,0.4)"
                          : change.accepted === false
                          ? "1px solid rgba(239,68,68,0.3)"
                          : "1px solid var(--pw-border, #333)",
                        background: change.accepted === true
                          ? "rgba(163,230,53,0.04)"
                          : change.accepted === false
                          ? "rgba(239,68,68,0.03)"
                          : "var(--pw-surface, #1a1a1a)",
                        overflow: "hidden",
                        opacity: change.accepted === false ? 0.5 : 1,
                        transition: "all 0.15s",
                      }}
                    >
                      {/* Change header */}
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px",
                        borderBottom: "1px solid var(--pw-border, #222)",
                        fontSize: 12,
                      }}>
                        <span style={{ opacity: 0.5 }}>Paragraph {change.paragraphIndex + 1}</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => toggleChange(idx, change.accepted === true ? null : true)}
                            style={{
                              padding: "3px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                              border: change.accepted === true ? "1px solid #a3e635" : "1px solid var(--pw-border, #444)",
                              background: change.accepted === true ? "rgba(163,230,53,0.15)" : "transparent",
                              color: change.accepted === true ? "#a3e635" : "var(--pw-text, #fff)",
                            }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleChange(idx, change.accepted === false ? null : false)}
                            style={{
                              padding: "3px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                              border: change.accepted === false ? "1px solid #ef4444" : "1px solid var(--pw-border, #444)",
                              background: change.accepted === false ? "rgba(239,68,68,0.15)" : "transparent",
                              color: change.accepted === false ? "#ef4444" : "var(--pw-text, #fff)",
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                      {/* Reason */}
                      <div style={{ padding: "6px 12px", fontSize: 12, opacity: 0.6, fontStyle: "italic" }}>
                        {change.reason}
                      </div>

                      {/* Diff view */}
                      <div style={{ display: "flex", gap: 0, fontSize: 13, lineHeight: 1.6 }}>
                        {/* Original */}
                        <div style={{
                          flex: 1, padding: "8px 12px",
                          borderRight: "1px solid var(--pw-border, #222)",
                          background: "rgba(239,68,68,0.03)",
                        }}>
                          <div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.35, marginBottom: 4, letterSpacing: "0.06em" }}>Before</div>
                          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {change.original.length > 400 ? `${change.original.slice(0, 400)}...` : change.original}
                          </div>
                        </div>
                        {/* Revised */}
                        <div style={{
                          flex: 1, padding: "8px 12px",
                          background: "rgba(163,230,53,0.03)",
                        }}>
                          <div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.35, marginBottom: 4, letterSpacing: "0.06em" }}>After</div>
                          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {change.revised.length > 400 ? `${change.revised.slice(0, 400)}...` : change.revised}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {(result.mode === "quick-fix" || result.mode === "targeted") && (!result.changes || result.changes.length === 0) && (
                <p className="pw-chapter-review-empty">No changes needed. Chapter looks clean.</p>
              )}

              {/* ─── Report: issue cards ─── */}
              {result.mode === "report" && result.issues && result.issues.length > 0 && (
                <>
                  {/* Fix Issues bridge */}
                  <div style={{ marginBottom: 10 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void onFixIssues(result.issues ?? [])}
                      disabled={loading}
                      style={{ width: "100%", fontSize: 13 }}
                    >
                      Fix These Issues (Quick Fix)
                    </button>
                  </div>

                  <div className="pw-chapter-review-grid">
                    {result.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "10px 14px",
                          background: "var(--pw-surface, #1a1a1a)",
                          borderRadius: 8,
                          borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity] || "#6b7280"}`,
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", opacity: 0.6 }}>{issue.category}</span>
                          <span style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: `${SEVERITY_COLORS[issue.severity]}22`,
                            color: SEVERITY_COLORS[issue.severity],
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}>
                            {issue.severity}
                          </span>
                        </div>
                        {issue.quote && (
                          <p style={{ fontSize: 12, fontStyle: "italic", opacity: 0.5, marginBottom: 4 }}>&ldquo;{issue.quote}&rdquo;</p>
                        )}
                        <p style={{ fontSize: 13, marginBottom: 2 }}>{issue.issue}</p>
                        <p style={{ fontSize: 12, opacity: 0.6 }}>Suggestion: {issue.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {result.mode === "report" && (!result.issues || result.issues.length === 0) && (
                <p className="pw-chapter-review-empty">No issues found. Chapter looks clean.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
