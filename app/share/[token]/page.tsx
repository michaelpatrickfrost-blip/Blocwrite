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

const TYPE_META: Record<AnnotationType, { label: string; color: string; bg: string; border: string; lightBg: string }> = {
  comment:    { label: "Comment",    color: "#525252", bg: "rgba(82,82,82,0.08)",  border: "rgba(82,82,82,0.15)",   lightBg: "#fafafa" },
  suggestion: { label: "Suggestion", color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.15)",  lightBg: "#f0fdf4" },
  issue:      { label: "Issue",      color: "#dc2626", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.15)",  lightBg: "#fef2f2" },
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

  // Password gate state
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // Selection popup state
  const [selPopup, setSelPopup] = useState<{
    x: number; y: number; text: string; startOffset: number; endOffset: number;
  } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<AnnotationType>("comment");
  const contentRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  function loadShareData(d: ShareData) {
    setData(d);
    if (d.status === "submitted") setSubmitted(true);
    if (d.expiresAt) setExpiresAt(d.expiresAt);
    const existing: Annotation[] = [];
    d.chapters?.forEach((ch: Chapter) => {
      ch.annotations?.forEach((a: Annotation) => {
        existing.push({ ...a, sharedChapterId: ch.id });
      });
    });
    setAnnotations(existing);
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else if (d.requiresPassword) { setRequiresPassword(true); if (d.expiresAt) setExpiresAt(d.expiresAt); }
        else loadShareData(d);
      })
      .catch(() => setError("Failed to load shared content."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handlePasswordSubmit() {
    if (!passwordInput.trim()) return;
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const res = await fetch(`/api/share/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const d = await res.json();
      if (res.ok && d.chapters) { setRequiresPassword(false); loadShareData(d); }
      else setPasswordError(d.error || "Incorrect password.");
    } catch { setPasswordError("Network error. Please try again."); }
    finally { setPasswordLoading(false); }
  }

  const activeChapter = data?.chapters?.[activeChapterIdx] ?? null;
  const hasChapters = data && data.chapters && data.chapters.length > 0;

  const handleMouseUp = useCallback(() => {
    if (submitted) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const text = sel.toString().trim();
    if (!text || text.length < 3) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    let startOffset = 0;
    if (contentRef.current) {
      const preRange = document.createRange();
      preRange.selectNodeContents(contentRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      startOffset = preRange.toString().length;
    }
    setSelPopup({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
      text,
      startOffset,
      endOffset: startOffset + text.length,
    });
    setNoteText("");
    setNoteType("comment");
  }, [submitted]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setSelPopup(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close popup on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelPopup(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const addAnnotation = () => {
    if (!selPopup || !noteText.trim() || !activeChapter) return;
    setAnnotations((prev) => [...prev, {
      sharedChapterId: activeChapter.id,
      selectedText: selPopup.text, startOffset: selPopup.startOffset,
      endOffset: selPopup.endOffset, note: noteText.trim(), type: noteType,
    }]);
    setSelPopup(null);
    setNoteText("");
    window.getSelection()?.removeAllRanges();
  };

  const removeAnnotation = (idx: number) => setAnnotations((prev) => prev.filter((_, i) => i !== idx));
  const chapterAnnotations = annotations.filter((a) => activeChapter && a.sharedChapterId === activeChapter.id);

  const submitFeedback = async () => {
    if (annotations.length === 0 || !data) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/share/${token}/annotate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readerName: readerName.trim() || undefined,
          annotations: annotations.map((a) => ({
            sharedChapterId: a.sharedChapterId, selectedText: a.selectedText,
            startOffset: a.startOffset, endOffset: a.endOffset, note: a.note, type: a.type,
          })),
        }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error || "Failed to save."); return; }
      await fetch(`/api/share/${token}/submit`, { method: "POST" });
      setSubmitted(true);
    } catch { alert("Network error."); }
    finally { setSubmitting(false); }
  };

  function renderHighlightedContent(content: string, anns: Annotation[]) {
    if (anns.length === 0) {
      return content.split("\n\n").map((para, i) => (
        <p key={i} style={{ marginBottom: 22, lineHeight: 1.9 }}>{para || "\u00A0"}</p>
      ));
    }
    const sorted = [...anns].sort((a, b) => a.startOffset - b.startOffset);
    const parts: Array<{ text: string; ann?: Annotation }> = [];
    let cursor = 0;
    for (const ann of sorted) {
      if (ann.startOffset > cursor) parts.push({ text: content.slice(cursor, ann.startOffset) });
      parts.push({ text: content.slice(ann.startOffset, ann.endOffset), ann });
      cursor = ann.endOffset;
    }
    if (cursor < content.length) parts.push({ text: content.slice(cursor) });
    return (
      <div style={{ lineHeight: 1.9 }}>
        {parts.map((p, i) => p.ann ? (
          <mark key={i} title={`${p.ann.type}: ${p.ann.note}`} style={{
            background: TYPE_META[p.ann.type].lightBg,
            borderBottom: `2px solid ${TYPE_META[p.ann.type].color}`,
            borderRadius: 2, padding: "1px 0", cursor: "pointer",
          }}>{p.text}</mark>
        ) : <span key={i} style={{ whiteSpace: "pre-wrap" }}>{p.text}</span>)}
      </div>
    );
  }

  const daysRemaining = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  /* ── Shared styles ── */
  const closeBtnStyle: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer",
    width: 28, height: 28, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#94a3b8", transition: "all 0.12s",
  };

  /* ── Full-page states ── */

  if (loading) return (
    <div style={S.fullCenter}>
      <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 28, marginBottom: 20, opacity: 0.15 }} />
      <div style={S.spinner} />
      <p style={{ color: "#94a3b8", marginTop: 14, fontSize: 13 }}>Loading shared content...</p>
    </div>
  );

  if (error) return (
    <div style={S.fullCenter}>
      <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 28, marginBottom: 24, opacity: 0.15 }} />
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginTop: 14 }}>Link Unavailable</h2>
      <p style={{ color: "#64748b", marginTop: 6, maxWidth: 340, textAlign: "center", lineHeight: 1.6, fontSize: 14 }}>{error}</p>
      <a href="/" style={{ marginTop: 20, fontSize: 13, color: "#94a3b8", textDecoration: "none" }}>← Back to Blocwrite</a>
    </div>
  );

  if (requiresPassword) return (
    <div style={S.fullCenter}>
      <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 28, marginBottom: 28, opacity: 0.15 }} />
      <div style={{
        background: "#fff", borderRadius: 16, padding: "36px 32px", width: "100%", maxWidth: 380,
        boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>Password Protected</h2>
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
            This content requires a password to view.
            {daysRemaining !== null && <><br/>Link expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.</>}
          </p>
        </div>
        <div>
          <input
            type="password" placeholder="Enter password" value={passwordInput}
            onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSubmit(); }}
            autoFocus
            style={{
              width: "100%", padding: "12px 14px", fontSize: 14, borderRadius: 10,
              border: passwordError ? "1.5px solid #ef4444" : "1px solid #e2e8f0",
              background: "#f8fafc", color: "#1e293b", fontFamily: "inherit", outline: "none",
              boxSizing: "border-box",
            }}
          />
          {passwordError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>{passwordError}</p>}
          <button onClick={handlePasswordSubmit} disabled={passwordLoading || !passwordInput.trim()} style={{
            width: "100%", marginTop: 12, padding: "12px 0", fontSize: 14, fontWeight: 600,
            borderRadius: 10, border: "none", cursor: passwordInput.trim() ? "pointer" : "default",
            background: passwordInput.trim() ? "#1e293b" : "#e2e8f0",
            color: passwordInput.trim() ? "#fff" : "#94a3b8",
            opacity: passwordLoading ? 0.6 : 1, transition: "all 0.15s",
          }}>
            {passwordLoading ? "Verifying..." : "Unlock"}
          </button>
        </div>
      </div>
      <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 24 }}>Shared via Blocwrite</p>
    </div>
  );

  if (submitted) return (
    <div style={S.fullCenter}>
      <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 28, marginBottom: 24, opacity: 0.15 }} />
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><polyline points="20 6 9 17 4 12"/></svg>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginTop: 14 }}>Feedback Submitted</h2>
      <p style={{ color: "#64748b", marginTop: 6, maxWidth: 380, textAlign: "center", lineHeight: 1.6, fontSize: 14 }}>
        Thank you{readerName ? `, ${readerName}` : ""}! Your notes have been sent to the author.
      </p>
    </div>
  );

  /* ── No chapters shared ── */
  if (!data || !hasChapters) return (
    <div style={S.fullCenter}>
      <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 28, marginBottom: 24, opacity: 0.15 }} />
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginTop: 14 }}>No Chapters Available</h2>
      <p style={{ color: "#64748b", marginTop: 6, maxWidth: 360, textAlign: "center", lineHeight: 1.6, fontSize: 14 }}>
        The author hasn&apos;t shared any chapters with this link yet. Check back later or contact them for an updated link.
      </p>
      {daysRemaining !== null && (
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>
          This link expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.
        </p>
      )}
      <a href="/" style={{ marginTop: 20, fontSize: 13, color: "#94a3b8", textDecoration: "none" }}>← Back to Blocwrite</a>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#1e293b", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* ── Top bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #e2e8f0",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 20, opacity: 0.15, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, flexShrink: 0 }}>Shared for feedback</span>
            {daysRemaining !== null && (
              <span style={{
                fontSize: 11, flexShrink: 0,
                color: daysRemaining <= 3 ? "#ea580c" : "#94a3b8",
                fontWeight: daysRemaining <= 3 ? 600 : 400,
              }}>
                · {daysRemaining}d left
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {annotations.length > 0 && (
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                {annotations.length} note{annotations.length !== 1 ? "s" : ""}
              </span>
            )}
            <input
              type="text" placeholder="Your name (optional)" value={readerName}
              onChange={(e) => setReaderName(e.target.value)}
              style={{
                fontSize: 13, padding: "7px 12px", borderRadius: 8,
                border: "1px solid #e2e8f0", background: "#fff",
                color: "#1e293b", width: 150, outline: "none", fontFamily: "inherit",
              }}
            />
            <button onClick={submitFeedback} disabled={submitting || annotations.length === 0} style={{
              fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8,
              border: "none",
              background: annotations.length === 0 ? "#e2e8f0" : "#1e293b",
              color: annotations.length === 0 ? "#94a3b8" : "#fff",
              cursor: annotations.length === 0 ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1, transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}>
              {submitting ? "Sending..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", minHeight: "calc(100vh - 56px)" }}>

        {/* ── Chapter sidebar ── */}
        {data.chapters.length > 1 && (
          <aside style={{
            width: 220, padding: "20px 12px", borderRight: "1px solid #e2e8f0",
            flexShrink: 0, overflowY: "auto", background: "#fff",
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, padding: "0 8px" }}>
              Chapters
            </p>
            {data.chapters.map((ch, idx) => {
              const count = annotations.filter((a) => a.sharedChapterId === ch.id).length;
              const active = idx === activeChapterIdx;
              return (
                <button key={ch.id} onClick={() => setActiveChapterIdx(idx)} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8,
                  border: "none", cursor: "pointer", marginBottom: 2,
                  background: active ? "#f1f5f9" : "transparent",
                  color: active ? "#1e293b" : "#64748b",
                  fontWeight: active ? 600 : 400, fontSize: 13, transition: "all 0.12s",
                  fontFamily: "inherit",
                }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ch.title || `Chapter ${idx + 1}`}
                  </span>
                  {count > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10, background: "#f1f5f9", color: "#64748b", flexShrink: 0, marginLeft: 6 }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </aside>
        )}

        {/* ── Main reading area ── */}
        <main style={{ flex: 1, padding: "40px 48px", maxWidth: 720, background: "#fff", minHeight: "100%" }}>
          {activeChapter ? (
            <>
              <div style={{ marginBottom: 28, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                {data.chapters.length > 1 && (
                  <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                    Chapter {activeChapterIdx + 1} of {data.chapters.length}
                  </p>
                )}
                <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em", margin: 0 }}>
                  {activeChapter.title || `Chapter ${activeChapterIdx + 1}`}
                </h2>
                {!submitted && (
                  <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 8, lineHeight: 1.5 }}>
                    Highlight any text to leave a note for the author.
                  </p>
                )}
              </div>

              {/* Content */}
              {activeChapter.content ? (
                <div ref={contentRef} onMouseUp={handleMouseUp} style={{
                  fontSize: 16, color: "#334155", userSelect: "text", cursor: "text",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}>
                  {renderHighlightedContent(activeChapter.content, chapterAnnotations)}
                </div>
              ) : (
                <div style={{ padding: "60px 20px", textAlign: "center" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <p style={{ fontSize: 14, color: "#94a3b8" }}>This chapter has no content yet.</p>
                </div>
              )}

              {/* Notes list */}
              {chapterAnnotations.length > 0 && (
                <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #f1f5f9" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#64748b" }}>
                    Your Notes ({chapterAnnotations.length})
                  </p>
                  <div style={{ display: "grid", gap: 8 }}>
                    {chapterAnnotations.map((ann, i) => {
                      const globalIdx = annotations.indexOf(ann);
                      const meta = TYPE_META[ann.type];
                      return (
                        <div key={i} style={{
                          padding: "12px 14px", borderRadius: 10,
                          background: meta.lightBg, border: `1px solid ${meta.border}`,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: meta.bg, color: meta.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                              {meta.label}
                            </span>
                            {!submitted && (
                              <button
                                onClick={() => removeAnnotation(globalIdx)}
                                title="Remove note"
                                style={{
                                  ...closeBtnStyle,
                                  width: 22, height: 22, borderRadius: 6,
                                  color: "#94a3b8", fontSize: 14,
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.05)"; e.currentTarget.style.color = "#ef4444"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#94a3b8"; }}
                              >&times;</button>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: "#64748b", fontStyle: "italic", margin: "4px 0", lineHeight: 1.5 }}>
                            &ldquo;{ann.selectedText.slice(0, 120)}{ann.selectedText.length > 120 ? "..." : ""}&rdquo;
                          </p>
                          <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, marginTop: 4, marginBottom: 0 }}>{ann.note}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chapter navigation */}
              {data.chapters.length > 1 && (
                <div style={{
                  display: "flex", justifyContent: "space-between", marginTop: 48, paddingTop: 20,
                  borderTop: "1px solid #f1f5f9",
                }}>
                  <button onClick={() => setActiveChapterIdx((i) => Math.max(0, i - 1))} disabled={activeChapterIdx === 0} style={{
                    fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 8,
                    border: "1px solid #e2e8f0", background: "#fff",
                    color: activeChapterIdx === 0 ? "#cbd5e1" : "#475569",
                    cursor: activeChapterIdx === 0 ? "default" : "pointer",
                    fontFamily: "inherit",
                  }}>
                    ← Previous
                  </button>
                  <button onClick={() => setActiveChapterIdx((i) => Math.min(data.chapters.length - 1, i + 1))} disabled={activeChapterIdx === data.chapters.length - 1} style={{
                    fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 8,
                    border: "1px solid #e2e8f0", background: "#fff",
                    color: activeChapterIdx === data.chapters.length - 1 ? "#cbd5e1" : "#475569",
                    cursor: activeChapterIdx === data.chapters.length - 1 ? "default" : "pointer",
                    fontFamily: "inherit",
                  }}>
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#94a3b8" }}>Select a chapter from the sidebar to start reading.</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "48px 0 24px" }}>
            <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 16, opacity: 0.08 }} />
            <p style={{ fontSize: 10, color: "#cbd5e1", marginTop: 8 }}>&copy; {new Date().getFullYear()} Blocwrite</p>
          </div>
        </main>
      </div>

      {/* ── Annotation popup — appears below selection ── */}
      {selPopup && (
        <div ref={popupRef} style={{
          position: "fixed",
          left: Math.min(Math.max(selPopup.x - 170, 16), (typeof window !== "undefined" ? window.innerWidth : 900) - 360),
          top: Math.min(selPopup.y, (typeof window !== "undefined" ? window.innerHeight : 700) - 320),
          width: 340, background: "#fff", borderRadius: 14,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
          padding: "14px 16px", zIndex: 1000,
        }}>
          {/* Close X */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: "#64748b", fontStyle: "italic", lineHeight: 1.4, margin: 0, flex: 1, paddingRight: 8 }}>
              &ldquo;{selPopup.text.slice(0, 60)}{selPopup.text.length > 60 ? "..." : ""}&rdquo;
            </p>
            <button
              onClick={() => setSelPopup(null)}
              title="Close"
              style={{
                ...closeBtnStyle, flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {(["comment", "suggestion", "issue"] as AnnotationType[]).map((t) => (
              <button key={t} onClick={() => setNoteType(t)} style={{
                flex: 1, fontSize: 11, fontWeight: 600, padding: "6px 0", borderRadius: 7,
                border: noteType === t ? `1.5px solid ${TYPE_META[t].color}` : "1.5px solid #e2e8f0",
                background: noteType === t ? TYPE_META[t].lightBg : "#fff",
                color: noteType === t ? TYPE_META[t].color : "#94a3b8",
                cursor: "pointer", textTransform: "capitalize", transition: "all 0.12s",
                fontFamily: "inherit",
              }}>{t}</button>
            ))}
          </div>

          <textarea
            autoFocus placeholder="Type your note here..." value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            style={{
              width: "100%", minHeight: 72, fontSize: 13, padding: "10px 12px", borderRadius: 8,
              border: "1px solid #e2e8f0", background: "#f8fafc",
              color: "#1e293b", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, outline: "none",
              boxSizing: "border-box",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addAnnotation();
              if (e.key === "Escape") setSelPopup(null);
            }}
          />
          <p style={{ fontSize: 10, color: "#cbd5e1", margin: "4px 0 10px", textAlign: "right" }}>
            Cmd+Enter to add · Esc to close
          </p>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button onClick={() => setSelPopup(null)} style={{
              fontSize: 12, padding: "7px 16px", borderRadius: 8,
              border: "1px solid #e2e8f0", background: "#fff",
              color: "#64748b", cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
            <button onClick={addAnnotation} disabled={!noteText.trim()} style={{
              fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8,
              border: "none",
              background: noteText.trim() ? "#1e293b" : "#e2e8f0",
              color: noteText.trim() ? "#fff" : "#94a3b8",
              cursor: noteText.trim() ? "pointer" : "default",
              fontFamily: "inherit",
            }}>Add Note</button>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  fullCenter: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    minHeight: "100vh", background: "#f8fafc", padding: 24,
  },
  spinner: {
    width: 28, height: 28, border: "2.5px solid #e2e8f0",
    borderTopColor: "#475569", borderRadius: "50%", animation: "spin 0.7s linear infinite",
  },
};
