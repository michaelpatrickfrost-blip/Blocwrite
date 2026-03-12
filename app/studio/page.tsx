"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  countChapterWords,
  countNovelWords,
  createNovel,
  loadNovels,
  saveNovels,
  loadNovelsFromServer,
  saveNovelsWithSync,
  flushServerSave,
  saveNovelsToServer,
  loadSettingsFromServer,
  applySettings,
  gatherSettings,
  saveSettingsToServer,
  initUserScope,
  clearNovelStorage,
  type Novel,
} from "./studio-store";
import { ProfileButton } from "./components/ProfileButton";
import { ProfilePopup } from "./components/ProfilePopup";

type ExportFormat = "docx" | "epub";

/** Hard cap on total novels (active + archived) per user. Admin bypasses. */
const MAX_NOVELS_TOTAL = 25;

function contentForExport(content: string): string {
  // Handle <<<BLOCK>>> delimiter format — extract only prose
  if (content.includes("<<<BLOCK>>>")) {
    const parts = content.split("<<<BLOCK>>>").filter(Boolean);
    const proses: string[] = [];
    for (const part of parts) {
      const proseIdx = part.indexOf("<<<PROSE>>>");
      const endIdx = part.indexOf("<<<ENDBLOCK>>>");
      if (proseIdx === -1 || endIdx === -1) continue;
      const prose = part.slice(proseIdx + "<<<PROSE>>>".length, endIdx).trim();
      if (prose) proses.push(prose);
    }
    // Only return prose — never fall back to raw bloc content
    return proses.join("\n\n\n");
  }
  // Handle JSON format
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((b: { prose?: string }) => b.prose ?? "").filter(Boolean).join("\n\n\n");
    }
  } catch {
    // Not JSON — plain content
  }
  // Strip any stray delimiters
  return content
    .replace(/<<<BLOCK>>>/g, "").replace(/<<<PROSE>>>/g, "")
    .replace(/<<<ENDBLOCK>>>/g, "").replace(/<<<META>>>/g, "")
    .replace(/<<<SYNOPSIS>>>/g, "").trim();
}

