"use client";

export type ConsistencyIssueType =
  | "synopsis_mismatch"
  | "continuity_gap"
  | "continuity_break"
  | "canon_violation"
  | "quality";

export type ConsistencyIssue = {
  type: ConsistencyIssueType;
  location?: string;
  quote?: string;
  suggestion: string;
  severity: "high" | "medium" | "low";
};

const ISSUE_TYPE_LABELS: Record<ConsistencyIssueType, { label: string; subtitle: string }> = {
  synopsis_mismatch: {
    label: "Synopsis match",
    subtitle: "Does the text align with this chapter's plan?",
  },
  continuity_gap: {
    label: "Continuity to next",
    subtitle: "Does it set up the next chapter?",
  },
  continuity_break: {
    label: "Continuity break",
    subtitle: "Contradicts or clashes with next chapter",
  },
  canon_violation: {
    label: "Canon",
    subtitle: "Character, world, or style violations",
  },
  quality: {
    label: "Quality",
    subtitle: "Prose, repetition, clarity",
  },
};

type ChapterReviewProps = {
  open: boolean;
  onClose: () => void;
  chapterTitle: string;
  issues: ConsistencyIssue[];
  loading: boolean;
  error: string | null;
  onRunReview: () => Promise<void>;
};

export function ChapterReview({
  open,
  onClose,
  chapterTitle,
  issues,
  loading,
  error,
  onRunReview,
}: ChapterReviewProps) {
  if (!open) return null;

  const byType = issues.reduce(
    (acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = [];
      acc[issue.type].push(issue);
      return acc;
    },
    {} as Record<ConsistencyIssueType, ConsistencyIssue[]>,
  );

  const categories = (
    ["synopsis_mismatch", "continuity_gap", "continuity_break", "canon_violation", "quality"] as const
  ).filter((t) => (byType[t]?.length ?? 0) > 0);

  return (
    <div className="pw-modal-overlay" onClick={onClose}>
      <div className="pw-chapter-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pw-chapter-review-head">
          <div>
            <h2>Chapter Review</h2>
            <p>{chapterTitle || "Untitled chapter"}</p>
          </div>
          <button type="button" className="pw-bible-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="pw-chapter-review-desc">
          Checks consistency with the chapter synopsis, the next chapter, and Canon. Run after AI generation.
        </p>

        <div className="pw-chapter-review-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void onRunReview()}
            disabled={loading}
          >
            {loading ? "Reviewing..." : "Run review"}
          </button>
        </div>

        {error && <p className="pw-chapter-review-error">{error}</p>}

        {loading ? (
          <p className="pw-chapter-review-empty">Analyzing chapter...</p>
        ) : issues.length === 0 && !error ? (
          <p className="pw-chapter-review-empty">
            No issues found. Run review to check synopsis match, continuity, and quality.
          </p>
        ) : (
          <div className="pw-chapter-review-grid">
            {categories.length > 0 ? (
              categories.map((type) => {
                const items = byType[type];
                const meta = ISSUE_TYPE_LABELS[type];
                return (
                  <section key={type} className="pw-chapter-review-card">
                    <div className="pw-chapter-review-card-head">
                      <h3>{meta.label}</h3>
                      <span className="pw-chapter-review-badge">{items.length}</span>
                    </div>
                    <p className="pw-chapter-review-card-sub">{meta.subtitle}</p>
                    <div className="pw-chapter-review-list">
                      {items.map((issue, idx) => (
                        <div key={`${type}-${idx}`} className="pw-chapter-review-item">
                          {issue.quote && (
                            <p className="pw-chapter-review-quote">&quot;{issue.quote}&quot;</p>
                          )}
                          <p className="pw-chapter-review-suggestion">{issue.suggestion}</p>
                          {issue.location && (
                            <p className="pw-chapter-review-location">{issue.location}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })
            ) : (
              <p className="pw-chapter-review-empty">No issues found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
