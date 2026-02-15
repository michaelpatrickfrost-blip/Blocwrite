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

type Theme = "dark" | "light";

const TYPE_META: Record<AnnotationType, { label: string; dark: { color: string; bg: string; border: string; highlight: string }; light: { color: string; bg: string; border: string; highlight: string } }> = {
  comment: {
    label: "Comment",
    dark:  { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.18)", highlight: "rgba(148,163,184,0.12)" },
    light: { color: "#64748b", bg: "rgba(100,116,139,0.06)", border: "rgba(100,116,139,0.15)", highlight: "rgba(100,116,139,0.08)" },
  },
  suggestion: {
    label: "Suggestion",
    dark:  { color: "#a3e635", bg: "rgba(163,230,53,0.08)",  border: "rgba(163,230,53,0.15)",  highlight: "rgba(163,230,53,0.1)" },
    light: { color: "#4d7c0f", bg: "rgba(77,124,15,0.06)",   border: "rgba(77,124,15,0.12)",   highlight: "rgba(77,124,15,0.08)" },
  },
  issue: {
    label: "Issue",
    dark:  { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.15)", highlight: "rgba(248,113,113,0.1)" },
    light: { color: "#dc2626", bg: "rgba(220,38,38,0.06)",   border: "rgba(220,38,38,0.12)",   highlight: "rgba(220,38,38,0.08)" },
  },
};

const DARK = {
  bg: "#1e1c1c",
  surface: "#252323",
  surfaceAlt: "#1a1818",
  border: "#333",
  borderLight: "#2a2828",
  text: "#f0f0f0",
  textMuted: "#888",
  textDim: "#666",
  accent: "#a3e635",
  accentMuted: "rgba(163,230,53,0.08)",
  prose: "#d1d5db",
  selectionBg: "rgba(163,230,53,0.25)",
  selectionText: "#fff",
  headerBg: "rgba(30,28,28,0.88)",
  logo: "/blocwrite-logo-white.png",
  hoverBg: "rgba(255,255,255,0.06)",
  hoverBgSubtle: "rgba(255,255,255,0.03)",
  overlayBg: "rgba(0,0,0,0.5)",
  popupBg: "#252323",
  popupShadow: "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
  cardShadow: "0 20px 60px rgba(0,0,0,0.4)",
  inputBg: "#1a1818",
};

const LIGHT = {
  bg: "#f8f8f6",
  surface: "#ffffff",
  surfaceAlt: "#f2f1ef",
  border: "#e0dfdb",
  borderLight: "#eae9e6",
  text: "#1a1a1a",
  textMuted: "#6b6b6b",
  textDim: "#999",
  accent: "#4d7c0f",
  accentMuted: "rgba(77,124,15,0.06)",
  prose: "#374151",
  selectionBg: "rgba(77,124,15,0.2)",
  selectionText: "#000",
  headerBg: "rgba(248,248,246,0.92)",
  logo: "/blocwrite-logo-black.png",
  hoverBg: "rgba(0,0,0,0.04)",
  hoverBgSubtle: "rgba(0,0,0,0.02)",
  overlayBg: "rgba(0,0,0,0.3)",
  popupBg: "#ffffff",
  popupShadow: "0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
  cardShadow: "0 20px 60px rgba(0,0,0,0.08)",
  inputBg: "#f2f1ef",
};

const THEME_KEY = "blocwrite-share-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* ignore */ }
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