function StudioHomePage() {
  const router = useRouter();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [serverLoaded, setServerLoaded] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [hoveredNovelId, setHoveredNovelId] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">("light");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [navigatingAway, setNavigatingAway] = useState(false);

  // Initialize theme from localStorage and apply to document
  useEffect(() => {
    try {
      const stored = localStorage.getItem("bw-theme") as "dark" | "light" | null;
      if (stored) {
        setCurrentTheme(stored);
        document.documentElement.setAttribute("data-theme", stored);
      }
    } catch { /* ignore */ }
  }, []);

  // Load novels from server on mount — server is the source of truth
  useEffect(() => {
    void (async () => {
      // Load settings from server first
      const serverSettings = await loadSettingsFromServer();
      if (serverSettings && Object.keys(serverSettings).length > 0) {
        applySettings(serverSettings);
        // Re-apply theme if it came from server
        const theme = serverSettings["bw-theme"] as "dark" | "light" | undefined;
        if (theme) {
          setCurrentTheme(theme);
          document.documentElement.setAttribute("data-theme", theme);
        }
      } else {
        // First time: push local settings to server
        const local = gatherSettings();
        if (Object.keys(local).length > 0) {
          void saveSettingsToServer(local);
        }
      }

      // Check admin status + get user email to scope localStorage
      try {
        const subRes = await fetch("/api/billing/subscription");
        if (subRes.ok) {
          const subData = await subRes.json() as { isAdmin?: boolean; email?: string };
          if (subData.isAdmin) setIsAdmin(true);
          // Scope localStorage to this user before loading anything
          if (subData.email) initUserScope(subData.email);
        }
      } catch { /* ignore */ }

      // Load novels from server — server is the single source of truth
      const serverNovels = await loadNovelsFromServer();
      if (serverNovels !== null) {
        // Always use server data as truth
        setNovels(serverNovels);
        saveNovels(serverNovels); // cache locally (now user-scoped)
      }
      setServerLoaded(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleTheme() {
    const next = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(next);
    try { localStorage.setItem("bw-theme", next); } catch { /* ignore */ }
    document.documentElement.setAttribute("data-theme", next);
    void saveSettingsToServer(gatherSettings());
  }

  // Export state
  const [exportNovelId, setExportNovelId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("epub");
  const [exportScope, setExportScope] = useState<"all" | "selected">("all");
  const [selectedExportChapterIds, setSelectedExportChapterIds] = useState<string[]>([]);
  const [exportingFile, setExportingFile] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const activeNovels = useMemo(
    () => [...novels].filter((n) => !n.archived).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [novels],
  );

  const archivedNovels = useMemo(
    () => [...novels].filter((n) => n.archived).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [novels],
  );

  // For backward compat, keep sortedNovels pointing to active
  const sortedNovels = activeNovels;

  const pendingDeleteNovel = useMemo(
    () => novels.find((n) => n.id === pendingDeleteId) ?? null,
    [novels, pendingDeleteId],
  );

  const hoveredNovel = useMemo(
    () => novels.find((n) => n.id === hoveredNovelId) ?? null,
    [novels, hoveredNovelId],
  );

  const exportNovel = useMemo(
    () => novels.find((n) => n.id === exportNovelId) ?? null,
    [novels, exportNovelId],
  );

  function writeNovels(next: Novel[]) {
    setNovels(next);
    saveNovelsWithSync(next);
  }

  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  /** Navigate to a novel with a smooth exit transition + save */
  const navigateToNovel = useCallback(async (novelId: string) => {
    saveNovels(novels);
    setNavigatingAway(true);
    // Await server save so the novel is available when the target page loads
    await saveNovelsToServer(novels);
    // Wait for exit animation (0.22s) to complete before navigating
    setTimeout(() => router.push(`/studio/${novelId}`), 240);
  }, [novels, router]);

  const atNovelCap = !isAdmin && novels.length >= MAX_NOVELS_TOTAL;

  async function handleCreateWithType(type: "fiction" | "nonfiction") {
    if (atNovelCap) return;
    setShowCreateModal(false);
    const novel = createNovel("", null, type);
    const next = [novel, ...novels];
    setNovels(next);
    saveNovels(next);
    setHoveredNovelId(novel.id);
    setJustCreatedId(novel.id);
    await saveNovelsToServer(next);
    setTimeout(() => setJustCreatedId(null), 2000);
  }

  function archiveNovel(id: string) {
    const next = novels.map((n) => n.id === id ? { ...n, archived: true, updatedAt: new Date().toISOString() } : n);
    writeNovels(next);
  }

  function restoreNovel(id: string) {
    const next = novels.map((n) => n.id === id ? { ...n, archived: false, updatedAt: new Date().toISOString() } : n);
    writeNovels(next);
  }

  function confirmPermanentDelete() {
    if (!pendingDeleteId) return;
    const next = novels.filter((n) => n.id !== pendingDeleteId);
    writeNovels(next);
    setPendingDeleteId(null);
  }

  function openExportModal(novel: Novel) {
    setExportNovelId(novel.id);
    setExportFormat("epub");
    setExportScope("all");
    setSelectedExportChapterIds(novel.chapters.map((c) => c.id));
    setExportError(null);
  }

  function closeExportModal() {
    setExportNovelId(null);
    setExportingFile(false);
    setExportError(null);
  }

  function toggleExportChapter(chapterId: string) {
    setSelectedExportChapterIds((current) =>
      current.includes(chapterId) ? current.filter((id) => id !== chapterId) : [...current, chapterId],
    );
  }

  async function runExport() {
    if (!exportNovel || exportingFile) return;

    const chaptersToExport =
      exportScope === "all"
        ? exportNovel.chapters
        : exportNovel.chapters.filter((c) => selectedExportChapterIds.includes(c.id));

    if (chaptersToExport.length === 0) {
      setExportError("Select at least one chapter to export.");
      return;
    }

    setExportingFile(true);
    setExportError(null);

    try {
      const response = await fetch("/api/studio/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: exportFormat,
          novelTitle: exportNovel.title,
          coverImage: exportFormat === "epub" ? exportNovel.coverImage : null,
          chapters: chaptersToExport.map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
            content: contentForExport(chapter.content),
          })),
        }),
      });

      if (!response.ok) {
        let message = "Export could not complete. Please try again.";
        if (response.status === 413) message = "Export payload is too large. Try a smaller cover image.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (typeof payload.error === "string" && payload.error.trim()) message = payload.error;
        } catch { /* keep fallback */ }
        setExportError(message);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const slug = exportNovel.title.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "novel";
      link.href = url;
      link.download = `${slug}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      closeExportModal();
    } catch {
      setExportError("Export request failed. Please retry.");
    } finally {
      setExportingFile(false);
    }
  }

  function getNovelStats(novel: Novel) {
    const totalWords = countNovelWords(novel);
    const chapterCount = novel.chapters.length;
    const characterCount = novel.storyBible?.characters?.length ?? 0;
    const locationCount = novel.storyBible?.locations?.length ?? 0;
    const loreCount = novel.storyBible?.lore?.length ?? 0;
    const readingTime = Math.max(1, Math.round(totalWords / 250));
    const goalWords = novel.goalWords || 0;
    const progress = goalWords > 0 ? Math.min(100, Math.round((totalWords / goalWords) * 100)) : null;
    const lastEdited = novel.updatedAt
      ? new Date(novel.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : null;
    return { totalWords, chapterCount, characterCount, locationCount, loreCount, readingTime, goalWords, progress, lastEdited };
  }

  const selectedChapterCount = exportScope === "all" ? (exportNovel?.chapters.length ?? 0) : selectedExportChapterIds.length;

  return (
    <div className={`pw-wallpaper${navigatingAway ? " pw-exit" : ""}`}>
      <div className="pw-window">
        <aside className="pw-sidebar">
          <div className="pw-logo">
            <img src={currentTheme === "dark" ? "/blocwrite-logo-white.png" : "/blocwrite-logo-black.png"} alt="Blocwrite" className="pw-logo-full" />
          </div>

          <div className="pw-section-title">Your projects</div>
          <button
            type="button"
            className="pw-studio-new-novel-btn"
            onClick={() => !atNovelCap && setShowCreateModal(true)}
            disabled={atNovelCap}
          >
            <span className="pw-studio-new-novel-btn-icon">+</span>
            <span>New novel</span>
          </button>
          {atNovelCap && (
            <p style={{ fontSize: 12, color: "var(--pw-text-dim)", margin: "8px 0 0" }}>
              You&apos;ve reached the limit of {MAX_NOVELS_TOTAL} novels. Permanently delete an archived novel to create a new one.
            </p>
          )}
          {!isAdmin && !atNovelCap && novels.length > 0 && (
            <p style={{ fontSize: 11, color: "var(--pw-text-dim)", margin: "6px 0 0", opacity: 0.6 }}>
              {novels.length}/{MAX_NOVELS_TOTAL} novels
            </p>
          )}
          {justCreatedId && (
            <p style={{ fontSize: 12, color: "var(--pw-accent)", margin: "8px 0 0", fontWeight: 500 }}>
              Novel created — click it to open.
            </p>
          )}

          <div className="pw-sidebar-foot">
            <span>Hover a novel to see details.</span>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className="pw-admin-sidebar-link"
              title="Admin Hub"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Admin Hub
            </Link>
          )}
        </aside>

        <div className="pw-topbar">
          <div className="pw-toolbar">
            <span className="pw-project-title">Your Novels</span>
            <span className="pw-dot" />
            <span className="pw-topbar-muted">{sortedNovels.length} novel{sortedNovels.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="pw-theme-toggle" onClick={toggleTheme} title={`Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`}>
              <span className="pw-theme-icon">{currentTheme === "dark" ? "☀" : "☽"}</span>
              <span style={{ fontSize: 12 }}>{currentTheme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <ProfileButton onClick={() => setProfileOpen(true)} />
          </div>
        </div>

        <section className="pw-home-main">
          {!serverLoaded ? (
            /* Skeleton while loading from server — prevents flash of "No novels" */
            <div className="pw-novel-grid" style={{ opacity: 0.25 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="pw-novel-card" style={{
                  pointerEvents: "none",
                  animation: "pw-pulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.12}s`,
                }}>
                  <div className="pw-novel-cover" style={{ background: "var(--pw-surface-alt, #161616)" }} />
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ height: 14, borderRadius: 4, background: "var(--pw-border, #333)", marginBottom: 6, width: "70%" }} />
                    <div style={{ height: 10, borderRadius: 3, background: "var(--pw-border, #333)", width: "40%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedNovels.length === 0 ? (
            <div className="pw-empty pw-content-ready">
              <p className="pw-empty-title">No novels yet.</p>
              <p className="pw-empty-subtitle">Start a new project to begin writing.</p>
              <button
                type="button"
                className="pw-studio-new-novel-btn pw-studio-empty-cta"
                onClick={() => setShowCreateModal(true)}
              >
                <span className="pw-studio-new-novel-btn-icon">+</span>
                <span>New novel</span>
              </button>
            </div>
          ) : (
            <>
              <div className="pw-home-main-inner">
              {/* Horizontal novel covers */}
              <div className="pw-novel-grid pw-content-ready">
                {sortedNovels.map((novel) => (
                  <Link
                    key={novel.id}
                    href={`/studio/${novel.id}`}
                    prefetch={true}
                    className={`pw-novel-card${hoveredNovelId === novel.id ? " pw-novel-card-active" : ""}${justCreatedId === novel.id ? " pw-novel-card-new" : ""}`}
                    onMouseEnter={() => setHoveredNovelId(novel.id)}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToNovel(novel.id);
                    }}
                  >
                    <div
                      className="pw-novel-cover"
                      style={novel.coverImage ? { backgroundImage: `url(${novel.coverImage})` } : undefined}
                    >
                      {!novel.coverImage && (
                        <div className="pw-cover-placeholder">
                          <span className="pw-cover-placeholder-brand">Blocwrite</span>
                          <h3 className="pw-cover-placeholder-title">{novel.title || "Untitled"}</h3>
                          {novel.authorName?.trim() ? (
                            <p className="pw-cover-placeholder-author">by {novel.authorName.trim()}</p>
                          ) : (
                            <p className="pw-cover-placeholder-author" style={{ opacity: 0.5 }}>Author name</p>
                          )}
                        </div>
                      )}
                      {novel.healthScore && (
                        <div
                          title={`Health: ${novel.healthScore.overall}/10`}
                          style={{
                            position: "absolute", bottom: 6, right: 6,
                            width: 26, height: 26, borderRadius: "50%",
                            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
                            border: `2px solid ${novel.healthScore.overall >= 8 ? "var(--pw-status-success)" : novel.healthScore.overall >= 6 ? "var(--pw-accent)" : novel.healthScore.overall >= 4 ? "var(--pw-status-warning)" : "var(--pw-status-danger)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 800,
                            color: novel.healthScore.overall >= 8 ? "var(--pw-status-success)" : novel.healthScore.overall >= 6 ? "var(--pw-accent)" : novel.healthScore.overall >= 4 ? "var(--pw-status-warning)" : "var(--pw-status-danger)",
                          }}
                        >
                          {novel.healthScore.overall}
                        </div>
                      )}
                    </div>

                    <div className="pw-novel-card-label">
                      <span className="pw-novel-card-label-text">{novel.title}</span>
                      {novel.novelType === "nonfiction" && (
                        <span style={{ display: "inline-block", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "rgba(var(--pw-accent-rgb,124,92,252),0.15)", color: "var(--pw-accent)", marginLeft: 4, verticalAlign: "middle", letterSpacing: "0.03em" }}>NF</span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="pw-novel-delete-x"
                      title="Archive novel"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        archiveNovel(novel.id);
                      }}
                      onKeyDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
                    </button>
                  </Link>
                ))}
              </div>

              {/* Detail panel — appears on hover */}
              <div className={`pw-novel-detail${hoveredNovel ? " pw-novel-detail-visible" : ""}`}>
                {hoveredNovel && (() => {
                  const stats = getNovelStats(hoveredNovel);
                  return (
                    <>
                      <div className="pw-novel-detail-header">
                        <div>
                          <h2 className="pw-novel-detail-title">{hoveredNovel.title}</h2>
                          {hoveredNovel.authorName && (
                            <p className="pw-novel-detail-date" style={{ fontStyle: "italic" }}>by {hoveredNovel.authorName}</p>
                          )}
                          {stats.lastEdited && (
                            <p className="pw-novel-detail-date">Last edited {stats.lastEdited}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: "9px 20px", fontSize: "13px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openExportModal(hoveredNovel);
                          }}
                        >
                          Export
                        </button>
                      </div>

                      <div className="pw-novel-detail-stats">
                        <div className="pw-novel-detail-stat">
                          <span className="pw-novel-detail-stat-value">{stats.totalWords.toLocaleString()}</span>
                          <span className="pw-novel-detail-stat-label">Words</span>
                        </div>
                        <div className="pw-novel-detail-stat">
                          <span className="pw-novel-detail-stat-value">{stats.chapterCount}</span>
                          <span className="pw-novel-detail-stat-label">Chapters</span>
                        </div>
                        <div className="pw-novel-detail-stat">
                          <span className="pw-novel-detail-stat-value">{stats.characterCount}</span>
                          <span className="pw-novel-detail-stat-label">Characters</span>
                        </div>
                        <div className="pw-novel-detail-stat">
                          <span className="pw-novel-detail-stat-value">{stats.locationCount}</span>
                          <span className="pw-novel-detail-stat-label">Locations</span>
                        </div>
                        <div className="pw-novel-detail-stat">
                          <span className="pw-novel-detail-stat-value">{stats.loreCount}</span>
                          <span className="pw-novel-detail-stat-label">Lore</span>
                        </div>
                        <div className="pw-novel-detail-stat">
                          <span className="pw-novel-detail-stat-value">{stats.readingTime} min</span>
                          <span className="pw-novel-detail-stat-label">Reading time</span>
                        </div>
                        {stats.progress !== null && (
                          <div className="pw-novel-detail-stat pw-novel-detail-stat-wide">
                            <div className="pw-novel-detail-progress-row">
                              <span className="pw-novel-detail-stat-label">Goal progress</span>
                              <span className="pw-novel-detail-stat-value" style={{ fontSize: "14px" }}>
                                {stats.progress}%
                              </span>
                            </div>
                            <div className="pw-progress" style={{ height: "4px", marginTop: "6px" }}>
                              <span style={{ width: `${stats.progress}%` }} />
                            </div>
                            <span className="pw-novel-detail-stat-label" style={{ marginTop: "4px" }}>
                              {stats.totalWords.toLocaleString()} / {stats.goalWords.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {/* Manuscript Health Score */}
                        {hoveredNovel.healthScore && (() => {
                          const hs = hoveredNovel.healthScore;
                          const scoreColor = (v: number) =>
                            v >= 8 ? "var(--pw-status-success)" : v >= 6 ? "var(--pw-accent)" : v >= 4 ? "var(--pw-status-warning)" : "var(--pw-status-danger)";
                          return (
                            <div className="pw-novel-detail-stat pw-novel-detail-stat-wide" style={{ marginTop: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: "50%",
                                  border: `2.5px solid ${scoreColor(hs.overall)}`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  flexShrink: 0,
                                }}>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(hs.overall) }}>
                                    {hs.overall}
                                  </span>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <span className="pw-novel-detail-stat-label" style={{ fontWeight: 600 }}>
                                    Manuscript Health
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                                {([
                                  { label: "Pace", value: hs.pacing },
                                  { label: "Dialogue", value: hs.dialogue },
                                  { label: "Clarity", value: hs.clarity },
                                  { label: "Hook", value: hs.engagement },
                                ]).map((cat) => (
                                  <div key={cat.label} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: scoreColor(cat.value) }}>
                                      {cat.value}
                                    </div>
                                    <div style={{ fontSize: 9, opacity: 0.4 }}>{cat.label}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  );
                })()}
              </div>
              </div>
            </>
          )}

          {/* ── Archive section ── */}
          {archivedNovels.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <button
                type="button"
                onClick={() => setShowArchive(!showArchive)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--pw-text-dim)", fontSize: 13, fontWeight: 600,
                  padding: "8px 0",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
                Archive ({archivedNovels.length})
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showArchive ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
              </button>

              {showArchive && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12, padding: "16px 0", borderTop: "1px solid var(--pw-border-light)" }}>
                  {archivedNovels.map((novel) => (
                    <div
                      key={novel.id}
                      style={{
                        width: 160, borderRadius: "var(--pw-radius-xl)", overflow: "hidden",
                        background: "var(--pw-surface)", boxShadow: "var(--pw-shadow-sm)",
                        opacity: 0.7, transition: "opacity 0.15s",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                    >
                      <div
                        style={{
                          width: "100%", aspectRatio: "2 / 3",
                          background: novel.coverImage ? `url(${novel.coverImage}) center/cover` : undefined,
                          display: "flex", alignItems: "stretch", justifyContent: "center",
                        }}
                      >
                        {!novel.coverImage ? (
                          <div className="pw-cover-placeholder">
                            <span className="pw-cover-placeholder-brand">Blocwrite</span>
                            <h3 className="pw-cover-placeholder-title">{novel.title || "Untitled"}</h3>
                            {novel.authorName?.trim() ? (
                              <p className="pw-cover-placeholder-author">by {novel.authorName.trim()}</p>
                            ) : (
                              <p className="pw-cover-placeholder-author" style={{ opacity: 0.5 }}>Author name</p>
                            )}
                          </div>
                        ) : null}
                        {/* Archived badge */}
                        <div style={{
                          position: "absolute", top: 8, left: 8,
                          padding: "3px 8px", borderRadius: 6,
                          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
                          fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)",
                          letterSpacing: "0.04em",
                        }}>
                          Archived
                        </div>
                      </div>
                      <div style={{ padding: "8px 10px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {novel.title}
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <button
                            type="button"
                            onClick={() => restoreNovel(novel.id)}
                            style={{
                              flex: 1, padding: "5px 0", fontSize: 11, fontWeight: 600, borderRadius: 6,
                              background: "var(--pw-accent)", color: "#fff", border: "none", cursor: "pointer",
                            }}
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(novel.id)}
                            style={{
                              padding: "5px 8px", fontSize: 11, borderRadius: 6,
                              background: "rgba(220,38,38,0.1)", color: "var(--pw-status-danger)",
                              border: "1px solid rgba(220,38,38,0.2)", cursor: "pointer",
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Permanent delete confirmation modal */}
      {pendingDeleteNovel && (
        <div className="pw-modal-overlay" onClick={() => setPendingDeleteId(null)}>
          <div className="pw-modal" onClick={(event) => event.stopPropagation()}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, margin: "0 auto 16px",
              background: "rgba(220,38,38,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--pw-status-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div className="pw-delete-modal-title">Are you sure?</div>
            <p className="pw-delete-modal-copy">
              This will <strong>permanently delete</strong> &ldquo;{pendingDeleteNovel.title}&rdquo; and all its chapters, characters, and content. This cannot be undone.
            </p>
            <div className="pw-delete-modal-actions">
              <button type="button" className="btn pw-cancel-btn" onClick={() => setPendingDeleteId(null)}>
                Cancel
              </button>
              <button type="button" className="btn pw-danger-btn" onClick={confirmPermanentDelete}>
                Yes, delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export modal */}
      {exportNovel && (
        <div className="pw-modal-overlay" onClick={closeExportModal}>
          <div className="pw-modal pw-export-modal" onClick={(event) => event.stopPropagation()}>
            <div className="pw-export-header">
              <div className="pw-delete-modal-title">Export — {exportNovel.title}</div>
              <p className="pw-delete-modal-copy">
                Choose a format, then export the full book or only selected chapters.
              </p>
            </div>

            <div className="pw-export-section">
              <p className="pw-export-label">Format</p>
              <div className="pw-export-format-row">
                {(["epub", "docx"] as ExportFormat[]).map((format) => (
                  <button
                    key={format}
                    type="button"
                    className={`pw-export-format ${exportFormat === format ? "active" : ""}`}
                    onClick={() => setExportFormat(format)}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="pw-export-section">
              <p className="pw-export-label">Scope</p>
              <div className="pw-export-scope-row">
                <button
                  type="button"
                  className={`pw-export-scope-option ${exportScope === "all" ? "active" : ""}`}
                  onClick={() => setExportScope("all")}
                >
                  Entire book
                  <span>{exportNovel.chapters.length} chapter(s)</span>
                </button>
                <button
                  type="button"
                  className={`pw-export-scope-option ${exportScope === "selected" ? "active" : ""}`}
                  onClick={() => setExportScope("selected")}
                >
                  Select chapters
                  <span>{selectedExportChapterIds.length} selected</span>
                </button>
              </div>
            </div>

            <div className="pw-export-section">
              <div className="pw-export-chapter-tools">
                <span>
                  Chapters {selectedExportChapterIds.length}/{exportNovel.chapters.length}
                </span>
                <div className="pw-export-tool-actions">
                  <button
                    type="button"
                    className="pw-export-tool-btn"
                    onClick={() => setSelectedExportChapterIds(exportNovel.chapters.map((c) => c.id))}
                    disabled={exportScope === "all"}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="pw-export-tool-btn"
                    onClick={() => setSelectedExportChapterIds([])}
                    disabled={exportScope === "all"}
                  >
                    Clear
                  </button>
                </div>
              </div>
              {exportScope === "all" && (
                <p className="pw-export-help">Switch to &quot;Select chapters&quot; to choose individual chapters.</p>
              )}

              <div className={`pw-export-chapter-list ${exportScope === "all" ? "pw-export-disabled" : ""}`}>
                {exportNovel.chapters.length === 0 ? (
                  <p className="pw-export-help">No chapters available yet.</p>
                ) : (
                  exportNovel.chapters.map((chapter, index) => {
                    const checked = selectedExportChapterIds.includes(chapter.id);
                    return (
                      <label key={chapter.id} className="pw-export-chapter-item">
                        <input
                          type="checkbox"
                          className="pw-checkbox"
                          checked={checked}
                          onChange={() => toggleExportChapter(chapter.id)}
                          disabled={exportScope === "all"}
                          aria-label={`Include ${chapter.title || `Chapter ${index + 1}`}`}
                        />
                        <span className="pw-export-chapter-meta">
                          <strong>{chapter.title || `Chapter ${index + 1}`}</strong>
                          <small>{countChapterWords(chapter).toLocaleString()} words</small>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <p className="pw-export-help">
              {exportFormat === "epub"
                ? `EPUB includes linked chapter navigation${exportNovel.coverImage ? " and uses your current novel cover." : "."}`
                : "DOCX creates a Microsoft Word document for your selected content."}
            </p>

            {exportNovel.chapters.length === 0 && (
              <p className="pw-export-error">Add at least one chapter before exporting.</p>
            )}

            {exportError && <p className="pw-export-error">{exportError}</p>}

            <div className="pw-delete-modal-actions">
              <button type="button" className="btn pw-cancel-btn" onClick={closeExportModal}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void runExport()}
                disabled={
                  exportingFile ||
                  exportNovel.chapters.length === 0 ||
                  (exportScope === "selected" && selectedExportChapterIds.length === 0)
                }
              >
                {exportingFile
                  ? "Exporting..."
                  : exportScope === "all"
                    ? `Export full book as ${exportFormat.toUpperCase()}`
                    : `Export ${selectedChapterCount} chapter(s) as ${exportFormat.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="pw-modal-overlay pw-studio-create-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="pw-studio-create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pw-studio-create-modal-head">
              <h2 className="pw-studio-create-modal-title">New project</h2>
              <p className="pw-studio-create-modal-subtitle">Choose a type to get the right structure and tools.</p>
            </div>
            <div className="pw-studio-create-modal-options">
              <button
                type="button"
                className="pw-studio-create-option"
                onClick={() => void handleCreateWithType("fiction")}
              >
                <span className="pw-studio-create-option-label">Fiction</span>
                <span className="pw-studio-create-option-desc">Novel, short story, or series. Characters, plot, and worldbuilding.</span>
              </button>
              <button
                type="button"
                className="pw-studio-create-option"
                onClick={() => void handleCreateWithType("nonfiction")}
              >
                <span className="pw-studio-create-option-label">Non-fiction</span>
                <span className="pw-studio-create-option-desc">Memoir, biography, or other. Life interview, research notes, and sources.</span>
              </button>
            </div>
            <div className="pw-studio-create-modal-foot">
              <button type="button" className="pw-studio-create-cancel" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfilePopup
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onLogout={async () => {
          try {
            await fetch("/api/auth/logout", { method: "POST" });
          } catch { /* ignore */ }
          clearNovelStorage();
          window.location.href = "/";
        }}
        onSettingsChange={() => void saveSettingsToServer(gatherSettings())}
      />

      {/* Novel counter — bottom-right */}
      {!isAdmin && novels.length > 0 && (
        <div style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 30,
          padding: "6px 14px", borderRadius: 10,
          background: "var(--pw-surface, #1a1a1a)",
          border: "1px solid var(--pw-border-light, #2a2a2a)",
          fontSize: 11, fontWeight: 600, color: "var(--pw-text-dim)",
          display: "flex", alignItems: "center", gap: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          backdropFilter: "blur(8px)",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          {novels.length}/{MAX_NOVELS_TOTAL} novels
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(StudioHomePage), {
  ssr: false,
});
