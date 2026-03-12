"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

const C = {
  bg: "#f8f9fb",
  surface: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  text: "#1a1a2e",
  dim: "rgba(0,0,0,0.45)",
  accent: "#16a34a",
  accentDim: "rgba(22,163,74,0.08)",
  danger: "#dc2626",
  dangerDim: "rgba(220,38,38,0.06)",
  warn: "#d97706",
  blue: "#2563eb",
  blueDim: "rgba(37,99,235,0.06)",
};

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
};

type BlogPublishMode = "draft" | "publish" | "schedule";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function toLocalDatetimeStr(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

function stripHtml(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, " ");
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export default function AdminBlogPage() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [blogEditing, setBlogEditing] = useState<BlogPost | null>(null);
  const [blogTitle, setBlogTitle] = useState("");
  const [blogExcerpt, setBlogExcerpt] = useState("");
  const [blogCover, setBlogCover] = useState<string | null>(null);
  const [blogPublishMode, setBlogPublishMode] = useState<BlogPublishMode>("draft");
  const [blogScheduleDate, setBlogScheduleDate] = useState("");
  const [blogSaving, setBlogSaving] = useState(false);
  const [blogMsg, setBlogMsg] = useState("");
  const [blogDeleteId, setBlogDeleteId] = useState<string | null>(null);
  const [blogSearch, setBlogSearch] = useState("");
  const [blogFilter, setBlogFilter] = useState<"all" | "published" | "scheduled" | "draft">("all");
  const [publishConfirmId, setPublishConfirmId] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(0);

  const editorRef = useRef<HTMLDivElement>(null);

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadBlogPosts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog");
      if (res.ok) setBlogPosts(await res.json());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadBlogPosts();
  }, []);

  function startNewPost() {
    setBlogEditing(null);
    setBlogTitle("");
    setBlogExcerpt("");
    setBlogCover(null);
    setBlogPublishMode("draft");
    setBlogScheduleDate("");
    setBlogMsg("");
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = "";
    }, 50);
  }

  function editPost(post: BlogPost) {
    setBlogEditing(post);
    setBlogTitle(post.title);
    setBlogExcerpt(post.excerpt || "");
    setBlogCover(post.coverImage);
    if (post.published && post.publishedAt && new Date(post.publishedAt) > new Date()) {
      setBlogPublishMode("schedule");
      setBlogScheduleDate(toLocalDatetimeStr(post.publishedAt));
    } else if (post.published) {
      setBlogPublishMode("publish");
      setBlogScheduleDate("");
    } else {
      setBlogPublishMode("draft");
      setBlogScheduleDate("");
    }
    setBlogMsg("");
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = post.content;
    }, 50);
  }

  async function saveBlogPost() {
    if (!blogTitle.trim()) {
      setBlogMsg("Title is required.");
      return;
    }
    if (blogPublishMode === "schedule" && !blogScheduleDate) {
      setBlogMsg("Select a date and time to schedule.");
      return;
    }
    if (blogPublishMode === "schedule" && new Date(blogScheduleDate) <= new Date()) {
      setBlogMsg("Scheduled date must be in the future.");
      return;
    }
    setBlogSaving(true);
    setBlogMsg("");
    try {
      const content = editorRef.current?.innerHTML || "";
      const published = blogPublishMode !== "draft";
      const publishAt = blogPublishMode === "schedule" ? new Date(blogScheduleDate).toISOString() : undefined;
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: blogEditing?.id,
          title: blogTitle.trim(),
          excerpt: blogExcerpt.trim() || null,
          content,
          coverImage: blogCover,
          published,
          publishAt,
        }),
      });
      if (res.ok) {
        setBlogMsg(
          blogPublishMode === "schedule"
            ? "Scheduled!"
            : blogPublishMode === "publish"
              ? "Published!"
              : "Saved as draft."
        );
        startNewPost();
        void loadBlogPosts();
      } else {
        const d = await res.json();
        setBlogMsg(d.error || "Save failed.");
      }
    } catch {
      setBlogMsg("Connection error.");
    }
    setBlogSaving(false);
  }

  async function publishPostNow(postId: string) {
    try {
      const post = blogPosts.find((p) => p.id === postId);
      if (!post) return;
      await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: postId,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          coverImage: post.coverImage,
          published: true,
        }),
      });
      setPublishConfirmId(null);
      void loadBlogPosts();
    } catch {
      /* ignore */
    }
  }

  async function deleteBlogPost(id: string) {
    try {
      await fetch("/api/admin/blog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setBlogDeleteId(null);
      void loadBlogPosts();
    } catch {
      /* ignore */
    }
  }

  const handleImageUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        if (editorRef.current) {
          editorRef.current.focus();
          document.execCommand("insertImage", false, url);
        }
      }
    };
    input.click();
  }, []);

  const handleCoverUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setBlogCover(url);
      }
    };
    input.click();
  }, []);

  function execCmd(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px",
    fontSize: 13,
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.surface,
    color: C.text,
    outline: "none",
  };

  const cardStyle: React.CSSProperties = {
    background: C.surface,
    borderRadius: 14,
    border: `1px solid ${C.border}`,
    padding: "20px 22px",
  };

  const now = new Date();
  const scheduledPosts = blogPosts.filter(
    (p) => p.published && p.publishedAt && new Date(p.publishedAt) > now
  );
  const publishedPosts = blogPosts.filter(
    (p) => p.published && (!p.publishedAt || new Date(p.publishedAt) <= now)
  );
  const draftPosts = blogPosts.filter((p) => !p.published);

  const filteredPosts = blogPosts.filter((p) => {
    if (blogSearch) {
      const q = blogSearch.toLowerCase();
      if (
        !p.title.toLowerCase().includes(q) &&
        !(p.excerpt || "").toLowerCase().includes(q)
      )
        return false;
    }
    if (blogFilter === "published")
      return p.published && (!p.publishedAt || new Date(p.publishedAt) <= now);
    if (blogFilter === "scheduled")
      return p.published && p.publishedAt && new Date(p.publishedAt) > now;
    if (blogFilter === "draft") return !p.published;
    return true;
  });

  const editorText =
    typeof document !== "undefined" && editorRef.current
      ? stripHtml(editorRef.current.innerHTML)
      : "";
  const editorWords = wordCount(editorText);

  const NAV_LINKS: { href: string; label: string; icon: string }[] = [
    { href: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1" },
    { href: "/admin/blog", label: "Blog", icon: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" },
    { href: "/admin/alerts", label: "Alerts", icon: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" },
    { href: "/studio", label: "Studio", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px", borderBottom: `1px solid ${C.border}`,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/admin" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/blocwrite-logo-black.png" alt="Blocwrite" style={{ height: 40 }} />
          </Link>
          <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.5 }}>Admin Hub</span>
        </div>
        <nav style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {NAV_LINKS.map((link) => {
            const isActive = link.href === "/admin/blog";
            return (
              <Link key={link.href} href={link.href} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: isActive ? C.accentDim : "transparent",
                color: isActive ? C.accent : C.dim,
                textDecoration: "none",
                border: `1px solid ${isActive ? "rgba(22,163,74,0.25)" : C.border}`,
                transition: "all 0.15s",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={link.icon}/></svg>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "36px 28px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: C.dim, padding: "60px 0" }}>
            Loading...
          </p>
        ) : (
          <>
            <div style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: C.accentDim,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={C.accent}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                    Blog Editor
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={startNewPost}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    background: C.accentDim,
                    color: C.accent,
                    border: `1px solid rgba(22,163,74,0.2)`,
                    cursor: "pointer",
                  }}
                >
                  + New Post
                </button>
              </div>
              <p style={{ fontSize: 13, color: C.dim, margin: "0 0 24px" }}>
                Write blog posts for the /news page. Scheduled posts go live
                automatically at the set time.
              </p>

              <div
                style={{
                  ...cardStyle,
                  padding: "28px 26px",
                  marginBottom: 32,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ flex: "1 1 300px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: C.dim,
                        marginBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      Title
                    </label>
                    <input
                      type="text"
                      placeholder="Post title"
                      value={blogTitle}
                      onChange={(e) => setBlogTitle(e.target.value)}
                      style={{
                        ...inputStyle,
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ flex: "1 1 240px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: C.dim,
                        marginBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      Excerpt (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Short summary for the listing"
                      value={blogExcerpt}
                      onChange={(e) => setBlogExcerpt(e.target.value)}
                      style={{
                        ...inputStyle,
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {blogTitle.trim() && (
                  <div
                    style={{
                      fontSize: 11,
                      color: C.dim,
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>URL:</span>
                    <code
                      style={{
                        background: "rgba(0,0,0,0.03)",
                        padding: "3px 10px",
                        borderRadius: 4,
                        fontSize: 12,
                        color: C.blue,
                      }}
                    >
                      /news/{slugify(blogTitle.trim())}
                    </code>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void handleCoverUpload()}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      background: "rgba(0,0,0,0.04)",
                      color: C.text,
                      border: `1px solid ${C.border}`,
                      cursor: "pointer",
                    }}
                  >
                    {blogCover ? "Change Cover" : "Upload Cover"}
                  </button>
                  {blogCover && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <img
                        src={blogCover}
                        alt="cover"
                        style={{
                          height: 44,
                          borderRadius: 8,
                          border: `1px solid ${C.border}`,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setBlogCover(null)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 4,
                          fontSize: 11,
                          background: "transparent",
                          color: C.dim,
                          border: `1px solid ${C.border}`,
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    marginBottom: 10,
                    padding: "8px 10px",
                    background: "rgba(0,0,0,0.02)",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  {[
                    { label: "B", cmd: "bold", style: { fontWeight: 800 } },
                    { label: "I", cmd: "italic", style: { fontStyle: "italic" } },
                    { label: "U", cmd: "underline", style: { textDecoration: "underline" } },
                    {
                      label: "H1",
                      cmd: "formatBlock",
                      val: "h2",
                      style: { fontWeight: 800, fontSize: 11 },
                    },
                    {
                      label: "H2",
                      cmd: "formatBlock",
                      val: "h3",
                      style: { fontWeight: 700, fontSize: 11 },
                    },
                    { label: "List", cmd: "insertUnorderedList", style: { fontSize: 11 } },
                    {
                      label: "1. List",
                      cmd: "insertOrderedList",
                      style: { fontSize: 11 },
                    },
                    {
                      label: "Quote",
                      cmd: "formatBlock",
                      val: "blockquote",
                      style: { fontSize: 11 },
                    },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => execCmd(btn.cmd, btn.val)}
                      style={{
                        padding: "5px 11px",
                        borderRadius: 6,
                        fontSize: 12,
                        background: "rgba(0,0,0,0.04)",
                        color: C.text,
                        border: `1px solid ${C.border}`,
                        cursor: "pointer",
                        ...btn.style,
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => void handleImageUpload()}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 6,
                      fontSize: 11,
                      background: "rgba(0,0,0,0.04)",
                      color: C.text,
                      border: `1px solid ${C.border}`,
                      cursor: "pointer",
                    }}
                  >
                    Image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt("Enter link URL:");
                      if (url) execCmd("createLink", url);
                    }}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 6,
                      fontSize: 11,
                      background: "rgba(0,0,0,0.04)",
                      color: C.text,
                      border: `1px solid ${C.border}`,
                      cursor: "pointer",
                    }}
                  >
                    Link
                  </button>
                </div>

                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => setEditorDirty((d) => d + 1)}
                  style={{
                    minHeight: 220,
                    maxHeight: 520,
                    overflowY: "auto",
                    padding: "16px 18px",
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    background: C.surface,
                    color: C.text,
                    fontSize: 14,
                    lineHeight: 1.7,
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 8,
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 11, color: C.dim }}>
                    {editorWords > 0
                      ? `${editorWords} word${editorWords !== 1 ? "s" : ""}`
                      : ""}
                  </span>
                  {blogEditing && (
                    <span style={{ fontSize: 11, color: C.dim }}>
                      Editing: {blogEditing.title}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  {(
                    [
                      { mode: "draft" as BlogPublishMode, label: "Save as Draft", desc: "Not visible" },
                      { mode: "publish" as BlogPublishMode, label: "Publish Now", desc: "Goes live" },
                      { mode: "schedule" as BlogPublishMode, label: "Schedule", desc: "Future date" },
                    ] as const
                  ).map(({ mode, label, desc }) => (
                    <label
                      key={mode}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "9px 16px",
                        borderRadius: 8,
                        cursor: "pointer",
background:
                            blogPublishMode === mode
                              ? mode === "publish"
                                ? C.accentDim
                                : mode === "schedule"
                                  ? C.blueDim
                                  : "rgba(0,0,0,0.04)"
                              : "transparent",
                        border: `1px solid ${
                          blogPublishMode === mode
                            ? mode === "publish"
                              ? "rgba(22,163,74,0.3)"
                              : mode === "schedule"
                                ? "rgba(37,99,235,0.3)"
                                : C.border
                            : C.border
                        }`,
                        color:
                          blogPublishMode === mode
                            ? mode === "publish"
                              ? C.accent
                              : mode === "schedule"
                                ? C.blue
                                : C.text
                            : C.dim,
                        transition: "all 0.15s",
                      }}
                    >
                      <input
                        type="radio"
                        name="blogPublishMode"
                        checked={blogPublishMode === mode}
                        onChange={() => setBlogPublishMode(mode)}
                        style={{
                          accentColor:
                            mode === "publish"
                              ? C.accent
                              : mode === "schedule"
                                ? C.blue
                                : C.text,
                          margin: 0,
                        }}
                      />
                      <span>{label}</span>
                      <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>
                        {desc}
                      </span>
                    </label>
                  ))}
                </div>

                {blogPublishMode === "schedule" && (
                  <div style={{ marginTop: 12 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: C.blue,
                        marginBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      Publish date & time
                    </label>
                    <input
                      type="datetime-local"
                      value={blogScheduleDate}
                      onChange={(e) => setBlogScheduleDate(e.target.value)}
                      min={toLocalDatetimeStr(new Date().toISOString())}
                      style={{
                        ...inputStyle,
                        maxWidth: 260,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 20,
                    paddingTop: 18,
                    borderTop: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ flex: 1 }} />
                  {blogEditing && (
                    <button
                      type="button"
                      onClick={startNewPost}
                      style={{
                        padding: "9px 18px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        background: "rgba(0,0,0,0.04)",
                        color: C.dim,
                        border: `1px solid ${C.border}`,
                        cursor: "pointer",
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void saveBlogPost()}
                    disabled={blogSaving || !blogTitle.trim()}
                    style={{
                      padding: "9px 24px",
                      fontSize: 13,
                      fontWeight: 700,
                      borderRadius: 8,
                      background:
                        blogPublishMode === "schedule" ? C.blue : C.accent,
                      color: blogPublishMode === "schedule" ? "#fff" : "#fff",
                      border: "none",
                      cursor: "pointer",
                      opacity: blogSaving ? 0.6 : 1,
                    }}
                  >
                    {blogSaving
                      ? "Saving..."
                      : blogPublishMode === "schedule"
                        ? blogEditing
                          ? "Update Schedule"
                          : "Schedule Post"
                        : blogPublishMode === "publish"
                          ? blogEditing
                            ? "Update & Publish"
                            : "Publish Post"
                          : blogEditing
                            ? "Update Draft"
                            : "Save Draft"}
                  </button>
                </div>
                {blogMsg && (
                  <p
                    style={{
                      fontSize: 12,
                      color: blogMsg.includes("!") ? C.accent : C.danger,
                      margin: "12px 0 0",
                    }}
                  >
                    {blogMsg}
                  </p>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  margin: "0 0 16px",
                }}
              >
                All Posts
              </h3>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 18,
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={blogSearch}
                  onChange={(e) => setBlogSearch(e.target.value)}
                  style={{
                    ...inputStyle,
                    flex: "1 1 220px",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 4 }}>
                  {(["all", "published", "scheduled", "draft"] as const).map(
                    (f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setBlogFilter(f)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background:
                            blogFilter === f
                              ? "rgba(0,0,0,0.06)"
                              : "transparent",
                          color: blogFilter === f ? C.text : C.dim,
                          border: `1px solid ${
                            blogFilter === f
                              ? "rgba(0,0,0,0.1)"
                              : C.border
                          }`,
                          cursor: "pointer",
                          textTransform: "capitalize",
                        }}
                      >
                        {f}{" "}
                        {f === "all"
                          ? `(${blogPosts.length})`
                          : f === "published"
                            ? `(${publishedPosts.length})`
                            : f === "scheduled"
                              ? `(${scheduledPosts.length})`
                              : `(${draftPosts.length})`}
                      </button>
                    )
                  )}
                </div>
              </div>

              {filteredPosts.length === 0 ? (
                <p
                  style={{
                    fontSize: 13,
                    color: C.dim,
                    textAlign: "center",
                    padding: "24px 0",
                  }}
                >
                  {blogPosts.length === 0
                    ? "No posts yet. Write your first one above."
                    : "No posts match your filter."}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredPosts.map((post) => {
                    const isScheduled =
                      post.published &&
                      post.publishedAt &&
                      new Date(post.publishedAt) > now;
                    const isPublished =
                      post.published &&
                      (!post.publishedAt || new Date(post.publishedAt) <= now);
                    const statusBadge = isScheduled ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 9px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          background: C.blueDim,
                          color: C.blue,
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        in {timeUntil(post.publishedAt!)}
                      </span>
                    ) : isPublished ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 9px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          background: C.accentDim,
                          color: C.accent,
                        }}
                      >
                        Live
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 9px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          background: "rgba(217,119,6,0.1)",
                          color: C.warn,
                        }}
                      >
                        Draft
                      </span>
                    );

                    return (
                      <div
                        key={post.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          borderRadius: 10,
                          background: C.surface,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          {post.coverImage && (
                            <img
                              src={post.coverImage}
                              alt=""
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 8,
                                objectFit: "cover",
                                border: `1px solid ${C.border}`,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                margin: 0,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {post.title}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginTop: 4,
                              }}
                            >
                              {statusBadge}
                              <span
                                style={{
                                  fontSize: 11,
                                  color: C.dim,
                                }}
                              >
                                {formatDate(post.createdAt)}
                              </span>
                              {post.excerpt && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: C.dim,
                                    opacity: 0.6,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: 200,
                                  }}
                                >
                                  {post.excerpt}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexShrink: 0,
                          }}
                        >
                          {isPublished && (
                            <a
                              href={`/news/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                background: C.surface,
                                color: C.blue,
                                border: `1px solid rgba(37,99,235,0.2)`,
                                cursor: "pointer",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              >
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              View
                            </a>
                          )}
                          {isScheduled && (
                            <button
                              type="button"
                              onClick={() => setPublishConfirmId(post.id)}
                              style={{
                                padding: "6px 14px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                background: C.accentDim,
                                color: C.accent,
                                border: `1px solid rgba(22,163,74,0.2)`,
                                cursor: "pointer",
                              }}
                            >
                              Publish Now
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => editPost(post)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              background: "rgba(0,0,0,0.04)",
                              color: C.text,
                              border: `1px solid ${C.border}`,
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setBlogDeleteId(post.id)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              background: C.dangerDim,
                              color: C.danger,
                              border: `1px solid rgba(220,38,38,0.2)`,
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Delete confirmation modal */}
      {blogDeleteId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setBlogDeleteId(null)}
        >
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: "28px 24px",
              maxWidth: 380,
              width: "90%",
              textAlign: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                margin: "0 auto 16px",
                background: C.dangerDim,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.danger}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
              Delete this post?
            </h3>
            <p style={{ fontSize: 13, color: C.dim, margin: "0 0 20px" }}>
              This cannot be undone. The post will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setBlogDeleteId(null)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  background: "rgba(0,0,0,0.04)",
                  color: C.dim,
                  border: `1px solid ${C.border}`,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteBlogPost(blogDeleteId)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  background: C.danger,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Now confirmation modal */}
      {publishConfirmId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setPublishConfirmId(null)}
        >
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: "28px 24px",
              maxWidth: 380,
              width: "90%",
              textAlign: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                margin: "0 auto 16px",
                background: C.accentDim,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
              Publish now?
            </h3>
            <p style={{ fontSize: 13, color: C.dim, margin: "0 0 6px" }}>
              <strong>
                {blogPosts.find((p) => p.id === publishConfirmId)?.title}
              </strong>
            </p>
            <p style={{ fontSize: 12, color: C.dim, margin: "0 0 20px" }}>
              This will skip the scheduled date and make the post live
              immediately.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setPublishConfirmId(null)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  background: "rgba(0,0,0,0.04)",
                  color: C.dim,
                  border: `1px solid ${C.border}`,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void publishPostNow(publishConfirmId)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  background: C.accent,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Publish Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
