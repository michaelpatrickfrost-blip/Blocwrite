"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

type AnnotationType = "comment" | "suggestion" | "issue";

type Annotation = {
  id?: string;
  sharedChapterId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  note: string;
  type: AnnotationType;
  createdAt?: string;
};

type Chapter = {
  id: string;
  title: string;
  content: string;
  order: number;
  annotations: Annotation[];
};

type ShareData = {
  token: string;
  status: string;
  expiresAt: string;
  readerName: string | null;
  chapters: Chapter[];
};

const TYPE_COLORS: Record<AnnotationType, { bg: string; border: string; text: string; badge: string }> = {
  comment: { bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)", text: "#8b5cf6", badge: "rgba(139,92,246,0.15)" },
  suggestion: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", text: "#3b82f6", badge: "rgba(59,130,246,0.15)" },
  issue: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", text: "#ef4444", badge: "rgba(239,68,68,0.15)" },
};

export default function ShareReaderPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ShareData | null>(null);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [readerName, setReaderName] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selection popup state
  const [selPopup, setSelPopup] = useState<{
    x: number;
    y: number;
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<AnnotationType>("comment");
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch share data
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
          if (d.status === "submitted") setSubmitted(true);
          // Load existing annotations
          const existing: Annotation[] = [];
          d.chapters?.forEach((ch: Chapter) => {
            ch.annotations?.forEach((a: Annotation) => {
              existing.push({ ...a, sharedChapterId: ch.id });
            });
          });
          setAnnotations(existing);
        }
      })
      .catch(() => setError("Failed to load shared content."))
      .finally(() => setLoading(false));
  }, [token]);

  const activeChapter = data?.chapters?.[activeChapterIdx] ?? null;

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    if (submitted) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      return;
    }
    const text = sel.toString().trim();
    if (!text || text.length < 3) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate offset within the content div
    let startOffset = 0;
    let endOffset = 0;
    if (contentRef.current) {
      const preRange = document.createRange();
      preRange.selectNodeContents(contentRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      startOffset = preRange.toString().length;
      endOffset = startOffset + text.length;
    }

    setSelPopup({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      text,
      startOffset,
      endOffset,
    });
    setNoteText("");
    setNoteType("comment");
  }, [submitted]);

  // Close popup on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const popup = document.getElementById("annotation-popup");
      if (popup && !popup.contains(e.target as Node)) {
        setSelPopup(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addAnnotation = () => {
    if (!selPopup || !noteText.trim() || !activeChapter) return;
    const ann: Annotation = {
      sharedChapterId: activeChapter.id,
      selectedText: selPopup.text,
      startOffset: selPopup.startOffset,
      endOffset: selPopup.endOffset,
      note: noteText.trim(),
      type: noteType,
    };
    setAnnotations((prev) => [...prev, ann]);
    setSelPopup(null);
    setNoteText("");
    window.getSelection()?.removeAllRanges();
  };

  const removeAnnotation = (idx: number) => {
    setAnnotations((prev) => prev.filter((_, i) => i !== idx));
  };

  const chapterAnnotations = annotations.filter(
    (a) => activeChapter && a.sharedChapterId === activeChapter.id,
  );

  const submitFeedback = async () => {
    if (annotations.length === 0 || !data) return;
    setSubmitting(true);
    try {
      // Save annotations
      const res = await fetch(`/api/share/${token}/annotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readerName: readerName.trim() || undefined,
          annotations: annotations.map((a) => ({
            sharedChapterId: a.sharedChapterId,
            selectedText: a.selectedText,
            startOffset: a.startOffset,
            endOffset: a.endOffset,
            note: a.note,
            type: a.type,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed to save feedback.");
        return;
      }

      // Mark as submitted
      await fetch(`/api/share/${token}/submit`, { method: "POST" });
      setSubmitted(true);
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Highlight annotations in text
  function renderContentWithHighlights(content: string, chapterAnns: Annotation[]) {
    if (chapterAnns.length === 0) {
      return content.split("\n").map((para, i) => (
        <p key={i} style={{ marginBottom: 16, lineHeight: 1.8, minHeight: para.trim() ? undefined : 16 }}>
          {para || "\u00A0"}
        </p>
      ));
    }

    // Sort annotations by offset
    const sorted = [...chapterAnns].sort((a, b) => a.startOffset - b.startOffset);
    const flat = content;
    const parts: Array<{ text: string; ann?: Annotation }> = [];
    let cursor = 0;

    for (const ann of sorted) {
      if (ann.startOffset > cursor) {
        parts.push({ text: flat.slice(cursor, ann.startOffset) });
      }
      parts.push({ text: flat.slice(ann.startOffset, ann.endOffset), ann });
      cursor = ann.endOffset;
    }
    if (cursor < flat.length) {
      parts.push({ text: flat.slice(cursor) });
    }

    return (
      <div>
        {parts.map((part, i) =>
          part.ann ? (
            <mark
              key={i}
              style={{
                background: TYPE_COLORS[part.ann.type as AnnotationType]?.bg || "rgba(255,255,0,0.2)",
                borderBottom: `2px solid ${TYPE_COLORS[part.ann.type as AnnotationType]?.text || "#eab308"}`,
                borderRadius: 2,
                padding: "1px 0",
                cursor: "pointer",
              }}
              title={`${part.ann.type}: ${part.ann.note}`}
            >
              {part.text}
            </mark>
          ) : (
            <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part.text}</span>
          ),
        )}
      </div>
    );
  }

  // ── Error / Loading states ──
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <p style={{ color: "#6b7280", marginTop: 16 }}>Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.errorWrap}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1f2937", marginTop: 16 }}>Link Unavailable</h2>
          <p style={{ color: "#6b7280", marginTop: 8, maxWidth: 360, textAlign: "center", lineHeight: 1.6 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !activeChapter) return null;

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.errorWrap}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1f2937", marginTop: 16 }}>Feedback Submitted</h2>
          <p style={{ color: "#6b7280", marginTop: 8, maxWidth: 380, textAlign: "center", lineHeight: 1.6 }}>
            Thank you{readerName ? `, ${readerName}` : ""}! Your notes have been sent to the author. They&apos;ll review your feedback in their studio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1f2937" }}>Blocwrite Reader</h1>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
              Select text to add notes &middot; {annotations.length} note{annotations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={readerName}
              onChange={(e) => setReaderName(e.target.value)}
              style={styles.nameInput}
            />
            <button
              onClick={submitFeedback}
              disabled={submitting || annotations.length === 0}
              style={{
                ...styles.submitBtn,
                opacity: submitting || annotations.length === 0 ? 0.5 : 1,
              }}
            >
              {submitting ? "Sending..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      </header>

      <div style={styles.body}>
        {/* Chapter sidebar */}
        <aside style={styles.sidebar}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Chapters</p>
          {data.chapters.map((ch, idx) => {
            const count = annotations.filter((a) => a.sharedChapterId === ch.id).length;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChapterIdx(idx)}
                style={{
                  ...styles.chapterBtn,
                  background: idx === activeChapterIdx ? "#f3f4f6" : "transparent",
                  fontWeight: idx === activeChapterIdx ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 13 }}>{ch.title || `Chapter ${idx + 1}`}</span>
                {count > 0 && (
                  <span style={styles.badge}>{count}</span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Main content */}
        <main style={styles.main}>
          <div style={styles.chapterHeader}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1f2937" }}>
              {activeChapter.title || `Chapter ${activeChapterIdx + 1}`}
            </h2>
          </div>

          <div
            ref={contentRef}
            onMouseUp={handleMouseUp}
            style={styles.prose}
          >
            {renderContentWithHighlights(activeChapter.content, chapterAnnotations)}
          </div>

          {/* Annotations for this chapter */}
          {chapterAnnotations.length > 0 && (
            <div style={styles.annotationList}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#374151" }}>
                Your Notes ({chapterAnnotations.length})
              </p>
              {chapterAnnotations.map((ann, idx) => {
                const globalIdx = annotations.indexOf(ann);
                const colors = TYPE_COLORS[ann.type];
                return (
                  <div key={idx} style={{ ...styles.annotationCard, background: colors.bg, borderColor: colors.border }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ ...styles.typeBadge, background: colors.badge, color: colors.text }}>{ann.type}</span>
                      <button onClick={() => removeAnnotation(globalIdx)} style={styles.removeBtn}>&times;</button>
                    </div>
                    <p style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic", margin: "6px 0 4px", lineHeight: 1.5 }}>
                      &ldquo;{ann.selectedText.slice(0, 80)}{ann.selectedText.length > 80 ? "..." : ""}&rdquo;
                    </p>
                    <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{ann.note}</p>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Selection popup */}
      {selPopup && (
        <div
          id="annotation-popup"
          style={{
            position: "fixed",
            left: Math.min(selPopup.x - 160, window.innerWidth - 340),
            top: Math.max(selPopup.y - 200, 10),
            width: 320,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 8px 30px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontStyle: "italic" }}>
            &ldquo;{selPopup.text.slice(0, 60)}{selPopup.text.length > 60 ? "..." : ""}&rdquo;
          </p>

          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {(["comment", "suggestion", "issue"] as AnnotationType[]).map((t) => (
              <button
                key={t}
                onClick={() => setNoteType(t)}
                style={{
                  flex: 1,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 0",
                  borderRadius: 6,
                  border: `1.5px solid ${noteType === t ? TYPE_COLORS[t].text : "#e5e7eb"}`,
                  background: noteType === t ? TYPE_COLORS[t].bg : "transparent",
                  color: noteType === t ? TYPE_COLORS[t].text : "#6b7280",
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.15s",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <textarea
            autoFocus
            placeholder="Add your note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            style={{
              width: "100%",
              minHeight: 60,
              fontSize: 13,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
              outline: "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addAnnotation();
              if (e.key === "Escape") setSelPopup(null);
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
            <button
              onClick={() => setSelPopup(null)}
              style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={addAnnotation}
              disabled={!noteText.trim()}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: noteText.trim() ? "#1f2937" : "#d1d5db",
                color: "#fff",
                cursor: noteText.trim() ? "pointer" : "default",
              }}
            >
              Add Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ──
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#fafbfc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #e5e7eb",
    borderTopColor: "#1f2937",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: 24,
  },
  header: {
    position: "sticky" as const,
    top: 0,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #e5e7eb",
    zIndex: 100,
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "12px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameInput: {
    fontSize: 13,
    padding: "7px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    width: 180,
    outline: "none",
    fontFamily: "inherit",
  },
  submitBtn: {
    fontSize: 13,
    fontWeight: 600,
    padding: "8px 20px",
    borderRadius: 8,
    border: "none",
    background: "#1f2937",
    color: "#fff",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  body: {
    display: "flex",
    maxWidth: 1200,
    margin: "0 auto",
    minHeight: "calc(100vh - 60px)",
  },
  sidebar: {
    width: 220,
    padding: "20px 16px",
    borderRight: "1px solid #f3f4f6",
    flexShrink: 0,
  },
  chapterBtn: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    textAlign: "left" as const,
    padding: "8px 10px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    marginBottom: 2,
    transition: "background 0.15s",
    color: "#374151",
  },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: 10,
    background: "#8b5cf6",
    color: "#fff",
  },
  main: {
    flex: 1,
    padding: "32px 40px",
    maxWidth: 720,
  },
  chapterHeader: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "1px solid #f3f4f6",
  },
  prose: {
    fontSize: 15,
    lineHeight: 1.8,
    color: "#374151",
    userSelect: "text" as const,
    cursor: "text",
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
  },
  annotationList: {
    marginTop: 32,
    paddingTop: 20,
    borderTop: "1px solid #f3f4f6",
  },
  annotationCard: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid",
    marginBottom: 8,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 6,
    textTransform: "uppercase" as const,
  },
  removeBtn: {
    fontSize: 16,
    background: "none",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
};
