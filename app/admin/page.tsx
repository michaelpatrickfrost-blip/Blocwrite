"use client";

import { useEffect, useState } from "react";
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

type AdminSection = "overview" | "guests" | "reports";

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

const NAV_LINKS: { href: string; label: string; icon: string; external?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1" },
  { href: "/admin/blog", label: "Blog", icon: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" },
  { href: "/admin/alerts", label: "Alerts", icon: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" },
  { href: "/studio", label: "Studio", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", external: true },
];

const SECTION_TABS: { id: AdminSection; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1" },
  { id: "guests", label: "Guest Access", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
  { id: "reports", label: "Reports", icon: "M18 20V10M12 20V4M6 20v-6" },
];

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [guestEmail, setGuestEmail] = useState("");
  const [guestDuration, setGuestDuration] = useState<"7days" | "1month" | "forever">("7days");
  const [guestPassword, setGuestPassword] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestMsg, setGuestMsg] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, guestsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/guests"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (guestsRes.ok) setGuests(await guestsRes.json());
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
        body: JSON.stringify({ email: guestEmail.trim(), duration: guestDuration, password: guestPassword.trim() || undefined }),
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
    } catch { setGuestMsg("Connection failed."); }
    setAddingGuest(false);
  }

  async function removeGuest(id: string) {
    try {
      await fetch("/api/admin/guests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setPendingDeleteId(null);
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
        <nav style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {NAV_LINKS.map((link) => {
            const isActive = link.href === "/admin";
            return (
              <Link key={link.href} href={link.href} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: isActive ? C.accentDim : "rgba(255,255,255,0.04)",
                color: isActive ? C.accent : C.dim,
                textDecoration: "none",
                border: `1px solid ${isActive ? "rgba(163,230,53,0.2)" : C.border}`,
                transition: "all 0.15s",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={link.icon}/></svg>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* ── Section tabs ── */}
      <nav style={{
        display: "flex", gap: 2, padding: "0 28px",
        background: "rgba(20,20,24,0.6)", borderBottom: `1px solid ${C.border}`,
      }}>
        {SECTION_TABS.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button key={tab.id} type="button" onClick={() => setActiveSection(tab.id)} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 18px", fontSize: 13, fontWeight: isActive ? 700 : 500,
              color: isActive ? C.accent : C.dim,
              background: "transparent", border: "none", cursor: "pointer",
              borderBottom: isActive ? `2px solid ${C.accent}` : "2px solid transparent",
              transition: "all 0.15s", whiteSpace: "nowrap",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={tab.icon}/></svg>
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px" }}>
        {loading && <p style={{ textAlign: "center", color: C.dim, padding: "60px 0" }}>Loading dashboard...</p>}

        {!loading && stats && (
          <>
            {/* ══════════ OVERVIEW ══════════ */}
            {activeSection === "overview" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
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
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon}/></svg>
                        </div>
                        <span style={{ fontSize: 11, color: C.dim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{card.label}</span>
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800 }}>{card.value}</div>
                    </div>
                  ))}
                </div>

                {/* Quick links to Blog & Alerts */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Link href="/admin/blog" style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ ...cardStyle, cursor: "pointer", transition: "border-color 0.15s", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </div>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>News / Blog</h3>
                        <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Write, schedule, and manage blog posts</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto", flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </Link>
                  <Link href="/admin/alerts" style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ ...cardStyle, cursor: "pointer", transition: "border-color 0.15s", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: C.dangerDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                      </div>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>Push Alerts</h3>
                        <p style={{ fontSize: 12, color: C.dim, margin: 0 }}>Send and schedule notifications to users</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto", flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </Link>
                </div>
              </>
            )}

            {/* ══════════ GUESTS ══════════ */}
            {activeSection === "guests" && (
              <div style={cardStyle}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>Guest Access Manager</h2>
                <p style={{ fontSize: 12, color: C.dim, margin: "0 0 20px" }}>Grant users free access to the studio without a subscription.</p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: "1 1 200px" }}>
                    <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4, fontWeight: 600 }}>Email</label>
                    <input type="email" placeholder="user@example.com" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: "0 0 140px" }}>
                    <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4, fontWeight: 600 }}>Duration</label>
                    <select value={guestDuration} onChange={(e) => setGuestDuration(e.target.value as "7days" | "1month" | "forever")} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", cursor: "pointer" }}>
                      <option value="7days">7 Days</option><option value="1month">1 Month</option><option value="forever">Forever</option>
                    </select>
                  </div>
                  <div style={{ flex: "0 0 140px" }}>
                    <label style={{ display: "block", fontSize: 11, color: C.dim, marginBottom: 4, fontWeight: 600 }}>Password (new users)</label>
                    <input type="text" placeholder="Optional" value={guestPassword} onChange={(e) => setGuestPassword(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <button type="button" onClick={() => void addGuest()} disabled={addingGuest || !guestEmail.trim()} style={{ padding: "9px 20px", fontSize: 13, fontWeight: 700, borderRadius: 8, background: C.accent, color: "#111", border: "none", cursor: "pointer", opacity: addingGuest ? 0.6 : 1 }}>
                    {addingGuest ? "Adding..." : "Grant Access"}
                  </button>
                </div>
                {guestMsg && <p style={{ fontSize: 12, color: guestMsg.includes("granted") ? C.accent : C.danger, margin: "-12px 0 16px" }}>{guestMsg}</p>}

                {guests.length === 0 ? (
                  <p style={{ fontSize: 13, color: C.dim, textAlign: "center", padding: "20px 0" }}>No guest users yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 120px 80px 60px", gap: 8, padding: "0 8px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.dim }}>
                      <span>Email</span><span>Duration</span><span>Expires</span><span>Status</span><span></span>
                    </div>
                    {guests.map((g) => (
                      <div key={g.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 120px 80px 60px", gap: 8, alignItems: "center", padding: "10px 8px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{g.email}</div>
                          {g.name && <div style={{ fontSize: 11, color: C.dim }}>{g.name}</div>}
                        </div>
                        <span style={{ fontSize: 12, color: C.dim }}>{g.duration === "7days" ? "7 Days" : g.duration === "1month" ? "1 Month" : "Forever"}</span>
                        <span style={{ fontSize: 12, color: C.dim }}>{g.expiresAt ? formatDate(g.expiresAt) : "Never"}</span>
                        <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: g.status === "active" ? C.accentDim : C.dangerDim, color: g.status === "active" ? C.accent : C.danger }}>
                          {g.status === "active" ? "Active" : "Expired"}
                        </span>
                        <button type="button" onClick={() => setPendingDeleteId(g.id)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, background: C.dangerDim, color: C.danger, border: `1px solid rgba(239,68,68,0.2)`, cursor: "pointer" }}>Revoke</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════ REPORTS ══════════ */}
            {activeSection === "reports" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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

                <div style={cardStyle}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Platform Overview</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { label: "Active novels", value: stats.activeNovels },
                      { label: "Archived novels", value: stats.archivedNovels },
                      { label: "Paying subscribers", value: stats.activeSubCount },
                      { label: "On trial", value: stats.trialSubCount },
                      { label: "Guest users", value: stats.guestCount },
                    ].map((row) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: C.dim }}>{row.label}</span>
                        <span style={{ fontWeight: 700 }}>{row.value}</span>
                      </div>
                    ))}
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
            )}
          </>
        )}
      </div>

      {/* ── Revoke confirmation modal ── */}
      {pendingDeleteId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setPendingDeleteId(null)}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 24px", maxWidth: 380, width: "90%", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: 12, margin: "0 auto 16px", background: C.dangerDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Revoke access?</h3>
            <p style={{ fontSize: 13, color: C.dim, margin: "0 0 20px" }}>This user will lose free studio access immediately. They&apos;ll need a subscription to continue.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button type="button" onClick={() => setPendingDeleteId(null)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: C.dim, border: `1px solid ${C.border}`, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={() => void removeGuest(pendingDeleteId)} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: C.danger, color: "#fff", border: "none", cursor: "pointer" }}>Revoke</button>
            </div>
          </div>
        </div>
      )}

      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.12)", textAlign: "center", padding: "24px 0 12px" }}>&copy; {new Date().getFullYear()} Blocwrite. All rights reserved.</p>
    </div>
  );
}
