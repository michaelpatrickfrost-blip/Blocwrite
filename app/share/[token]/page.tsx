"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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

type GeneralNote = {
  chapterId: string;
  text: string;
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

const TYPE_META: Record<AnnotationType, { label: string; icon: string; dark: { color: string; bg: string; border: string; highlight: string }; light: { color: string; bg: string; border: string; highlight: string } }> = {
  comment: {
    label: "Comment",
    icon: "chat",
    dark:  { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.18)", highlight: "rgba(148,163,184,0.12)" },
    light: { color: "#64748b", bg: "rgba(100,116,139,0.06)", border: "rgba(100,116,139,0.15)", highlight: "rgba(100,116,139,0.08)" },
  },
  suggestion: {
    label: "Suggestion",
    icon: "lightbulb",
    dark:  { color: "#b8a4ff", bg: "rgba(124,92,252,0.08)",  border: "rgba(124,92,252,0.15)",  highlight: "rgba(124,92,252,0.1)" },
    light: { color: "#5538d4", bg: "rgba(98,70,234,0.06)",   border: "rgba(98,70,234,0.12)",   highlight: "rgba(98,70,234,0.08)" },
  },
  issue: {
    label: "Issue",
    icon: "alert",
    dark:  { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.15)", highlight: "rgba(248,113,113,0.1)" },
    light: { color: "#dc2626", bg: "rgba(220,38,38,0.06)",   border: "rgba(220,38,38,0.12)",   highlight: "rgba(220,38,38,0.08)" },
  },
};

const DARK = {
  bg: "#0c0c1d",
  surface: "#14142e",
  surfaceAlt: "#0a0a18",
  border: "#2a2a48",
  borderLight: "#1e1e3a",
  text: "#e8e8f0",
  textMuted: "#9494a8",
  textDim: "#6a6a82",
  accent: "#b8a4ff",
  accentMuted: "rgba(124,92,252,0.1)",
  prose: "#d1d5db",
  selectionBg: "rgba(124,92,252,0.25)",
  selectionText: "#fff",
  headerBg: "rgba(12,12,29,0.88)",
  logo: "/blocwrite-logo-white.png",
  hoverBg: "rgba(255,255,255,0.06)",
  hoverBgSubtle: "rgba(255,255,255,0.03)",
  overlayBg: "rgba(0,0,0,0.5)",
  popupBg: "#14142e",
  popupShadow: "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
  cardShadow: "0 20px 60px rgba(0,0,0,0.4)",
  inputBg: "#0a0a18",
  noteSidebar: "#10102a",
  notesBorder: "#1e1e3a",
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
  accent: "#5538d4",
  accentMuted: "rgba(98,70,234,0.06)",
  prose: "#374151",
  selectionBg: "rgba(98,70,234,0.2)",
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
  noteSidebar: "#f9f9f7",
  notesBorder: "#eae9e6",
};

const THEME_KEY = "blocwrite-share-theme";
const ONBOARDING_KEY = "blocwrite-share-onboarded";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* ignore */ }
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readTime(words: number): string {
  const mins = Math.ceil(words / 230);
  return mins < 1 ? "< 1 min" : `${mins} min read`;
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
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [readProgress, setReadProgress] = useState(0);
  const [generalNotes, setGeneralNotes] = useState<GeneralNote[]>([]);
  const [showNotesSidebar, setShowNotesSidebar] = useState(true);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  useEffect(() => { setTheme(getInitialTheme()); }, []);

  // Show onboarding on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) setShowOnboarding(true);
    } catch { /* ignore */ }
  }, []);

  function dismissOnboarding() {
    setShowOnboarding(false);
    setOnboardingStep(0);
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch { /* ignore */ }
  }

  function onboardingNext() {
    if (onboardingStep < 3) setOnboardingStep((s) => s + 1);
    else dismissOnboarding();
  }

  function onboardingPrev() {
    if (onboardingStep > 0) setOnboardingStep((s) => s - 1);
  }

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }

  const C = theme === "dark" ? DARK : LIGHT;
  const typeMeta = (t: AnnotationType) => TYPE_META[t][theme];

  // ── Auto-save to localStorage ──
  const storageKey = `blocwrite-share-draft-${token}`;

  function saveDraftToStorage(anns: Annotation[], gNotes: GeneralNote[], name: string) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ annotations: anns, generalNotes: gNotes, readerName: name }));
    } catch { /* ignore */ }
  }

  function loadDraftFromStorage() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as { annotations?: Annotation[]; generalNotes?: GeneralNote[]; readerName?: string };
    } catch { return null; }
  }

  function clearDraftStorage() {
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  }

  // Save draft whenever annotations/notes change
  useEffect(() => {
    if (!data || submitted) return;
    saveDraftToStorage(annotations, generalNotes, readerName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, generalNotes, readerName, submitted]);

  function loadShareData(d: ShareData) {
    setData(d);
    if (d.status === "submitted") { setSubmitted(true); return; }
    if (d.expiresAt) setExpiresAt(d.expiresAt);

    // Load from server annotations
    const existing: Annotation[] = [];
    d.chapters?.forEach((ch: Chapter) => {
      ch.annotations?.forEach((a: Annotation) => {
        existing.push({ ...a, sharedChapterId: ch.id });
      });
    });

    // Try to restore draft from localStorage
    const draft = loadDraftFromStorage();
    if (draft) {
      if (draft.annotations && draft.annotations.length > 0) {
        setAnnotations(draft.annotations);
      } else {
        setAnnotations(existing);
      }
      if (draft.generalNotes) setGeneralNotes(draft.generalNotes);
      if (draft.readerName) setReaderName(draft.readerName);
    } else {
      setAnnotations(existing);
    }
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

  const activeWords = useMemo(() => activeChapter?.content ? wordCount(activeChapter.content) : 0, [activeChapter]);
  const totalWords = useMemo(() => data?.chapters?.reduce((sum, ch) => sum + wordCount(ch.content || ""), 0) ?? 0, [data]);

  const chapterAnnotations = annotations.filter((a) => activeChapter && a.sharedChapterId === activeChapter.id);
  const chapterGeneralNote = generalNotes.find((n) => activeChapter && n.chapterId === activeChapter.id);

  // ── Reading progress tracking ──
  useEffect(() => {
    function handleScroll() {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      if (scrollHeight > 0) {
        setReadProgress(Math.min(100, Math.round((scrollTop / scrollHeight) * 100)));
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Text selection handler ──
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
      y: rect.top - 8,
      text,
      startOffset,
      endOffset: startOffset + text.length,
    });
    setNoteText("");
    setNoteType("comment");
    setTimeout(() => noteInputRef.current?.focus(), 100);
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
    const newAnn: Annotation = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sharedChapterId: activeChapter.id,
      selectedText: selPopup.text, startOffset: selPopup.startOffset,
      endOffset: selPopup.endOffset, note: noteText.trim(), type: noteType,
    };
    setAnnotations((prev) => [...prev, newAnn]);
    setSelPopup(null);
    setNoteText("");
    window.getSelection()?.removeAllRanges();
    setActiveAnnotationId(newAnn.id!);
    setTimeout(() => setActiveAnnotationId(null), 2000);
  };

  const removeAnnotation = (idx: number) => setAnnotations((prev) => prev.filter((_, i) => i !== idx));

  const updateGeneralNote = (text: string) => {
    if (!activeChapter) return;
    setGeneralNotes((prev) => {
      const existing = prev.findIndex((n) => n.chapterId === activeChapter.id);
      if (existing !== -1) {
        const next = [...prev];
        next[existing] = { ...next[existing], text };
        return next;
      }
      return [...prev, { chapterId: activeChapter.id, text }];
    });
  };

  const submitFeedback = async () => {
    if (!data) return;
    const hasAnnotations = annotations.length > 0;
    const hasGeneralNotes = generalNotes.some((n) => n.text.trim());
    if (!hasAnnotations && !hasGeneralNotes) return;

    setSubmitting(true);
    try {
      // Submit annotations
      if (hasAnnotations) {
        const res = await fetch(`/api/share/${token}/annotate`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            readerName: readerName.trim() || undefined,
            annotations: annotations.map((a) => ({
              sharedChapterId: a.sharedChapterId, selectedText: a.selectedText,
              startOffset: a.startOffset, endOffset: a.endOffset,
              note: a.note, type: a.type,
            })),
          }),
        });
        if (!res.ok) { const d = await res.json(); alert(d.error || "Failed to save."); return; }
      }

      // Submit general notes
      for (const gn of generalNotes) {
        if (!gn.text.trim()) continue;
        await fetch(`/api/share/${token}/annotate`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            readerName: readerName.trim() || undefined,
            annotations: [{
              sharedChapterId: gn.chapterId,
              selectedText: "[General chapter feedback]",
              startOffset: 0, endOffset: 0,
              note: gn.text.trim(),
              type: "comment",
            }],
          }),
        });
      }

      await fetch(`/api/share/${token}/submit`, { method: "POST" });
      setSubmitted(true);
      clearDraftStorage();
    } catch { alert("Network error."); }
    finally { setSubmitting(false); }
  };

  const totalFeedbackCount = annotations.length + generalNotes.filter((n) => n.text.trim()).length;

  function renderHighlightedContent(content: string, anns: Annotation[]) {
    const paragraphs = content.split("\n\n");

    return paragraphs.map((para, pIdx) => {
      if (!para.trim()) return <p key={pIdx} style={{ marginBottom: 24, lineHeight: 1.9 }}>&nbsp;</p>;

      // Calculate the offset of this paragraph in the full content
      let paraStartOffset = 0;
      for (let i = 0; i < pIdx; i++) {
        paraStartOffset += paragraphs[i].length + 2; // +2 for \n\n
      }
      const paraEndOffset = paraStartOffset + para.length;

      // Find annotations that overlap this paragraph
      const paraAnns = anns.filter((a) => a.startOffset < paraEndOffset && a.endOffset > paraStartOffset);

      let paraContent: React.ReactNode;
      if (paraAnns.length === 0) {
        paraContent = para;
      } else {
        // Build highlighted segments within this paragraph
        const sorted = [...paraAnns].sort((a, b) => a.startOffset - b.startOffset);
        const parts: Array<{ text: string; ann?: Annotation }> = [];
        let cursor = paraStartOffset;
        for (const ann of sorted) {
          const annStart = Math.max(ann.startOffset, paraStartOffset);
          const annEnd = Math.min(ann.endOffset, paraEndOffset);
          if (annStart > cursor) parts.push({ text: content.slice(cursor, annStart) });
          parts.push({ text: content.slice(annStart, annEnd), ann });
          cursor = annEnd;
        }
        if (cursor < paraEndOffset) parts.push({ text: content.slice(cursor, paraEndOffset) });

        paraContent = parts.map((p, i) => p.ann ? (
          <mark key={i} data-ann-id={p.ann.id} title={`${p.ann.type}: ${p.ann.note}`} style={{
            background: typeMeta(p.ann.type).highlight,
            borderBottom: `2px solid ${typeMeta(p.ann.type).color}`,
            borderRadius: 2, padding: "2px 0", cursor: "pointer", color: C.text,
            transition: "background 0.2s",
          }}
          onClick={() => {
            if (p.ann?.id) setActiveAnnotationId(p.ann.id === activeAnnotationId ? null : p.ann.id);
          }}
          >{p.text}</mark>
        ) : <span key={i}>{p.text}</span>);
      }

      return (
        <div key={pIdx} style={{ position: "relative", marginBottom: 24 }}>
          {/* Margin annotation indicators */}
          {paraAnns.length > 0 && (
            <div style={{
              position: "absolute", left: -32, top: 4,
              display: "flex", flexDirection: "column", gap: 3,
            }}>
              {paraAnns.map((ann, aIdx) => (
                <div key={aIdx} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: typeMeta(ann.type).color,
                  opacity: 0.6, cursor: "pointer",
                  transition: "transform 0.15s, opacity 0.15s",
                }}
                title={ann.note}
                onClick={() => ann.id && setActiveAnnotationId(ann.id === activeAnnotationId ? null : ann.id)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.5)"; e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.6"; }}
                />
              ))}
            </div>
          )}

          <p style={{ lineHeight: 1.9, margin: 0 }}>{paraContent}</p>
        </div>
      );
    });
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
      <div style={{ ...iconCircle, background: theme === "dark" ? "rgba(124,92,252,0.08)" : "rgba(98,70,234,0.06)", border: `1px solid ${theme === "dark" ? "rgba(124,92,252,0.15)" : "rgba(98,70,234,0.12)"}` }}>
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
        @keyframes shareSlideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sharePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes shareGlow { 0% { box-shadow: 0 0 0 0 rgba(124,92,252,0.3); } 100% { box-shadow: 0 0 0 8px rgba(124,92,252,0); } }
        @keyframes obOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes obCardIn { from { opacity: 0; transform: scale(0.96) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes obStepIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes obStepOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-20px); } }
        @keyframes obFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes obHighlightSweep { 0% { width: 0; } 100% { width: 100%; } }
        @keyframes obCursorMove { 0% { left: 10%; opacity: 0; } 20% { opacity: 1; } 50% { left: 55%; } 100% { left: 55%; opacity: 1; } }
        @keyframes obDotPop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.3); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes obTypeIn { from { width: 0; } to { width: 100%; } }
        ::selection { background: ${C.selectionBg}; color: ${C.selectionText}; }
      `}</style>

      {/* ── Reading progress bar ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 200,
        background: C.borderLight,
      }}>
        <div style={{
          height: "100%", width: `${readProgress}%`,
          background: `linear-gradient(90deg, ${C.accent}, ${theme === "dark" ? "#d4c8ff" : "#5538d4"})`,
          transition: "width 0.15s ease-out",
          borderRadius: "0 2px 2px 0",
        }} />
      </div>

      {/* ── Top bar ── */}
      <header style={{
        position: "sticky", top: 3, zIndex: 100,
        background: C.headerBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.borderLight}`, transition: "background 0.3s",
      }}>
        <div style={{
          maxWidth: 1400, margin: "0 auto", padding: "0 24px",
          height: 56, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <img src={C.logo} alt="Blocwrite" style={{ height: 18, opacity: 0.75, flexShrink: 0 }} />
            <div style={{ width: 1, height: 16, background: C.border, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.textDim, fontWeight: 500, flexShrink: 0 }}>Manuscript review</span>
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
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 500, flexShrink: 0 }}>
              {readProgress}% read
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {totalFeedbackCount > 0 && (
              <span style={{
                fontSize: 11, color: C.accent, fontWeight: 600,
                padding: "3px 10px", borderRadius: 8, background: C.accentMuted,
                border: `1px solid ${theme === "dark" ? "rgba(124,92,252,0.12)" : "rgba(98,70,234,0.1)"}`,
              }}>
                {totalFeedbackCount} note{totalFeedbackCount !== 1 ? "s" : ""}
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
            {/* Toggle notes panel */}
            <button onClick={() => setShowNotesSidebar((v) => !v)} title="Toggle notes panel" style={{
              width: 34, height: 34, borderRadius: 10, border: `1px solid ${C.border}`,
              background: showNotesSidebar ? C.accentMuted : C.surfaceAlt,
              color: showNotesSidebar ? C.accent : C.textMuted, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </button>
            {themeToggleBtn}
            <button onClick={submitFeedback} disabled={submitting || totalFeedbackCount === 0} style={{
              fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 8,
              border: "none",
              background: totalFeedbackCount === 0 ? C.border : C.accent,
              color: totalFeedbackCount === 0 ? C.textDim : (theme === "dark" ? "#111" : "#fff"),
              cursor: totalFeedbackCount === 0 ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1, transition: "all 0.2s",
              whiteSpace: "nowrap", fontFamily: "inherit",
            }}>
              {submitting ? "Sending..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Onboarding overlay — stepped walkthrough ── */}
      {showOnboarding && (() => {
        const accentBorder = theme === "dark" ? "rgba(124,92,252,0.15)" : "rgba(98,70,234,0.12)";
        const demoLineBg = theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
        const demoLineLight = theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

        const steps = [
          {
            title: "Highlight to annotate",
            desc: "Click and drag across any sentence or passage you want to comment on. A popup will appear where you can leave a comment, suggest a change, or flag an issue for the author.",
            visual: (
              <div style={{ position: "relative", padding: "20px 24px", borderRadius: 14, background: demoLineBg, border: `1px solid ${C.borderLight}`, overflow: "hidden" }}>
                {/* Fake prose lines */}
                <div style={{ fontFamily: "Georgia, serif", fontSize: 13, color: C.prose, lineHeight: 1.8, position: "relative" }}>
                  <span style={{ opacity: 0.5 }}>The morning light crept through the curtains, </span>
                  <span style={{ position: "relative", display: "inline" }}>
                    <span style={{ position: "relative", zIndex: 1 }}>casting long shadows across the wooden floor</span>
                    <span style={{
                      position: "absolute", left: 0, bottom: 0, height: "100%",
                      background: C.selectionBg, borderRadius: 3,
                      animation: "obHighlightSweep 1.8s cubic-bezier(0.4,0,0.2,1) 0.6s both",
                    }} />
                  </span>
                  <span style={{ opacity: 0.5 }}> as she reached for the letter that had arrived at dawn.</span>
                </div>
                {/* Animated cursor */}
                <div style={{
                  position: "absolute", top: "36%",
                  animation: "obCursorMove 2s cubic-bezier(0.4,0,0.2,1) 0.3s both",
                  pointerEvents: "none",
                }}>
                  <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                    <path d="M1 1L1 14L4.5 11L8.5 18L10.5 17L6.5 10L11 10L1 1Z" fill={C.text} fillOpacity="0.7" stroke={C.bg} strokeWidth="0.5"/>
                  </svg>
                </div>
                {/* Mini popup preview */}
                <div style={{
                  position: "absolute", bottom: -4, right: 16,
                  background: C.popupBg, borderRadius: 10, padding: "8px 12px",
                  border: `1px solid ${C.borderLight}`, boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                  animation: "obDotPop 0.4s cubic-bezier(0.34,1.56,0.64,1) 2.2s both",
                  display: "flex", gap: 6, alignItems: "center",
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", padding: "1px 5px", borderRadius: 4, background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.15)" }}>Comment</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.accent, padding: "1px 5px", borderRadius: 4, background: C.accentMuted, border: `1px solid ${accentBorder}` }}>Suggest</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#f87171", padding: "1px 5px", borderRadius: 4, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)" }}>Issue</span>
                </div>
              </div>
            ),
          },
          {
            title: "Share your overall thoughts",
            desc: "At the bottom of each chapter you\u2019ll find a space for your general impressions. Tell the author what landed, what felt off, pacing thoughts, emotional reactions \u2014 anything that doesn\u2019t tie to a specific passage.",
            visual: (
              <div style={{ padding: "18px 24px", borderRadius: 14, background: demoLineBg, border: `1px solid ${C.borderLight}` }}>
                {/* Mini textarea mockup */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Overall thoughts</span>
                </div>
                <div style={{
                  borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.inputBg,
                  padding: "10px 14px", position: "relative", overflow: "hidden",
                  minHeight: 48,
                }}>
                  <div style={{
                    fontFamily: "inherit", fontSize: 12, color: C.textMuted, lineHeight: 1.5,
                    overflow: "hidden", whiteSpace: "nowrap",
                    animation: "obTypeIn 2s steps(40) 0.5s both",
                  }}>
                    Really loved the pacing in this chapter. The reveal at the end...
                  </div>
                </div>
                <div style={{
                  fontSize: 10, color: C.textDim, marginTop: 6, textAlign: "right",
                  animation: "obDotPop 0.3s ease 2.5s both",
                }}>
                  Auto-saved locally
                </div>
              </div>
            ),
          },
          {
            title: "Submit when you\u2019re ready",
            desc: "Everything you do is automatically saved in your browser, so you can close the tab and come back later without losing anything. When you\u2019re finished reviewing, hit the submit button to send all your feedback to the author at once.",
            visual: (
              <div style={{ padding: "18px 24px", borderRadius: 14, background: demoLineBg, border: `1px solid ${C.borderLight}`, textAlign: "center" }}>
                {/* Summary mockup */}
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 14 }}>
                  {[
                    { count: 4, label: "Annotations", color: "#94a3b8" },
                    { count: 2, label: "Suggestions", color: C.accent },
                    { count: 1, label: "General", color: C.textMuted },
                  ].map(({ count, label, color }, i) => (
                    <div key={label} style={{
                      padding: "10px 16px", borderRadius: 10,
                      background: demoLineLight, border: `1px solid ${C.borderLight}`,
                      animation: `obDotPop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${0.3 + i * 0.15}s both`,
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
                      <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>
                {/* Fake submit button */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 24px", borderRadius: 10,
                  background: C.accent, color: theme === "dark" ? "#111" : "#fff",
                  fontSize: 13, fontWeight: 700,
                  animation: `obDotPop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.8s both`,
                  boxShadow: `0 4px 16px ${theme === "dark" ? "rgba(124,92,252,0.2)" : "rgba(98,70,234,0.15)"}`,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  Submit Feedback
                </div>
              </div>
            ),
          },
        ];

        const step = steps[onboardingStep];

        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: C.overlayBg, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "obOverlayIn 0.4s cubic-bezier(0.16,1,0.3,1) both",
          }} onClick={dismissOnboarding}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: C.surface, borderRadius: 28, padding: 0,
              maxWidth: 520, width: "92%", boxShadow: C.cardShadow,
              border: `1px solid ${C.border}`,
              animation: "obCardIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both",
              overflow: "hidden",
            }}>
              {/* Header area */}
              <div style={{
                padding: "32px 36px 20px", textAlign: "center",
                background: `linear-gradient(180deg, ${theme === "dark" ? "rgba(124,92,252,0.03)" : "rgba(98,70,234,0.02)"} 0%, transparent 100%)`,
              }}>
                <img src={C.logo} alt="Blocwrite" style={{
                  height: 20, marginBottom: 16, opacity: 0.7,
                  animation: "obFloat 3s ease-in-out infinite",
                }} />
                <h2 style={{
                  fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6,
                  letterSpacing: "-0.03em", lineHeight: 1.2,
                }}>
                  Welcome to your review
                </h2>
                <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.5, margin: 0 }}>
                  A quick look at how to share your thoughts
                </p>
              </div>

              {/* Progress dots */}
              <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "4px 0 16px" }}>
                {steps.map((_, i) => (
                  <button key={i} onClick={() => setOnboardingStep(i)} style={{
                    width: i === onboardingStep ? 24 : 8, height: 8,
                    borderRadius: 4, border: "none", cursor: "pointer", padding: 0,
                    background: i === onboardingStep ? C.accent : (theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"),
                    transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }} />
                ))}
              </div>

              {/* Step content — animated */}
              <div key={onboardingStep} style={{
                padding: "0 36px 24px",
                animation: "obStepIn 0.4s cubic-bezier(0.16,1,0.3,1) both",
              }}>
                {/* Step number + title */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: C.accentMuted, border: `1px solid ${accentBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.accent, fontWeight: 800, fontSize: 14,
                    transition: "all 0.3s ease",
                  }}>{onboardingStep + 1}</div>
                  <h3 style={{
                    fontSize: 18, fontWeight: 700, color: C.text, margin: 0,
                    letterSpacing: "-0.01em",
                  }}>{step.title}</h3>
                </div>

                {/* Description */}
                <p style={{
                  fontSize: 14, color: C.textMuted, lineHeight: 1.65, margin: "0 0 18px",
                  paddingLeft: 44,
                }}>
                  {step.desc}
                </p>

                {/* Visual demo */}
                <div style={{ marginBottom: 4 }}>
                  {step.visual}
                </div>
              </div>

              {/* Navigation */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 36px 28px",
                borderTop: `1px solid ${C.borderLight}`,
              }}>
                <button onClick={dismissOnboarding} style={{
                  fontSize: 13, color: C.textDim, background: "none", border: "none",
                  cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                  padding: "6px 0",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.textDim; }}
                >
                  Skip tutorial
                </button>

                <div style={{ display: "flex", gap: 8 }}>
                  {onboardingStep > 0 && (
                    <button onClick={onboardingPrev} style={{
                      fontSize: 13, fontWeight: 600, padding: "10px 18px", borderRadius: 10,
                      border: `1px solid ${C.border}`, background: "transparent",
                      color: C.textMuted, cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.hoverBg; e.currentTarget.style.color = C.text; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textMuted; }}
                    >
                      Back
                    </button>
                  )}
                  <button onClick={onboardingNext} style={{
                    fontSize: 13, fontWeight: 700, padding: "10px 24px", borderRadius: 10,
                    border: "none", cursor: "pointer",
                    background: C.accent, color: theme === "dark" ? "#111" : "#fff",
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                    boxShadow: `0 2px 12px ${theme === "dark" ? "rgba(124,92,252,0.15)" : "rgba(98,70,234,0.1)"}`,
                  }}>
                    {onboardingStep === 2 ? "Start Reading" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ display: "flex", maxWidth: 1400, margin: "0 auto", minHeight: "calc(100vh - 59px)" }}>

        {/* ── Chapter sidebar (always visible) ── */}
        <aside style={{
          width: 240, padding: "28px 14px 20px", borderRight: `1px solid ${C.borderLight}`,
          flexShrink: 0, overflowY: "auto", background: C.surfaceAlt, transition: "background 0.3s",
          display: "flex", flexDirection: "column",
        }}>
          {/* Manuscript info */}
          <div style={{ padding: "0 10px", marginBottom: 20 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 4,
            }}>
              Manuscript
            </p>
            <p style={{ fontSize: 13, color: C.text, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
              {data.chapters.length} chapter{data.chapters.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div style={{ height: 1, background: C.borderLight, margin: "0 10px 14px" }} />

          <p style={{
            fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 8, padding: "0 10px",
          }}>
            Contents
          </p>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {data.chapters.map((ch, idx) => {
              const count = annotations.filter((a) => a.sharedChapterId === ch.id).length;
              const hasNote = generalNotes.some((n) => n.chapterId === ch.id && n.text.trim());
              const active = idx === activeChapterIdx;
              const totalBadge = count + (hasNote ? 1 : 0);
              return (
                <button key={ch.id} onClick={() => { setActiveChapterIdx(idx); window.scrollTo(0, 0); }} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10,
                  border: active ? `1px solid ${theme === "dark" ? "rgba(124,92,252,0.12)" : "rgba(98,70,234,0.08)"}` : "1px solid transparent",
                  cursor: "pointer", marginBottom: 3,
                  background: active ? C.accentMuted : "transparent",
                  color: active ? C.text : C.textMuted,
                  fontWeight: active ? 600 : 400, fontSize: 13, transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = C.hoverBgSubtle; e.currentTarget.style.color = C.text; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textMuted; } }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", flex: 1 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: active ? (theme === "dark" ? "rgba(124,92,252,0.15)" : "rgba(98,70,234,0.1)") : (theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
                      color: active ? C.accent : C.textDim,
                    }}>{idx + 1}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ch.title || `Chapter ${idx + 1}`}
                    </span>
                  </span>
                  {totalBadge > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8,
                      background: C.accentMuted, color: C.accent, flexShrink: 0, marginLeft: 8,
                    }}>
                      {totalBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Reading stats */}
          <div style={{ padding: "16px 12px 0", borderTop: `1px solid ${C.borderLight}`, marginTop: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Reading Info
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>Total words</span>
                <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{totalWords.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>Est. time</span>
                <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{readTime(totalWords)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>Progress</span>
                <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{readProgress}%</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main reading area ── */}
        <main style={{
          flex: 1, minWidth: 0, padding: "48px 56px 48px 72px",
          minHeight: "100%",
          background: C.surface, transition: "background 0.3s",
        }}>
          {activeChapter ? (
            <>
              <div style={{ marginBottom: 28 }}>
                <p style={{
                  fontSize: 11, color: C.textDim, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: "0.05em", marginBottom: 6,
                }}>
                  Chapter {activeChapterIdx + 1}{multipleChapters ? ` of ${data.chapters.length}` : ""}
                </p>
                <h2 style={{
                  fontSize: 30, fontWeight: 700, color: C.text,
                  letterSpacing: "-0.02em", margin: 0, lineHeight: 1.3,
                }}>
                  {activeChapter.title || `Chapter ${activeChapterIdx + 1}`}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: C.textDim, fontWeight: 500 }}>
                    {activeWords.toLocaleString()} words
                  </span>
                  <span style={{ fontSize: 12, color: C.textDim }}>
                    {readTime(activeWords)}
                  </span>
                  {chapterAnnotations.length > 0 && (
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 6,
                      background: C.accentMuted, color: C.accent, fontWeight: 600,
                    }}>
                      {chapterAnnotations.length} note{chapterAnnotations.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ height: 1, background: C.borderLight, marginBottom: 32 }} />

              {/* Inline hint for first-time users */}
              {!submitted && annotations.length === 0 && (
                <div style={{
                  marginBottom: 28, padding: "14px 18px", borderRadius: 12,
                  background: C.accentMuted,
                  border: `1px solid ${theme === "dark" ? "rgba(124,92,252,0.1)" : "rgba(98,70,234,0.08)"}`,
                  display: "flex", alignItems: "center", gap: 12,
                  animation: "shareSlideIn 0.3s ease",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: theme === "dark" ? "rgba(124,92,252,0.12)" : "rgba(98,70,234,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, color: C.text, margin: 0, fontWeight: 600 }}>
                      Select any text to leave a note
                    </p>
                    <p style={{ fontSize: 12, color: C.textMuted, margin: "2px 0 0", lineHeight: 1.4 }}>
                      Highlight a passage to comment, suggest changes, or flag issues for the author.
                    </p>
                  </div>
                </div>
              )}

              {activeChapter.content ? (
                <div ref={contentRef} onMouseUp={handleMouseUp} style={{
                  fontSize: 17, color: C.prose, userSelect: "text", cursor: "text",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  letterSpacing: "0.01em",
                  maxWidth: 640,
                }}>
                  {renderHighlightedContent(activeChapter.content, chapterAnnotations)}
                </div>
              ) : (
                <div style={{ padding: "80px 20px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: C.textDim }}>This chapter has no content yet.</p>
                </div>
              )}

              {/* ── General chapter feedback ── */}
              {!submitted && (
                <div style={{
                  marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.borderLight}`,
                  maxWidth: 680,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                      border: `1px solid ${C.borderLight}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Overall thoughts</p>
                      <p style={{ fontSize: 12, color: C.textDim, margin: "2px 0 0" }}>Share your general impression of this chapter</p>
                    </div>
                  </div>
                  <textarea
                    placeholder="What did you think of this chapter? What worked well? What could be improved? Any overall impressions..."
                    value={chapterGeneralNote?.text ?? ""}
                    onChange={(e) => updateGeneralNote(e.target.value)}
                    style={{
                      width: "100%", minHeight: 100, fontSize: 14, padding: "14px 16px", borderRadius: 12,
                      border: `1.5px solid ${C.border}`, background: C.inputBg,
                      color: C.text, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, outline: "none",
                      boxSizing: "border-box", transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = C.accent; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                  />
                  {chapterGeneralNote?.text && (
                    <p style={{ fontSize: 11, color: C.textDim, marginTop: 6, textAlign: "right" }}>
                      Auto-saved locally
                    </p>
                  )}
                </div>
              )}

              {/* Chapter navigation */}
              {multipleChapters && (
                <div style={{
                  display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 20,
                  borderTop: `1px solid ${C.borderLight}`, maxWidth: 680,
                }}>
                  <button onClick={() => { setActiveChapterIdx((i) => Math.max(0, i - 1)); window.scrollTo(0, 0); }} disabled={activeChapterIdx === 0} style={{
                    fontSize: 13, fontWeight: 500, padding: "9px 18px", borderRadius: 8,
                    border: `1px solid ${C.border}`, background: C.surfaceAlt,
                    color: activeChapterIdx === 0 ? C.textDim : C.text,
                    cursor: activeChapterIdx === 0 ? "default" : "pointer",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}>
                    &#8592; Previous
                  </button>
                  <button onClick={() => { setActiveChapterIdx((i) => Math.min(data.chapters.length - 1, i + 1)); window.scrollTo(0, 0); }} disabled={activeChapterIdx === data.chapters.length - 1} style={{
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

              {/* Footer */}
              <div style={{ textAlign: "center", padding: "56px 0 24px" }}>
                <img src={C.logo} alt="Blocwrite" style={{ height: 14, opacity: 0.15 }} />
                <p style={{ fontSize: 10, color: C.borderLight, marginTop: 8 }}>&copy; {new Date().getFullYear()} Blocwrite</p>
              </div>
            </>
          ) : (
            <div style={{ padding: "80px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: C.textDim }}>Select a chapter from the sidebar to start reading.</p>
            </div>
          )}
        </main>

        {/* ── Notes sidebar ── */}
        {showNotesSidebar && (
          <aside style={{
            width: 320, flexShrink: 0, borderLeft: `1px solid ${C.notesBorder}`,
            background: C.noteSidebar, overflowY: "auto", padding: "20px 16px",
            transition: "background 0.3s",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
                Your Notes
              </p>
              <span style={{ fontSize: 11, color: C.textDim, fontWeight: 500 }}>
                {chapterAnnotations.length} on this chapter
              </span>
            </div>

            {chapterAnnotations.length === 0 && !chapterGeneralNote?.text && (
              <div style={{
                padding: "32px 16px", textAlign: "center",
                borderRadius: 12, background: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                border: `1px dashed ${C.borderLight}`,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto 10px", display: "block", opacity: 0.4 }}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <p style={{ fontSize: 13, color: C.textDim, margin: 0, lineHeight: 1.5 }}>
                  No notes yet.<br/>Highlight text to annotate.
                </p>
              </div>
            )}

            {/* Annotation cards */}
            {chapterAnnotations.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {chapterAnnotations.map((ann, i) => {
                  const globalIdx = annotations.indexOf(ann);
                  const meta = typeMeta(ann.type);
                  const isActive = ann.id === activeAnnotationId;
                  return (
                    <div key={i} style={{
                      padding: "12px 14px", borderRadius: 12,
                      background: isActive ? meta.bg : (theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"),
                      border: `1px solid ${isActive ? meta.color : C.borderLight}`,
                      animation: isActive ? "shareGlow 0.6s ease" : "shareSlideIn 0.2s ease",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onClick={() => {
                      // Scroll to the highlighted text in the content
                      if (ann.id && contentRef.current) {
                        const mark = contentRef.current.querySelector(`[data-ann-id="${ann.id}"]`);
                        if (mark) mark.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                      setActiveAnnotationId(ann.id || null);
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = meta.border; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = C.borderLight; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
                          background: meta.bg, color: meta.color, textTransform: "uppercase",
                          letterSpacing: "0.04em", border: `1px solid ${meta.border}`,
                        }}>
                          {TYPE_META[ann.type].label}
                        </span>
                        {!submitted && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeAnnotation(globalIdx); }}
                            title="Remove note"
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              width: 22, height: 22, borderRadius: 6, padding: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: C.textDim, transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = C.textDim; }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: C.textDim, fontStyle: "italic", margin: "0 0 4px", lineHeight: 1.4 }}>
                        &ldquo;{ann.selectedText.slice(0, 80)}{ann.selectedText.length > 80 ? "..." : ""}&rdquo;
                      </p>
                      <p style={{ fontSize: 12, color: C.text, lineHeight: 1.5, margin: 0 }}>{ann.note}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* General note preview */}
            {chapterGeneralNote?.text && (
              <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 10, background: theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px solid ${C.borderLight}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                  Overall thoughts
                </p>
                <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, margin: 0 }}>
                  {chapterGeneralNote.text.slice(0, 120)}{chapterGeneralNote.text.length > 120 ? "..." : ""}
                </p>
              </div>
            )}

            {/* All chapters note count */}
            {multipleChapters && (
              <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${C.borderLight}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                  All chapters
                </p>
                {data.chapters.map((ch, idx) => {
                  const count = annotations.filter((a) => a.sharedChapterId === ch.id).length;
                  const hasNote = generalNotes.some((n) => n.chapterId === ch.id && n.text.trim());
                  const total = count + (hasNote ? 1 : 0);
                  if (total === 0) return null;
                  return (
                    <div key={ch.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "4px 0", fontSize: 12,
                    }}>
                      <button onClick={() => setActiveChapterIdx(idx)} style={{
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                        color: idx === activeChapterIdx ? C.accent : C.textMuted,
                        fontWeight: idx === activeChapterIdx ? 600 : 400, fontSize: 12,
                        fontFamily: "inherit", textAlign: "left",
                      }}>
                        {ch.title || `Chapter ${idx + 1}`}
                      </button>
                      <span style={{ fontSize: 11, color: C.textDim }}>{total}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── Annotation popup ── */}
      {selPopup && (
        <div ref={popupRef} style={{
          position: "fixed",
          left: Math.min(Math.max(selPopup.x - 190, 16), (typeof window !== "undefined" ? window.innerWidth : 900) - 400),
          top: Math.max(8, selPopup.y - 340),
          width: 380, background: C.popupBg, borderRadius: 16,
          boxShadow: C.popupShadow,
          padding: 0, zIndex: 1000,
          animation: "shareSlideDown 0.15s ease",
          border: `1px solid ${C.borderLight}`,
          overflow: "hidden",
        }}>
          {/* Accent bar */}
          <div style={{
            height: 3,
            background: `linear-gradient(90deg, ${typeMeta(noteType).color}, transparent)`,
          }} />

          <div style={{ padding: "16px 18px 18px" }}>
            {/* Selected text preview */}
            <p style={{
              fontSize: 12, color: C.textMuted, fontStyle: "italic", lineHeight: 1.5, margin: "0 0 12px",
              borderLeft: `3px solid ${typeMeta(noteType).color}`,
              paddingLeft: 10,
            }}>
              &ldquo;{selPopup.text.slice(0, 100)}{selPopup.text.length > 100 ? "..." : ""}&rdquo;
            </p>

            {/* Type selector */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {(["comment", "suggestion", "issue"] as AnnotationType[]).map((t) => {
                const active = noteType === t;
                const meta = typeMeta(t);
                return (
                  <button key={t} onClick={() => setNoteType(t)} style={{
                    flex: 1, fontSize: 11, fontWeight: 600, padding: "6px 0", borderRadius: 8,
                    border: active ? `1.5px solid ${meta.color}` : `1.5px solid ${C.border}`,
                    background: active ? meta.bg : "transparent",
                    color: active ? meta.color : C.textDim,
                    cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}>{TYPE_META[t].label}</button>
                );
              })}
            </div>

            {/* Note input */}
            <textarea
              ref={noteInputRef}
              placeholder={
                noteType === "comment" ? "What do you think about this passage?"
                : noteType === "suggestion" ? "How would you improve this?"
                : "What's the issue here?"
              }
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{
                width: "100%", minHeight: 72, fontSize: 13, padding: "10px 12px", borderRadius: 10,
                border: `1.5px solid ${C.border}`, background: C.inputBg,
                color: C.text, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = typeMeta(noteType).color; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addAnnotation();
                if (e.key === "Escape") setSelPopup(null);
              }}
            />

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <p style={{ fontSize: 10, color: C.textDim, margin: 0 }}>
                {typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "\u2318" : "Ctrl"}+Enter
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setSelPopup(null)} style={{
                  fontSize: 12, padding: "7px 14px", borderRadius: 8,
                  border: `1px solid ${C.border}`, background: "transparent",
                  color: C.textMuted, cursor: "pointer", fontFamily: "inherit",
                  fontWeight: 500, transition: "all 0.15s",
                }}>Cancel</button>
                <button onClick={addAnnotation} disabled={!noteText.trim()} style={{
                  fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8,
                  border: "none",
                  background: noteText.trim() ? typeMeta(noteType).color : C.border,
                  color: noteText.trim()
                    ? (noteType === "issue" ? "#fff" : (theme === "dark" ? "#111" : "#fff"))
                    : C.textDim,
                  cursor: noteText.trim() ? "pointer" : "default",
                  fontFamily: "inherit", transition: "all 0.2s",
                }}>Add Note</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