export default function ShareReaderPage() {
  const params = useParams();
  const token = params.token as string;

  const [theme, setTheme] = useState<Theme>("dark");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ShareData | null>(null);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [readerName, setReaderName] = useState("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [selPopup, setSelPopup] = useState<{
    x: number; y: number; text: string; startOffset: number; endOffset: number;
  } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<AnnotationType>("comment");
  const contentRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTheme(getInitialTheme()); }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }

  const C = theme === "dark" ? DARK : LIGHT;
  const typeMeta = (t: AnnotationType) => TYPE_META[t][theme];

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
            background: typeMeta(p.ann.type).highlight,
            borderBottom: `2px solid ${typeMeta(p.ann.type).color}`,
            borderRadius: 2, padding: "1px 0", cursor: "pointer", color: C.text,
          }}>{p.text}</mark>
        ) : <span key={i} style={{ whiteSpace: "pre-wrap" }}>{p.text}</span>)}
      </div>
    );
  }

  const daysRemaining = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  const themeToggleBtn = (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        width: 34, height: 34, borderRadius: 10, border: `1px solid ${C.border}`,
        background: C.surfaceAlt, color: C.textMuted, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s", flexShrink: 0,
      }}
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      )}
    </button>
  );

  const fullCenter: React.CSSProperties = {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    minHeight: "100vh", background: C.bg, padding: 32, transition: "background 0.3s",
  };
  const iconCircle: React.CSSProperties = {
    width: 52, height: 52, borderRadius: 14,
    background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    border: `1px solid ${C.border}`,
    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4,
  };
  const titleStyle: React.CSSProperties = {
    fontSize: 20, fontWeight: 700, color: C.text, marginTop: 16, marginBottom: 0, letterSpacing: "-0.01em",
  };
  const subtitleStyle: React.CSSProperties = {
    color: C.textMuted, marginTop: 8, maxWidth: 380, textAlign: "center", lineHeight: 1.6, fontSize: 15,
  };

  /* ── Full-page states ── */

  if (loading) return (
    <div style={fullCenter}>
      <div style={{
        width: 28, height: 28, border: `2.5px solid ${C.border}`,
        borderTopColor: C.accent, borderRadius: "50%", animation: "shareSpin 0.7s linear infinite",
      }} />
      <p style={{ color: C.textMuted, marginTop: 16, fontSize: 14 }}>Loading manuscript...</p>
      <style>{`@keyframes shareSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={fullCenter}>
      <div style={{ position: "absolute", top: 20, right: 20 }}>{themeToggleBtn}</div>
      <div style={iconCircle}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
      </div>
      <h2 style={titleStyle}>Link Unavailable</h2>
      <p style={subtitleStyle}>{error}</p>
      <a href="/" style={{ marginTop: 20, fontSize: 13, color: C.textDim, textDecoration: "none", fontWeight: 500 }}>Back to Blocwrite</a>
    </div>
  );

  if (requiresPassword) return (
    <div style={fullCenter}>
      <style>{`@keyframes shareSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: "absolute", top: 20, right: 20 }}>{themeToggleBtn}</div>
      <div style={{
        background: C.surface, borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 400,
        border: `1px solid ${C.border}`, boxShadow: C.cardShadow,
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={C.logo} alt="Blocwrite" style={{ height: 22, marginBottom: 20, opacity: 0.85 }} />
          <div style={{ ...iconCircle, margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>Password Protected</h2>
          <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>
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
              border: passwordError ? `2px solid #f87171` : `1.5px solid ${C.border}`,
              background: C.inputBg, color: C.text, fontFamily: "inherit", outline: "none",
              boxSizing: "border-box",
            }}
          />
          {passwordError && <p style={{ fontSize: 13, color: "#f87171", marginTop: 8 }}>{passwordError}</p>}
          <button onClick={handlePasswordSubmit} disabled={passwordLoading || !passwordInput.trim()} style={{
            width: "100%", marginTop: 14, padding: "13px 0", fontSize: 15, fontWeight: 600,
            borderRadius: 12, border: "none", cursor: passwordInput.trim() ? "pointer" : "default",
            background: passwordInput.trim() ? C.accent : C.border,
            color: passwordInput.trim() ? (theme === "dark" ? "#111" : "#fff") : C.textDim,
            opacity: passwordLoading ? 0.6 : 1, transition: "all 0.2s", fontFamily: "inherit",
          }}>
            {passwordLoading ? "Verifying..." : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={fullCenter}>
      <div style={{ position: "absolute", top: 20, right: 20 }}>{themeToggleBtn}</div>
      <img src={C.logo} alt="Blocwrite" style={{ height: 22, marginBottom: 24, opacity: 0.7 }} />
      <div style={{ ...iconCircle, background: theme === "dark" ? "rgba(163,230,53,0.08)" : "rgba(77,124,15,0.06)", border: `1px solid ${theme === "dark" ? "rgba(163,230,53,0.15)" : "rgba(77,124,15,0.12)"}` }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 style={titleStyle}>Feedback Submitted</h2>
      <p style={subtitleStyle}>
        Thank you{readerName ? `, ${readerName}` : ""}! Your notes have been sent to the author.
      </p>
    </div>
  );

  if (!data || !hasChapters) return (
    <div style={fullCenter}>
      <div style={{ position: "absolute", top: 20, right: 20 }}>{themeToggleBtn}</div>
      <img src={C.logo} alt="Blocwrite" style={{ height: 22, marginBottom: 24, opacity: 0.7 }} />
      <div style={iconCircle}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <h2 style={titleStyle}>No Chapters Available</h2>
      <p style={subtitleStyle}>
        The author hasn&apos;t shared any chapters with this link yet.<br/>Check back later or contact them for an updated link.
      </p>
      {daysRemaining !== null && (
        <p style={{ fontSize: 13, color: C.textDim, marginTop: 8 }}>
          Link expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );

  /* ── Main reader UI ── */
  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      transition: "background 0.3s, color 0.3s",
    }}>
      <style>{`
        @keyframes shareSpin { to { transform: rotate(360deg); } }
        @keyframes shareSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        ::selection { background: ${C.selectionBg}; color: ${C.selectionText}; }
      `}</style>

      {/* ── Top bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: C.headerBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.borderLight}`, transition: "background 0.3s",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto", padding: "0 24px",
          height: 56, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <img src={C.logo} alt="Blocwrite" style={{ height: 18, opacity: 0.75, flexShrink: 0 }} />
            <div style={{ width: 1, height: 16, background: C.border, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.textDim, fontWeight: 500, flexShrink: 0 }}>Shared manuscript</span>
            {daysRemaining !== null && (
              <span style={{
                fontSize: 11, flexShrink: 0, padding: "2px 8px", borderRadius: 6,
                background: daysRemaining <= 3 ? "rgba(248,113,113,0.1)" : (theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"),
                color: daysRemaining <= 3 ? "#f87171" : C.textDim,
                fontWeight: 600, border: `1px solid ${daysRemaining <= 3 ? "rgba(248,113,113,0.2)" : C.borderLight}`,
              }}>
                {daysRemaining}d left
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {annotations.length > 0 && (
              <span style={{
                fontSize: 11, color: C.accent, fontWeight: 600,
                padding: "3px 10px", borderRadius: 8, background: C.accentMuted,
                border: `1px solid ${theme === "dark" ? "rgba(163,230,53,0.12)" : "rgba(77,124,15,0.1)"}`,
              }}>
                {annotations.length} note{annotations.length !== 1 ? "s" : ""}
              </span>
            )}
            <input
              type="text" placeholder="Your name (optional)" value={readerName}
              onChange={(e) => setReaderName(e.target.value)}
              style={{
                fontSize: 13, padding: "7px 12px", borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.surface,
                color: C.text, width: 150, outline: "none", fontFamily: "inherit",
              }}
            />
            {themeToggleBtn}
            <button onClick={submitFeedback} disabled={submitting || annotations.length === 0} style={{
              fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8,
              border: "none",
              background: annotations.length === 0 ? C.border : C.accent,
              color: annotations.length === 0 ? C.textDim : (theme === "dark" ? "#111" : "#fff"),
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
            width: 220, padding: "20px 10px", borderRight: `1px solid ${C.borderLight}`,
            flexShrink: 0, overflowY: "auto", background: C.surfaceAlt, transition: "background 0.3s",
          }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 10, padding: "0 10px",
            }}>
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
                  background: active ? C.hoverBg : "transparent",
                  color: active ? C.text : C.textMuted,
                  fontWeight: active ? 600 : 400, fontSize: 13, transition: "all 0.12s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.hoverBgSubtle; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {ch.title || `Chapter ${idx + 1}`}
                  </span>
                  {count > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8,
                      background: C.accentMuted, color: C.accent, flexShrink: 0, marginLeft: 8,
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
          flex: 1, padding: "40px 48px", maxWidth: 720, minHeight: "100%",
          background: C.surface, transition: "background 0.3s",
        }}>
          {activeChapter ? (
            <>
              <div style={{ marginBottom: 32 }}>
                {multipleChapters && (
                  <p style={{
                    fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase",
                    letterSpacing: "0.05em", marginBottom: 6,
                  }}>
                    Chapter {activeChapterIdx + 1} of {data.chapters.length}
                  </p>
                )}
                <h2 style={{
                  fontSize: 26, fontWeight: 700, color: C.text,
                  letterSpacing: "-0.02em", margin: 0, lineHeight: 1.3,
                }}>
                  {activeChapter.title || `Chapter ${activeChapterIdx + 1}`}
                </h2>
                {!submitted && (
                  <div style={{
                    marginTop: 14, padding: "10px 14px", borderRadius: 10,
                    background: C.accentMuted, border: `1px solid ${theme === "dark" ? "rgba(163,230,53,0.1)" : "rgba(77,124,15,0.08)"}`,
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                      <strong style={{ color: C.text }}>Highlight any text</strong> to leave a note for the author.
                    </p>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: C.borderLight, marginBottom: 32 }} />

              {activeChapter.content ? (
                <div ref={contentRef} onMouseUp={handleMouseUp} style={{
                  fontSize: 16, color: C.prose, userSelect: "text", cursor: "text",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  letterSpacing: "0.01em",
                }}>
                  {renderHighlightedContent(activeChapter.content, chapterAnnotations)}
                </div>
              ) : (
                <div style={{ padding: "80px 20px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: C.textDim }}>This chapter has no content yet.</p>
                </div>
              )}

              {/* Notes list */}
              {chapterAnnotations.length > 0 && (
                <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.borderLight}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, margin: 0 }}>
                      Your Notes ({chapterAnnotations.length})
                    </p>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {chapterAnnotations.map((ann, i) => {
                      const globalIdx = annotations.indexOf(ann);
                      const meta = typeMeta(ann.type);
                      return (
                        <div key={i} style={{
                          padding: "14px 16px", borderRadius: 12,
                          background: meta.bg, border: `1px solid ${meta.border}`,
                          animation: "shareSlideIn 0.2s ease",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                              background: meta.bg, color: meta.color, textTransform: "uppercase",
                              letterSpacing: "0.04em", border: `1px solid ${meta.border}`,
                            }}>
                              {TYPE_META[ann.type].label}
                            </span>
                            {!submitted && (
                              <button
                                onClick={() => removeAnnotation(globalIdx)}
                                title="Remove note"
                                style={{
                                  background: "none", border: "none", cursor: "pointer",
                                  width: 24, height: 24, borderRadius: 6,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: C.textDim, transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = C.textDim; }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: C.textDim, fontStyle: "italic", margin: "0 0 6px", lineHeight: 1.5 }}>
                            &ldquo;{ann.selectedText.slice(0, 120)}{ann.selectedText.length > 120 ? "..." : ""}&rdquo;
                          </p>
                          <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: 0 }}>{ann.note}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chapter navigation */}
              {multipleChapters && (
                <div style={{
                  display: "flex", justifyContent: "space-between", marginTop: 48, paddingTop: 20,
                  borderTop: `1px solid ${C.borderLight}`,
                }}>
                  <button onClick={() => setActiveChapterIdx((i) => Math.max(0, i - 1))} disabled={activeChapterIdx === 0} style={{
                    fontSize: 13, fontWeight: 500, padding: "9px 18px", borderRadius: 8,
                    border: `1px solid ${C.border}`, background: C.surfaceAlt,
                    color: activeChapterIdx === 0 ? C.textDim : C.text,
                    cursor: activeChapterIdx === 0 ? "default" : "pointer",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}>
                    &#8592; Previous
                  </button>
                  <button onClick={() => setActiveChapterIdx((i) => Math.min(data.chapters.length - 1, i + 1))} disabled={activeChapterIdx === data.chapters.length - 1} style={{
                    fontSize: 13, fontWeight: 500, padding: "9px 18px", borderRadius: 8,
                    border: `1px solid ${C.border}`, background: C.surfaceAlt,
                    color: activeChapterIdx === data.chapters.length - 1 ? C.textDim : C.text,
                    cursor: activeChapterIdx === data.chapters.length - 1 ? "default" : "pointer",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}>
                    Next &#8594;
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: "80px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: C.textDim }}>Select a chapter from the sidebar to start reading.</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "56px 0 24px" }}>
            <img src={C.logo} alt="Blocwrite" style={{ height: 14, opacity: 0.15 }} />
            <p style={{ fontSize: 10, color: C.borderLight, marginTop: 8 }}>&copy; {new Date().getFullYear()} Blocwrite</p>
          </div>
        </main>
      </div>

      {/* ── Annotation popup ── */}
      {selPopup && (
        <div ref={popupRef} style={{
          position: "fixed",
          left: Math.min(Math.max(selPopup.x - 180, 16), (typeof window !== "undefined" ? window.innerWidth : 900) - 380),
          top: Math.min(selPopup.y, (typeof window !== "undefined" ? window.innerHeight : 700) - 360),
          width: 360, background: C.popupBg, borderRadius: 16,
          boxShadow: C.popupShadow,
          padding: "18px 20px", zIndex: 1000,
          animation: "shareSlideIn 0.15s ease",
          border: `1px solid ${C.borderLight}`,
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ flex: 1, paddingRight: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>Selected text</p>
              <p style={{ fontSize: 13, color: C.textMuted, fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>
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
                color: C.textDim, transition: "all 0.12s", flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.hoverBg; e.currentTarget.style.color = C.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textDim; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Type selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {(["comment", "suggestion", "issue"] as AnnotationType[]).map((t) => {
              const active = noteType === t;
              const meta = typeMeta(t);
              return (
                <button key={t} onClick={() => setNoteType(t)} style={{
                  flex: 1, fontSize: 12, fontWeight: 600, padding: "7px 0", borderRadius: 8,
                  border: active ? `1.5px solid ${meta.color}` : `1.5px solid ${C.border}`,
                  background: active ? meta.bg : "transparent",
                  color: active ? meta.color : C.textDim,
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
              border: `1.5px solid ${C.border}`, background: C.inputBg,
              color: C.text, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, outline: "none",
              boxSizing: "border-box",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addAnnotation();
              if (e.key === "Escape") setSelPopup(null);
            }}
          />
          <p style={{ fontSize: 10, color: C.textDim, margin: "6px 0 14px", textAlign: "right" }}>
            {typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to add
          </p>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setSelPopup(null)} style={{
              fontSize: 13, padding: "8px 16px", borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.surfaceAlt,
              color: C.textMuted, cursor: "pointer", fontFamily: "inherit",
              fontWeight: 500, transition: "all 0.15s",
            }}>Cancel</button>
            <button onClick={addAnnotation} disabled={!noteText.trim()} style={{
              fontSize: 13, fontWeight: 600, padding: "8px 18px", borderRadius: 8,
              border: "none",
              background: noteText.trim() ? C.accent : C.border,
              color: noteText.trim() ? (theme === "dark" ? "#111" : "#fff") : C.textDim,
              cursor: noteText.trim() ? "pointer" : "default",
              fontFamily: "inherit", transition: "all 0.2s",
            }}>Add Note</button>
          </div>
        </div>
      )}
    </div>
  );
}
