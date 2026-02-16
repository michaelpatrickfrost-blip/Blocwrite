"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

type Guest = {
  id: string;
  email: string;
  name: string | null;
  duration: string;
  expiresAt: string | null;
  createdAt: string;
  status: "active" | "expired";
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

type AdminAlert = {
  id: string;
  message: string;
  active: boolean;
  scheduledFor: string;
  createdAt: string;
};

type Stats = {
  userCount: number;
  activeSubCount: number;
  trialSubCount: number;
  guestCount: number;
  totalNovels: number;
  totalWords: number;
  archivedNovels: number;
  activeNovels: number;
  genreBreakdown: { genre: string; count: number }[];
  topUsers: { email: string; count: number }[];
  signupsByMonth: Record<string, number>;
  avgNovelsPerUser: number;
};

const C = {
  bg: "#111114",
  surface: "#1c1c20",
  border: "rgba(255,255,255,0.08)",
  text: "#e4e4e7",
  dim: "rgba(255,255,255,0.45)",
  accent: "#a3e635",
  accentDim: "rgba(163,230,53,0.15)",
  danger: "#ef4444",
  dangerDim: "rgba(239,68,68,0.1)",
  warn: "#f59e0b",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  // Add guest form
  const [guestEmail, setGuestEmail] = useState("");
  const [guestDuration, setGuestDuration] = useState<"7days" | "1month" | "forever">("7days");
  const [guestPassword, setGuestPassword] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestMsg, setGuestMsg] = useState("");

  // Delete confirmation
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // ── Blog state ──
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogEditing, setBlogEditing] = useState<BlogPost | null>(null);
  const [blogTitle, setBlogTitle] = useState("");
  const [blogExcerpt, setBlogExcerpt] = useState("");
  const [blogCover, setBlogCover] = useState<string | null>(null);
  const [blogPublished, setBlogPublished] = useState(false);
  const [blogSaving, setBlogSaving] = useState(false);
  const [blogMsg, setBlogMsg] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const [blogDeleteId, setBlogDeleteId] = useState<string | null>(null);

  // ── Alert state ──
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertSchedule, setAlertSchedule] = useState("");
  const [alertSending, setAlertSending] = useState(false);
  const [alertStatusMsg, setAlertStatusMsg] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, guestsRes, blogRes, alertRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/guests"),
        fetch("/api/admin/blog"),
        fetch("/api/admin/alerts"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (guestsRes.ok) setGuests(await guestsRes.json());
      if (blogRes.ok) setBlogPosts(await blogRes.json());
      if (alertRes.ok) setAlerts(await alertRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, []);

  async function addGuest() {
    if (!guestEmail.trim()) return;
    setAddingGuest(true);
    setGuestMsg("");
    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: guestEmail.trim(),
          duration: guestDuration,
          password: guestPassword.trim() || undefined,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setGuestMsg("Access granted.");
        setGuestEmail("");
        setGuestPassword("");
        void loadData();
      } else {
        setGuestMsg(data.error || "Failed.");
      }
    } catch {
      setGuestMsg("Connection failed.");
    }
    setAddingGuest(false);
  }

  async function removeGuest(id: string) {
    try {
      await fetch("/api/admin/guests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setPendingDeleteId(null);
      void loadData();
    } catch { /* ignore */ }
  }

  // ── Blog helpers ──
  function startNewPost() {
    setBlogEditing(null);
    setBlogTitle("");
    setBlogExcerpt("");
    setBlogCover(null);
    setBlogPublished(false);
    setBlogMsg("");
    setTimeout(() => { if (editorRef.current) editorRef.current.innerHTML = ""; }, 50);
  }

  function editPost(post: BlogPost) {
    setBlogEditing(post);
    setBlogTitle(post.title);
    setBlogExcerpt(post.excerpt || "");
    setBlogCover(post.coverImage);
    setBlogPublished(post.published);
    setBlogMsg("");
    setTimeout(() => { if (editorRef.current) editorRef.current.innerHTML = post.content; }, 50);
  }

  async function saveBlogPost() {
    if (!blogTitle.trim()) { setBlogMsg("Title is required."); return; }
    setBlogSaving(true);
    setBlogMsg("");
    try {
      const content = editorRef.current?.innerHTML || "";
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: blogEditing?.id,
          title: blogTitle.trim(),
          excerpt: blogExcerpt.trim() || null,
          content,
          coverImage: blogCover,
          published: blogPublished,
        }),
      });
      if (res.ok) {
        setBlogMsg(blogPublished ? "Published!" : "Saved as draft.");
        startNewPost();
        void loadData();
      } else {
        const d = await res.json();
        setBlogMsg(d.error || "Save failed.");
      }
    } catch { setBlogMsg("Connection error."); }
    setBlogSaving(false);
  }

  async function deleteBlogPost(id: string) {
    try {
      await fetch("/api/admin/blog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setBlogDeleteId(null);
      void loadData();
    } catch { /* ignore */ }
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

  // ── Alert helpers ──
  async function sendAlert() {
    if (!alertMsg.trim()) return;
    setAlertSending(true);
    setAlertStatusMsg("");
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: alertMsg.trim(), scheduledFor: alertSchedule || undefined }),
      });
      if (res.ok) {
        setAlertStatusMsg(alertSchedule ? "Alert scheduled!" : "Alert sent to all users!");
        setAlertMsg("");
        setAlertSchedule("");
        void loadData();
      } else {
        setAlertStatusMsg("Failed to send alert.");
      }
    } catch { setAlertStatusMsg("Connection error."); }
    setAlertSending(false);
  }

  async function dismissAlert(id: string) {
    try {
      await fetch("/api/admin/alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      void loadData();
    } catch { /* ignore */ }
  }

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px", fontSize: 13, borderRadius: 8,
    border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.04)",
    color: C.text, outline: "none",
  };

  const cardStyle: React.CSSProperties = {
    background: C.surface, borderRadius: 14,
    border: `1px solid ${C.border}`, padding: "20px 22px",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Top bar ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px", borderBottom: `1px solid ${C.border}`,
        background: "rgba(20,20,24,0.95)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 28 }} />
          <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.5 }}>Admin Hub</span>
        </div>
        <Link href="/studio" style={{
          padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: C.accentDim, color: C.accent, textDecoration: "none",
          border: `1px solid rgba(163,230,53,0.2)`,
        }}>
          Studio
        </Link>
      </header>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>

        {loading && (
          <p style={{ textAlign: "center", color: C.dim, padding: "60px 0" }}>Loading dashboard...</p>
        )}

        {!loading && stats && (
          <>
            {/* ══════════ Section 1: Stats Cards ══════════ */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
              {[
                { label: "Registered Users", value: stats.userCount, icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
                { label: "Active Subscriptions", value: stats.activeSubCount + stats.trialSubCount, icon: "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" },
                { label: "Guest Users", value: stats.guestCount, icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2M12 7a4 4 0 100-8 4 4 0 000 8z" },
                { label: "Total Novels", value: stats.totalNovels, icon: "M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" },
                { label: "Total Words", value: formatNumber(stats.totalWords), icon: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" },
                { label: "Avg Novels/User", value: stats.avgNovelsPerUser, icon: "M18 20V10M12 20V4M6 20v-6" },
              ].map((card) => (
                <div key={card.label} style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: C.accentDim,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon}/></svg>
                    </div>
                    <span style={{ fontSize: 11, color: C.dim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{card.label}</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* ══════════ Section 2: Guest Access Manager ══════════ */}
            <div style={{ ...cardStyle, marginBottom: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>Guest Access Manager</h2>
              <p style={{ fontSize: 12, color: C.dim, margin: "0 0 20px" }}>
                Grant users free access to the studio without a subscription.
              </p>

              {/* Add guest form */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4, fontWeight: 600 }}>Email</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: "0 0 140px" }}>
                  <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4, fontWeight: 600 }}>Duration</label>
                  <select
                    value={guestDuration}
                    onChange={(e) => setGuestDuration(e.target.value as "7days" | "1month" | "forever")}
                    style={{ ...inputStyle, width: "100%", boxSizing: "border-box", cursor: "pointer" }}
                  >
                    <option value="7days">7 Days</option>
                    <option value="1month">1 Month</option>
                    <option value="forever">Forever</option>
                  </select>
                </div>
                <div style={{ flex: "0 0 140px" }}>
                  <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4, fontWeight: 600 }}>Password (new users)</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={guestPassword}
                    onChange={(e) => setGuestPassword(e.target.value)}
                    style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void addGuest()}
                  disabled={addingGuest || !guestEmail.trim()}
                  style={{
                    padding: "9px 20px", fontSize: 13, fontWeight: 700, borderRadius: 8,
                    background: C.accent, color: "#111", border: "none", cursor: "pointer",
                    opacity: addingGuest ? 0.6 : 1,
                  }}
                >
                  {addingGuest ? "Adding..." : "Grant Access"}
                </button>
              </div>
              {guestMsg && (
                <p style={{ fontSize: 12, color: guestMsg.includes("granted") ? C.accent : C.danger, margin: "-12px 0 16px" }}>{guestMsg}</p>
              )}

              {/* Guest list */}
              {guests.length === 0 ? (
                <p style={{ fontSize: 13, color: C.dim, textAlign: "center", padding: "20px 0" }}>No guest users yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {/* Header */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 120px 80px 60px", gap: 8, padding: "0 8px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.dim }}>
                    <span>Email</span>
                    <span>Duration</span>
                    <span>Expires</span>
                    <span>Status</span>
                    <span></span>
                  </div>
                  {guests.map((g) => (
                    <div key={g.id} style={{
                      display: "grid", gridTemplateColumns: "1fr 100px 120px 80px 60px", gap: 8,
                      alignItems: "center", padding: "10px 8px", borderRadius: 8,
                      background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{g.email}</div>
                        {g.name && <div style={{ fontSize: 11, color: C.dim }}>{g.name}</div>}
                      </div>
                      <span style={{ fontSize: 12, color: C.dim }}>
                        {g.duration === "7days" ? "7 Days" : g.duration === "1month" ? "1 Month" : "Forever"}
                      </span>
                      <span style={{ fontSize: 12, color: C.dim }}>
                        {g.expiresAt ? formatDate(g.expiresAt) : "Never"}
                      </span>
                      <span style={{
                        display: "inline-block", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: g.status === "active" ? C.accentDim : C.dangerDim,
                        color: g.status === "active" ? C.accent : C.danger,
                      }}>
                        {g.status === "active" ? "Active" : "Expired"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(g.id)}
                        style={{
                          padding: "5px 10px", borderRadius: 6, fontSize: 11,
                          background: C.dangerDim, color: C.danger,
                          border: `1px solid rgba(239,68,68,0.2)`, cursor: "pointer",
                        }}
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ══════════ Section 3: Push Alerts ══════════ */}
            <div style={{ ...cardStyle, marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Push Alert</h2>
              </div>
              <p style={{ fontSize: 12, color: C.dim, margin: "0 0 16px" }}>
                Schedule a notification for all users. Shows for 15 seconds then auto-dismisses. Only the latest alert is shown.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 14 }}>
                <div style={{ flex: "1 1 260px" }}>
                  <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4, fontWeight: 600 }}>Message</label>
                  <input
                    type="text"
                    placeholder="e.g. Scheduled maintenance at 2am UTC tonight..."
                    value={alertMsg}
                    onChange={(e) => setAlertMsg(e.target.value)}
                    style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                    maxLength={500}
                  />
                </div>
                <div style={{ flex: "0 0 200px" }}>
                  <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4, fontWeight: 600 }}>Show at (leave blank = now)</label>
                  <input
                    type="datetime-local"
                    value={alertSchedule}
                    onChange={(e) => setAlertSchedule(e.target.value)}
                    style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void sendAlert()}
                  disabled={alertSending || !alertMsg.trim()}
                  style={{
                    padding: "9px 20px", fontSize: 13, fontWeight: 700, borderRadius: 8,
                    background: C.danger, color: "#fff", border: "none", cursor: "pointer",
                    opacity: alertSending ? 0.6 : 1,
                  }}
                >
                  {alertSending ? "Sending..." : "Schedule Alert"}
                </button>
              </div>
              {alertStatusMsg && (
                <p style={{ fontSize: 12, color: alertStatusMsg.includes("sent") || alertStatusMsg.includes("scheduled") ? C.accent : C.danger, margin: "0 0 10px" }}>{alertStatusMsg}</p>
              )}
              {alerts.filter((a) => a.active).length > 0 && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.dim, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Scheduled Alerts</p>
                  {alerts.filter((a) => a.active).map((a) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>{a.message}</p>
                        <p style={{ fontSize: 11, color: C.dim, margin: "2px 0 0" }}>
                          {new Date(a.scheduledFor) <= new Date() ? "Live now" : `Scheduled: ${formatDate(a.scheduledFor)}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void dismissAlert(a.id)}
                        style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: C.dim, border: `1px solid ${C.border}`, cursor: "pointer" }}
                      >
                        Deactivate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ══════════ Section 4: Blog Manager ══════════ */}
            <div style={{ ...cardStyle, marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: C.accentDim,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>News / Blog</h2>
                </div>
                <button
                  type="button"
                  onClick={startNewPost}
                  style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: C.accentDim, color: C.accent, border: `1px solid rgba(163,230,53,0.2)`, cursor: "pointer" }}
                >
                  + New Post
                </button>
              </div>
              <p style={{ fontSize: 12, color: C.dim, margin: "0 0 16px" }}>
                Write blog posts that appear on the /news page of your website.
              </p>

              {/* ─── Editor ─── */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: "1 1 300px" }}>
                    <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4, fontWeight: 600 }}>Title</label>
                    <input
                      type="text"
                      placeholder="Post title"
                      value={blogTitle}
                      onChange={(e) => setBlogTitle(e.target.value)}
                      style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ flex: "1 1 200px" }}>
                    <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4, fontWeight: 600 }}>Excerpt (optional)</label>
                    <input
                      type="text"
                      placeholder="Short summary for the listing"
                      value={blogExcerpt}
                      onChange={(e) => setBlogExcerpt(e.target.value)}
                      style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* Cover image */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <button type="button" onClick={() => void handleCoverUpload()} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: C.text, border: `1px solid ${C.border}`, cursor: "pointer" }}>
                    {blogCover ? "Change Cover Image" : "Upload Cover Image"}
                  </button>
                  {blogCover && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <img src={blogCover} alt="cover" style={{ height: 40, borderRadius: 6, border: `1px solid ${C.border}` }} />
                      <button type="button" onClick={() => setBlogCover(null)} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 10, background: "transparent", color: C.dim, border: `1px solid ${C.border}`, cursor: "pointer" }}>Remove</button>
                    </div>
                  )}
                </div>

                {/* Rich text toolbar */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8, padding: "6px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: `1px solid ${C.border}` }}>
                  {[
                    { label: "B", cmd: "bold", style: { fontWeight: 800 } },
                    { label: "I", cmd: "italic", style: { fontStyle: "italic" } },
                    { label: "U", cmd: "underline", style: { textDecoration: "underline" } },
                    { label: "H1", cmd: "formatBlock", val: "h2", style: { fontWeight: 800, fontSize: 11 } },
                    { label: "H2", cmd: "formatBlock", val: "h3", style: { fontWeight: 700, fontSize: 11 } },
                    { label: "• List", cmd: "insertUnorderedList", style: { fontSize: 11 } },
                    { label: "1. List", cmd: "insertOrderedList", style: { fontSize: 11 } },
                    { label: "Quote", cmd: "formatBlock", val: "blockquote", style: { fontSize: 11 } },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => execCmd(btn.cmd, btn.val)}
                      style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 12,
                        background: "rgba(255,255,255,0.06)", color: C.text,
                        border: `1px solid ${C.border}`, cursor: "pointer", ...btn.style,
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => void handleImageUpload()}
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "rgba(255,255,255,0.06)", color: C.text, border: `1px solid ${C.border}`, cursor: "pointer" }}
                  >
                    📷 Image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt("Enter link URL:");
                      if (url) execCmd("createLink", url);
                    }}
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "rgba(255,255,255,0.06)", color: C.text, border: `1px solid ${C.border}`, cursor: "pointer" }}
                  >
                    🔗 Link
                  </button>
                </div>

                {/* Content editable area */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  style={{
                    minHeight: 200, maxHeight: 500, overflowY: "auto",
                    padding: "14px 16px", borderRadius: 10,
                    border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)",
                    color: C.text, fontSize: 14, lineHeight: 1.7, outline: "none",
                  }}
                />

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.text, cursor: "pointer" }}>
                    <input type="checkbox" checked={blogPublished} onChange={(e) => setBlogPublished(e.target.checked)} style={{ accentColor: C.accent }} />
                    Publish immediately
                  </label>
                  <div style={{ flex: 1 }} />
                  {blogEditing && (
                    <button type="button" onClick={startNewPost} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: C.dim, border: `1px solid ${C.border}`, cursor: "pointer" }}>
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void saveBlogPost()}
                    disabled={blogSaving || !blogTitle.trim()}
                    style={{
                      padding: "8px 20px", fontSize: 13, fontWeight: 700, borderRadius: 8,
                      background: C.accent, color: "#111", border: "none", cursor: "pointer",
                      opacity: blogSaving ? 0.6 : 1,
                    }}
                  >
                    {blogSaving ? "Saving..." : blogEditing ? "Update Post" : "Save Post"}
                  </button>
                </div>
                {blogMsg && (
                  <p style={{ fontSize: 12, color: blogMsg.includes("!") ? C.accent : C.danger, margin: "8px 0 0" }}>{blogMsg}</p>
                )}
              </div>

              {/* ─── Post list ─── */}
              {blogPosts.length === 0 ? (
                <p style={{ fontSize: 13, color: C.dim, textAlign: "center", padding: "16px 0" }}>No posts yet. Write your first one above.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {blogPosts.map((post) => (
                    <div key={post.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {post.coverImage && <img src={post.coverImage} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", border: `1px solid ${C.border}` }} />}
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.title}</p>
                            <p style={{ fontSize: 11, color: C.dim, margin: "1px 0 0" }}>
                              {post.published ? (
                                <span style={{ color: C.accent }}>Published</span>
                              ) : (
                                <span style={{ color: C.warn }}>Draft</span>
                              )}
                              {" · "}{formatDate(post.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => editPost(post)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: C.text, border: `1px solid ${C.border}`, cursor: "pointer" }}>
                          Edit
                        </button>
                        <button type="button" onClick={() => setBlogDeleteId(post.id)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.dangerDim, color: C.danger, border: `1px solid rgba(239,68,68,0.2)`, cursor: "pointer" }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ══════════ Section 5: Reporting ══════════ */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Genre Breakdown */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Genre Breakdown</h3>
                {stats.genreBreakdown.length === 0 ? (
                  <p style={{ fontSize: 12, color: C.dim }}>No genre data yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {stats.genreBreakdown.map((g) => {
                      const maxCount = stats.genreBreakdown[0]?.count || 1;
                      const pct = Math.round((g.count / maxCount) * 100);
                      return (
                        <div key={g.genre}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                            <span style={{ fontWeight: 600 }}>{g.genre}</span>
                            <span style={{ color: C.dim }}>{g.count}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.04)" }}>
                            <div style={{ height: "100%", borderRadius: 3, background: C.accent, width: `${pct}%`, transition: "width 0.3s" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Platform Overview */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Platform Overview</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: C.dim }}>Active novels</span>
                    <span style={{ fontWeight: 700 }}>{stats.activeNovels}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: C.dim }}>Archived novels</span>
                    <span style={{ fontWeight: 700 }}>{stats.archivedNovels}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: C.dim }}>Paying subscribers</span>
                    <span style={{ fontWeight: 700 }}>{stats.activeSubCount}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: C.dim }}>On trial</span>
                    <span style={{ fontWeight: 700 }}>{stats.trialSubCount}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: C.dim }}>Guest users</span>
                    <span style={{ fontWeight: 700 }}>{stats.guestCount}</span>
                  </div>

                  {/* Signups timeline */}
                  {Object.keys(stats.signupsByMonth).length > 0 && (
                    <>
                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>User Signups</span>
                      </div>
                      {Object.entries(stats.signupsByMonth).slice(-6).map(([month, count]) => (
                        <div key={month} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: C.dim }}>{month}</span>
                          <span style={{ fontWeight: 600 }}>{count}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Top users by novels */}
                  {stats.topUsers.length > 0 && (
                    <>
                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>Most Active Writers</span>
                      </div>
                      {stats.topUsers.slice(0, 5).map((u) => (
                        <div key={u.email} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: C.dim }}>{u.email === "admin" ? "You (admin)" : u.email.slice(0, 8) + "..."}</span>
                          <span style={{ fontWeight: 600 }}>{u.count} novel{u.count !== 1 ? "s" : ""}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Revoke confirmation modal ── */}
      {pendingDeleteId && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setPendingDeleteId(null)}
        >
          <div
            style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: "28px 24px", maxWidth: 380, width: "90%",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12, margin: "0 auto 16px",
              background: C.dangerDim, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Revoke access?</h3>
            <p style={{ fontSize: 13, color: C.dim, margin: "0 0 20px" }}>
              This user will lose free studio access immediately. They&apos;ll need a subscription to continue.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: C.dim, border: `1px solid ${C.border}`, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void removeGuest(pendingDeleteId)}
                style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: C.danger, color: "#fff", border: "none", cursor: "pointer" }}
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Blog delete confirmation modal ── */}
      {blogDeleteId && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setBlogDeleteId(null)}
        >
          <div
            style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: "28px 24px", maxWidth: 380, width: "90%",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12, margin: "0 auto 16px",
              background: C.dangerDim, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Delete this post?</h3>
            <p style={{ fontSize: 13, color: C.dim, margin: "0 0 20px" }}>
              This cannot be undone. The post will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button type="button" onClick={() => setBlogDeleteId(null)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: C.dim, border: `1px solid ${C.border}`, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={() => void deleteBlogPost(blogDeleteId)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: C.danger, color: "#fff", border: "none", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.12)", textAlign: "center", padding: "24px 0 12px" }}>&copy; {new Date().getFullYear()} Blocwrite. All rights reserved.</p>
    </div>
  );
}
