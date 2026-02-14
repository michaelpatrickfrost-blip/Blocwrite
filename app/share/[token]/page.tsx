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

const TYPE_META: Record<AnnotationType, { label: string; color: string; bg: string; border: string }> = {
  comment:    { label: "Comment",    color: "#8b5cf6", bg: "rgba(139,92,246,0.07)",  border: "rgba(139,92,246,0.18)" },
  suggestion: { label: "Suggestion", color: "#3b82f6", bg: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.18)" },
  issue:      { label: "Issue",      color: "#ef4444", bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.18)" },
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

  /** Load share data from API response */
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

  // Fetch share data
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else if (d.requiresPassword) {
          setRequiresPassword(true);
          if (d.expiresAt) setExpiresAt(d.expiresAt);
        } else {
          loadShareData(d);
        }
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
      if (res.ok && d.chapters) {
        setRequiresPassword(false);
        loadShareData(d);
      } else {
        setPasswordError(d.error || "Incorrect password.");
      }
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  }

  const activeChapter = data?.chapters?.[activeChapterIdx] ?? null;

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
    setSelPopup({ x: rect.left + rect.width / 2, y: rect.top - 10, text, startOffset, endOffset: startOffset + text.length });
    setNoteText("");
    setNoteType("comment");
  }, [submitted]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const popup = document.getElementById("bw-ann-popup");
      if (popup && !popup.contains(e.target as Node)) setSelPopup(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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
        <p key={i} style={{ marginBottom: 20, lineHeight: 1.85 }}>{para || "\u00A0"}</p>
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
      <div style={{ lineHeight: 1.85 }}>
        {parts.map((p, i) => p.ann ? (
          <mark key={i} title={`${p.ann.type}: ${p.ann.note}`} style={{
            background: TYPE_META[p.ann.type].bg, borderBottom: `2px solid ${TYPE_META[p.ann.type].color}`,
            borderRadius: 2, padding: "1px 0", cursor: "pointer",
          }}>{p.text}</mark>
        ) : <span key={i} style={{ whiteSpace: "pre-wrap" }}>{p.text}</span>)}
      </div>
    );
  }

  // Remaining days helper
  const daysRemaining = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  // ── Full-page states ──
  if (loading) return (
    <div style={S.fullCenter}>
      <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 32, marginBottom: 20, opacity: 0.4 }} />
      <div style={S.spinner} />
      <p style={{ color: "#9ca3af", marginTop: 14, fontSize: 13 }}>Loading shared content...</p>
    </div>
  );

  if (error) return (
    <div style={S.fullCenter}>
      <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 32, marginBottom: 24, opacity: 0.4 }} />
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f9fafb", marginTop: 14 }}>Link Unavailable</h2>
      <p style={{ color: "#9ca3af", marginTop: 6, maxWidth: 340, textAlign: "center", lineHeight: 1.6, fontSize: 14 }}>{error}</p>
    </div>
  );

  // ── Password gate screen ──
  if (requiresPassword) return (
    <div style={S.fullCenter}>
      <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 32, marginBottom: 28, opacity: 0.5 }} />
      <div style={{
        background: "#1a1a1a", borderRadius: 16, padding: "36px 32px", width: "100%", maxWidth: 380,
        boxShadow: "0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f9fafb", marginBottom: 6 }}>Password Protected</h2>
          <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.5 }}>
            This content requires a password to view.
            {daysRemaining !== null && <><br/>Link expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.</>}
          </p>
        </div>

        <div>
          <input
            type="password"
            placeholder="Enter password"
            value={passwordInput}
            onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSubmit(); }}
            autoFocus
            style={{
              width: "100%", padding: "12px 14px", fontSize: 14, borderRadius: 10,
              border: passwordError ? "1.5px solid #ef4444" : "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)", color: "#e5e7eb",
              fontFamily: "inherit", outline: "none",
            }}
          />
          {passwordError && (
            <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>{passwordError}</p>
          )}
          <button
            onClick={handlePasswordSubmit}
            disabled={passwordLoading || !passwordInput.trim()}
            style={{
              width: "100%", marginTop: 12, padding: "12px 0", fontSize: 14, fontWeight: 600,
              borderRadius: 10, border: "none", cursor: passwordInput.trim() ? "pointer" : "default",
              background: passwordInput.trim() ? "#3b82f6" : "rgba(255,255,255,0.06)",
              color: passwordInput.trim() ? "#fff" : "#6b7280",
              opacity: passwordLoading ? 0.6 : 1, transition: "all 0.15s",
            }}
          >
            {passwordLoading ? "Verifying..." : "Unlock"}
          </button>
        </div>
      </div>
      <p style={{ fontSize: 11, color: "#4b5563", marginTop: 24 }}>
        Shared via <span style={{ color: "#6b7280" }}>Blocwrite</span>
      </p>
    </div>
  );

  if (!data || !activeChapter) return null;

  if (submitted) return (
    <div style={S.fullCenter}>
      <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 32, marginBottom: 24, opacity: 0.4 }} />
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><polyline points="20 6 9 17 4 12"/></svg>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f9fafb", marginTop: 14 }}>Feedback Submitted</h2>
      <p style={{ color: "#9ca3af", marginTop: 6, maxWidth: 380, textAlign: "center", lineHeight: 1.6, fontSize: 14 }}>
        Thank you{readerName ? `, ${readerName}` : ""}! Your notes have been sent to the author.
      </p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", color: "#e5e7eb", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* ── Top bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(15,15,15,0.85)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 24, opacity: 0.7 }} />
            <span style={{ fontSize: 12, color: "#6b7280" }}>Reader</span>
            {daysRemaining !== null && (
              <span style={{ fontSize: 11, color: daysRemaining <= 3 ? "#f59e0b" : "#6b7280", fontWeight: daysRemaining <= 3 ? 600 : 400 }}>
                · {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              {annotations.length} note{annotations.length !== 1 ? "s" : ""}
            </span>
            <input
              type="text" placeholder="Your name (optional)" value={readerName}
              onChange={(e) => setReaderName(e.target.value)}
              style={{
                fontSize: 13, padding: "6px 12px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                color: "#e5e7eb", width: 160, outline: "none", fontFamily: "inherit",
              }}
            />
            <button
              onClick={submitFeedback}
              disabled={submitting || annotations.length === 0}
              style={{
                fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8,
                border: "none", background: annotations.length === 0 ? "rgba(255,255,255,0.06)" : "#3b82f6",
                color: annotations.length === 0 ? "#6b7280" : "#fff",
                cursor: annotations.length === 0 ? "default" : "pointer",
                opacity: submitting ? 0.6 : 1, transition: "all 0.15s",
              }}
            >
              {submitting ? "Sending..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", minHeight: "calc(100vh - 52px)" }}>

        {/* ── Chapter sidebar ── */}
        <aside style={{
          width: 220, padding: "20px 12px", borderRight: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0, overflowY: "auto",
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, padding: "0 8px" }}>Chapters</p>
          {data.chapters.map((ch, idx) => {
            const count = annotations.filter((a) => a.sharedChapterId === ch.id).length;
            const active = idx === activeChapterIdx;
            return (
              <button key={ch.id} onClick={() => setActiveChapterIdx(idx)} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8,
                border: "none", cursor: "pointer", marginBottom: 2,
                background: active ? "rgba(255,255,255,0.06)" : "transparent",
                color: active ? "#f9fafb" : "#9ca3af",
                fontWeight: active ? 600 : 400, fontSize: 13, transition: "all 0.12s",
                fontFamily: "inherit",
              }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ch.title || `Chapter ${idx + 1}`}
                </span>
                {count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10, background: "rgba(139,92,246,0.2)", color: "#a78bfa", flexShrink: 0, marginLeft: 6 }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* ── Main reading area ── */}
        <main style={{ flex: 1, padding: "40px 48px", maxWidth: 700 }}>
          <div style={{ marginBottom: 28, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
              Chapter {activeChapterIdx + 1} of {data.chapters.length}
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#f9fafb", letterSpacing: "-0.02em" }}>
              {activeChapter.title || `Chapter ${activeChapterIdx + 1}`}
            </h2>
            {!submitted && (
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                Select text to highlight and add a note
              </p>
            )}
          </div>

          <div ref={contentRef} onMouseUp={handleMouseUp} style={{
            fontSize: 15, color: "#d1d5db", userSelect: "text", cursor: "text",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}>
            {renderHighlightedContent(activeChapter.content, chapterAnnotations)}
          </div>

          {/* Notes list */}
          {chapterAnnotations.length > 0 && (
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#9ca3af" }}>
                Your Notes ({chapterAnnotations.length})
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {chapterAnnotations.map((ann, i) => {
                  const globalIdx = annotations.indexOf(ann);
                  const meta = TYPE_META[ann.type];
                  return (
                    <div key={i} style={{
                      padding: "12px 14px", borderRadius: 10,
                      background: meta.bg, border: `1px solid ${meta.border}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: meta.border, color: meta.color, textTransform: "uppercase" }}>
                          {meta.label}
                        </span>
                        {!submitted && (
                          <button onClick={() => removeAnnotation(globalIdx)} style={{
                            background: "none", border: "none", color: "#6b7280", cursor: "pointer",
                            fontSize: 16, lineHeight: 1, padding: "0 2px",
                          }}>&times;</button>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", margin: "4px 0", lineHeight: 1.5 }}>
                        &ldquo;{ann.selectedText.slice(0, 100)}{ann.selectedText.length > 100 ? "..." : ""}&rdquo;
                      </p>
                      <p style={{ fontSize: 13, color: "#e5e7eb", lineHeight: 1.5, marginTop: 4 }}>{ann.note}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chapter navigation */}
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: 48, paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}>
            <button
              onClick={() => setActiveChapterIdx((i) => Math.max(0, i - 1))}
              disabled={activeChapterIdx === 0}
              style={{
                fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)", background: "transparent",
                color: activeChapterIdx === 0 ? "#4b5563" : "#d1d5db",
                cursor: activeChapterIdx === 0 ? "default" : "pointer",
              }}
            >
              ← Previous
            </button>
            <button
              onClick={() => setActiveChapterIdx((i) => Math.min(data.chapters.length - 1, i + 1))}
              disabled={activeChapterIdx === data.chapters.length - 1}
              style={{
                fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)", background: "transparent",
                color: activeChapterIdx === data.chapters.length - 1 ? "#4b5563" : "#d1d5db",
                cursor: activeChapterIdx === data.chapters.length - 1 ? "default" : "pointer",
              }}
            >
              Next →
            </button>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "40px 0 24px" }}>
            <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 20, opacity: 0.2 }} />
          </div>
        </main>
      </div>

      {/* ── Annotation popup ── */}
      {selPopup && (
        <div id="bw-ann-popup" style={{
          position: "fixed",
          left: Math.min(Math.max(selPopup.x - 160, 16), window.innerWidth - 340),
          top: Math.max(selPopup.y - 220, 16),
          width: 320, background: "#1e1e1e", borderRadius: 14,
          boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
          padding: 16, zIndex: 1000,
        }}>
          <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10, fontStyle: "italic", lineHeight: 1.4 }}>
            &ldquo;{selPopup.text.slice(0, 60)}{selPopup.text.length > 60 ? "..." : ""}&rdquo;
          </p>

          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {(["comment", "suggestion", "issue"] as AnnotationType[]).map((t) => (
              <button key={t} onClick={() => setNoteType(t)} style={{
                flex: 1, fontSize: 11, fontWeight: 600, padding: "5px 0", borderRadius: 6,
                border: noteType === t ? `1.5px solid ${TYPE_META[t].color}` : "1.5px solid rgba(255,255,255,0.08)",
                background: noteType === t ? TYPE_META[t].bg : "transparent",
                color: noteType === t ? TYPE_META[t].color : "#9ca3af",
                cursor: "pointer", textTransform: "capitalize", transition: "all 0.12s",
              }}>{t}</button>
            ))}
          </div>

          <textarea
            autoFocus placeholder="Add your note..." value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            style={{
              width: "100%", minHeight: 64, fontSize: 13, padding: 10, borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
              color: "#e5e7eb", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, outline: "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addAnnotation();
              if (e.key === "Escape") setSelPopup(null);
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 10 }}>
            <button onClick={() => setSelPopup(null)} style={{
              fontSize: 12, padding: "6px 14px", borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
              color: "#9ca3af", cursor: "pointer",
            }}>Cancel</button>
            <button onClick={addAnnotation} disabled={!noteText.trim()} style={{
              fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
              border: "none", background: noteText.trim() ? "#3b82f6" : "rgba(255,255,255,0.06)",
              color: noteText.trim() ? "#fff" : "#6b7280",
              cursor: noteText.trim() ? "pointer" : "default",
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
    minHeight: "100vh", background: "#0f0f0f", padding: 24,
  },
  spinner: {
    width: 28, height: 28, border: "2.5px solid rgba(255,255,255,0.08)",
    borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.7s linear infinite",
  },
};
