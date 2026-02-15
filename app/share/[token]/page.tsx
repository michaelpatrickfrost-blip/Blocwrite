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
  comment:    { label: "Comment",    color: "#475569", bg: "rgba(71,85,105,0.08)",  border: "rgba(71,85,105,0.18)",  lightBg: "#f8fafc" },
  suggestion: { label: "Suggestion", color: "#059669", bg: "rgba(5,150,105,0.08)",  border: "rgba(5,150,105,0.18)",  lightBg: "#ecfdf5" },
  issue:      { label: "Issue",      color: "#dc2626", bg: "rgba(220,38,38,0.06)",  border: "rgba(220,38,38,0.15)",  lightBg: "#fef2f2" },
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

  // Sidebar collapsed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  const multipleChapters = data && data.chapters && data.chapters.length > 1;

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

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setSelPopup(null); setSidebarOpen(false); }
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
        <p key={i} style={{ marginBottom: 24, lineHeight: 1.9 }}>{para || "\u00A0"}</p>
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

  /* ── Full-page states ── */

  if (loading) return (
    <div style={S.fullCenter}>
      <div style={S.spinner} />
      <p style={{ color: "#64748b", marginTop: 16, fontSize: 14, fontWeight: 500 }}>Loading manuscript...</p>
    </div>
  );

  if (error) return (
    <div style={S.fullCenter}>
      <div style={S.iconCircle}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
      </div>
      <h2 style={S.title}>Link Unavailable</h2>
      <p style={S.subtitle}>{error}</p>
      <a href="/" style={S.backLink}>Back to Blocwrite</a>
    </div>
  );

  if (requiresPassword) return (
    <div style={S.fullCenter}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ ...S.iconCircle, margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Password Protected</h2>
          <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
            Enter the password to read this manuscript.
            {daysRemaining !== null && <><br/><span style={{ fontSize: 13 }}>Link expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.</span></>}
          </p>
        </div>
        <div>
          <input
            type="password" placeholder="Enter password" value={passwordInput}
            onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSubmit(); }}
            autoFocus
            style={{
              width: "100%", padding: "13px 16px", fontSize: 15, borderRadius: 12,
              border: passwordError ? "2px solid #ef4444" : "1.5px solid #e2e8f0",
              background: "#f8fafc", color: "#0f172a", fontFamily: "inherit", outline: "none",
              boxSizing: "border-box", transition: "border-color 0.15s",
            }}
          />
          {passwordError && <p style={{ fontSize: 13, color: "#ef4444", marginTop: 8 }}>{passwordError}</p>}
          <button onClick={handlePasswordSubmit} disabled={passwordLoading || !passwordInput.trim()} style={{
            width: "100%", marginTop: 14, padding: "13px 0", fontSize: 15, fontWeight: 600,
            borderRadius: 12, border: "none", cursor: passwordInput.trim() ? "pointer" : "default",
            background: passwordInput.trim() ? "#0f172a" : "#e2e8f0",
            color: passwordInput.trim() ? "#fff" : "#94a3b8",
            opacity: passwordLoading ? 0.6 : 1, transition: "all 0.2s",
            fontFamily: "inherit",
          }}>
            {passwordLoading ? "Verifying..." : "Unlock"}
          </button>
        </div>
      </div>
      <a href="/" style={{ ...S.backLink, marginTop: 28 }}>Back to Blocwrite</a>
    </div>
  );

  if (submitted) return (
    <div style={S.fullCenter}>
      <div style={{ ...S.iconCircle, background: "#ecfdf5", border: "1px solid #d1fae5" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 style={S.title}>Feedback Submitted</h2>
      <p style={S.subtitle}>
        Thank you{readerName ? `, ${readerName}` : ""}! Your notes have been sent to the author.
      </p>
      <a href="/" style={S.backLink}>Back to Blocwrite</a>
    </div>
  );

  /* ── No chapters shared ── */
  if (!data || !hasChapters) return (
    <div style={S.fullCenter}>
      <div style={S.iconCircle}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <h2 style={S.title}>No Chapters Available</h2>
      <p style={S.subtitle}>
        The author hasn&apos;t shared any chapters with this link yet.<br/>Check back later or contact them for an updated link.
      </p>
      {daysRemaining !== null && (
        <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 8 }}>
          Link expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.
        </p>
      )}
      <a href="/" style={S.backLink}>Back to Blocwrite</a>
    </div>
  );

  /* ── Main reader UI ── */
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      color: "#1e293b",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
    }}>
      {/* Inline keyframes */}
      <style>{`
        @keyframes shareSpin { to { transform: rotate(360deg); } }
        @keyframes shareSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ── Top bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.88)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto", padding: "0 24px",
          height: 56, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <img src="/blocwrite-logo-dark.png" alt="Blocwrite" style={{ height: 18, opacity: 0.7, flexShrink: 0 }} />
            <div style={{ width: 1, height: 16, background: "#e2e8f0", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500, flexShrink: 0 }}>Shared manuscript</span>
            {daysRemaining !== null && (
              <span style={{
                fontSize: 11, flexShrink: 0, padding: "3px 8px", borderRadius: 6,
                background: daysRemaining <= 3 ? "#fef2f2" : "#f1f5f9",
                color: daysRemaining <= 3 ? "#dc2626" : "#64748b",
                fontWeight: 600,
              }}>
                {daysRemaining}d left
              </span>
            )}
            {/* Mobile chapter toggle */}
            {multipleChapters && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  display: "none", padding: "5px 10px", borderRadius: 8,
                  border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: "inherit",
                }}
                className="share-sidebar-toggle"
              >
                Ch. {activeChapterIdx + 1}
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {annotations.length > 0 && (
              <span style={{
                fontSize: 12, color: "#475569", fontWeight: 600,
                padding: "4px 10px", borderRadius: 8, background: "#f1f5f9",
              }}>
                {annotations.length} note{annotations.length !== 1 ? "s" : ""}
              </span>
            )}
            <input
              type="text" placeholder="Your name (optional)" value={readerName}
              onChange={(e) => setReaderName(e.target.value)}
              style={{
                fontSize: 13, padding: "8px 12px", borderRadius: 10,
                border: "1.5px solid #e2e8f0", background: "#fff",
                color: "#0f172a", width: 160, outline: "none", fontFamily: "inherit",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#94a3b8"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            />
            <button onClick={submitFeedback} disabled={submitting || annotations.length === 0} style={{
              fontSize: 13, fontWeight: 600, padding: "8px 20px", borderRadius: 10,
              border: "none",
              background: annotations.length === 0 ? "#e2e8f0" : "#0f172a",
              color: annotations.length === 0 ? "#94a3b8" : "#fff",
              cursor: annotations.length === 0 ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1, transition: "all 0.2s",
              whiteSpace: "nowrap", fontFamily: "inherit",
            }}>
              {submitting ? "Sending..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", minHeight: "calc(100vh - 56px)" }}>

        {/* ── Chapter sidebar ── */}
        {multipleChapters && (
          <aside style={{
            width: 240, padding: "24px 14px", borderRight: "1px solid rgba(0,0,0,0.06)",
            flexShrink: 0, overflowY: "auto", background: "#fff",
          }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 12, padding: "0 10px",
            }}>
              Chapters ({data.chapters.length})
            </p>
            {data.chapters.map((ch, idx) => {
              const count = annotations.filter((a) => a.sharedChapterId === ch.id).length;
              const active = idx === activeChapterIdx;
              return (
                <button key={ch.id} onClick={() => { setActiveChapterIdx(idx); setSidebarOpen(false); }} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10,
                  border: "none", cursor: "pointer", marginBottom: 2,
                  background: active ? "#f1f5f9" : "transparent",
                  color: active ? "#0f172a" : "#64748b",
                  fontWeight: active ? 600 : 400, fontSize: 13, transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {ch.title || `Chapter ${idx + 1}`}
                  </span>
                  {count > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                      background: active ? "#e2e8f0" : "#f1f5f9",
                      color: "#475569", flexShrink: 0, marginLeft: 8,
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </aside>
        )}

        {/* ── Main reading area ── */}
        <main style={{
          flex: 1, padding: "48px 56px", maxWidth: 740, background: "#fff",
          minHeight: "100%", borderRight: "1px solid rgba(0,0,0,0.03)",
        }}>
          {activeChapter ? (
            <>
              {/* Chapter heading */}
              <div style={{ marginBottom: 36 }}>
                {multipleChapters && (
                  <p style={{
                    fontSize: 12, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase",
                    letterSpacing: "0.05em", marginBottom: 8,
                  }}>
                    Chapter {activeChapterIdx + 1} of {data.chapters.length}
                  </p>
                )}
                <h2 style={{
                  fontSize: 28, fontWeight: 700, color: "#0f172a",
                  letterSpacing: "-0.02em", margin: 0, lineHeight: 1.3,
                }}>
                  {activeChapter.title || `Chapter ${activeChapterIdx + 1}`}
                </h2>
                {!submitted && (
                  <div style={{
                    marginTop: 16, padding: "12px 16px", borderRadius: 10,
                    background: "#f8fafc", border: "1px solid #f1f5f9",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                      <strong style={{ color: "#475569" }}>Highlight any text</strong> to leave a note for the author.
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "#f1f5f9", marginBottom: 36 }} />

              {/* Content */}
              {activeChapter.content ? (
                <div ref={contentRef} onMouseUp={handleMouseUp} style={{
                  fontSize: 17, color: "#334155", userSelect: "text", cursor: "text",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  letterSpacing: "0.01em",
                }}>
                  {renderHighlightedContent(activeChapter.content, chapterAnnotations)}
                </div>
              ) : (
                <div style={{ padding: "80px 20px", textAlign: "center" }}>
                  <div style={S.iconCircle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: 15, color: "#94a3b8", marginTop: 14 }}>This chapter has no content yet.</p>
                </div>
              )}

              {/* Notes list for this chapter */}
              {chapterAnnotations.length > 0 && (
                <div style={{ marginTop: 48, paddingTop: 28, borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#475569", margin: 0 }}>
                      Your Notes ({chapterAnnotations.length})
                    </p>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {chapterAnnotations.map((ann, i) => {
                      const globalIdx = annotations.indexOf(ann);
                      const meta = TYPE_META[ann.type];
                      return (
                        <div key={i} style={{
                          padding: "14px 16px", borderRadius: 12,
                          background: meta.lightBg, border: `1px solid ${meta.border}`,
                          animation: "shareSlideIn 0.2s ease",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                              background: meta.bg, color: meta.color, textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}>
                              {meta.label}
                            </span>
                            {!submitted && (
                              <button
                                onClick={() => removeAnnotation(globalIdx)}
                                title="Remove note"
                                style={{
                                  background: "none", border: "none", cursor: "pointer",
                                  width: 24, height: 24, borderRadius: 6,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "#cbd5e1", transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#ef4444"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#cbd5e1"; }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            )}
                          </div>
                          <p style={{ fontSize: 13, color: "#64748b", fontStyle: "italic", margin: "0 0 6px", lineHeight: 1.5 }}>
                            &ldquo;{ann.selectedText.slice(0, 120)}{ann.selectedText.length > 120 ? "..." : ""}&rdquo;
                          </p>
                          <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.6, margin: 0 }}>{ann.note}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chapter navigation */}
              {multipleChapters && (
                <div style={{
                  display: "flex", justifyContent: "space-between", marginTop: 48, paddingTop: 24,
                  borderTop: "1px solid #f1f5f9",
                }}>
                  <button onClick={() => setActiveChapterIdx((i) => Math.max(0, i - 1))} disabled={activeChapterIdx === 0} style={{
                    fontSize: 13, fontWeight: 500, padding: "10px 20px", borderRadius: 10,
                    border: "1.5px solid #e2e8f0", background: "#fff",
                    color: activeChapterIdx === 0 ? "#cbd5e1" : "#475569",
                    cursor: activeChapterIdx === 0 ? "default" : "pointer",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (activeChapterIdx > 0) e.currentTarget.style.borderColor = "#94a3b8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                  >
                    ← Previous
                  </button>
                  <button onClick={() => setActiveChapterIdx((i) => Math.min(data.chapters.length - 1, i + 1))} disabled={activeChapterIdx === data.chapters.length - 1} style={{
                    fontSize: 13, fontWeight: 500, padding: "10px 20px", borderRadius: 10,
                    border: "1.5px solid #e2e8f0", background: "#fff",
                    color: activeChapterIdx === data.chapters.length - 1 ? "#cbd5e1" : "#475569",
                    cursor: activeChapterIdx === data.chapters.length - 1 ? "default" : "pointer",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (activeChapterIdx < data.chapters.length - 1) e.currentTarget.style.borderColor = "#94a3b8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: "80px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 15, color: "#94a3b8" }}>Select a chapter from the sidebar to start reading.</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "56px 0 24px" }}>
            <img src="/blocwrite-logo-dark.png" alt="Blocwrite" style={{ height: 14, opacity: 0.12 }} />
            <p style={{ fontSize: 11, color: "#cbd5e1", marginTop: 8 }}>&copy; {new Date().getFullYear()} Blocwrite</p>
          </div>
        </main>
      </div>

      {/* ── Annotation popup ── */}
      {selPopup && (
        <div ref={popupRef} style={{
          position: "fixed",
          left: Math.min(Math.max(selPopup.x - 180, 16), (typeof window !== "undefined" ? window.innerWidth : 900) - 380),
          top: Math.min(selPopup.y, (typeof window !== "undefined" ? window.innerHeight : 700) - 340),
          width: 360, background: "#fff", borderRadius: 16,
          boxShadow: "0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
          padding: "18px 20px", zIndex: 1000,
          animation: "shareSlideIn 0.15s ease",
        }}>
          {/* Header with selected text and close */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ flex: 1, paddingRight: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" }}>Selected text</p>
              <p style={{ fontSize: 13, color: "#475569", fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>
                &ldquo;{selPopup.text.slice(0, 80)}{selPopup.text.length > 80 ? "..." : ""}&rdquo;
              </p>
            </div>
            <button
              onClick={() => setSelPopup(null)}
              title="Close"
              style={{
                background: "none", border: "none", cursor: "pointer",
                width: 28, height: 28, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#94a3b8", transition: "all 0.12s", flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#475569"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#94a3b8"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Type selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {(["comment", "suggestion", "issue"] as AnnotationType[]).map((t) => {
              const active = noteType === t;
              const meta = TYPE_META[t];
              return (
                <button key={t} onClick={() => setNoteType(t)} style={{
                  flex: 1, fontSize: 12, fontWeight: 600, padding: "7px 0", borderRadius: 8,
                  border: active ? `1.5px solid ${meta.color}` : "1.5px solid #e2e8f0",
                  background: active ? meta.lightBg : "#fff",
                  color: active ? meta.color : "#94a3b8",
                  cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s",
                  fontFamily: "inherit",
                }}>{t}</button>
              );
            })}
          </div>

          {/* Note input */}
          <textarea
            autoFocus placeholder="Write your note for the author..." value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            style={{
              width: "100%", minHeight: 80, fontSize: 14, padding: "12px 14px", borderRadius: 10,
              border: "1.5px solid #e2e8f0", background: "#f8fafc",
              color: "#0f172a", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, outline: "none",
              boxSizing: "border-box", transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#94a3b8"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addAnnotation();
              if (e.key === "Escape") setSelPopup(null);
            }}
          />
          <p style={{ fontSize: 11, color: "#cbd5e1", margin: "6px 0 14px", textAlign: "right" }}>
            {navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to add
          </p>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setSelPopup(null)} style={{
              fontSize: 13, padding: "8px 18px", borderRadius: 10,
              border: "1.5px solid #e2e8f0", background: "#fff",
              color: "#64748b", cursor: "pointer", fontFamily: "inherit",
              fontWeight: 500, transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#94a3b8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            >Cancel</button>
            <button onClick={addAnnotation} disabled={!noteText.trim()} style={{
              fontSize: 13, fontWeight: 600, padding: "8px 20px", borderRadius: 10,
              border: "none",
              background: noteText.trim() ? "#0f172a" : "#e2e8f0",
              color: noteText.trim() ? "#fff" : "#94a3b8",
              cursor: noteText.trim() ? "pointer" : "default",
              fontFamily: "inherit", transition: "all 0.2s",
            }}>Add Note</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared styles ── */
const S: Record<string, React.CSSProperties> = {
  fullCenter: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    minHeight: "100vh", background: "#f8fafc", padding: 32,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 16,
    background: "#f1f5f9", border: "1px solid #e2e8f0",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20, fontWeight: 700, color: "#0f172a", marginTop: 16, marginBottom: 0,
    letterSpacing: "-0.01em",
  },
  subtitle: {
    color: "#64748b", marginTop: 8, maxWidth: 380, textAlign: "center" as const,
    lineHeight: 1.6, fontSize: 15,
  },
  backLink: {
    marginTop: 20, fontSize: 13, color: "#94a3b8", textDecoration: "none",
    fontWeight: 500, transition: "color 0.15s",
  },
  spinner: {
    width: 32, height: 32, border: "3px solid #e2e8f0",
    borderTopColor: "#475569", borderRadius: "50%", animation: "shareSpin 0.7s linear infinite",
  },
};
