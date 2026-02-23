"use client";

import Link from "next/link";
import { useState } from "react";

const C = {
  bg: "#fafaf9",
  bgWhite: "#ffffff",
  bgDark: "#0c0c1d",
  bgDarkSoft: "#12122a",
  bgDarkCard: "#16163a",
  text: "#1a1a2e",
  textSoft: "#5c5c72",
  textMuted: "#9494a8",
  textOnDark: "#e8e8f0",
  border: "#e6e6ec",
  borderSoft: "#f0f0f4",
  accent: "#b8a4ff",
  accentSoft: "#d4c8ff",
  accentGold: "#e2c87e",
  accentGoldSoft: "#f5ecd1",
  gradientPrimary: "linear-gradient(135deg, #7c5cfc 0%, #b8a4ff 100%)",
  gradientHero: "linear-gradient(180deg, #0c0c1d 0%, #14142e 50%, #1a1a3a 100%)",
  gradientCard: "linear-gradient(135deg, rgba(124,92,252,0.06) 0%, rgba(184,164,255,0.03) 100%)",
  btnPrimary: "linear-gradient(135deg, #7c5cfc 0%, #6246ea 100%)",
  btnText: "#ffffff",
};

const MAX_W = 1140;
const wrap = (extra?: React.CSSProperties): React.CSSProperties => ({
  maxWidth: MAX_W,
  margin: "0 auto",
  padding: "0 32px",
  ...extra,
});

export default function LandingPage() {
  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}>
      <style>{`
        @keyframes bwFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes bwFadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bwShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .bw-float { animation: bwFloat 6s ease-in-out infinite; }
        .bw-fade-up { animation: bwFadeUp 0.8s ease forwards; }
        .bw-mockup { border-radius:16px; overflow:hidden; }
        .bw-card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .bw-card-hover:hover { transform: translateY(-6px); box-shadow: 0 24px 64px rgba(12,12,29,0.12); }
        .bw-feature-row { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; }
        .bw-feature-row.reverse { direction:rtl; }
        .bw-feature-row.reverse > * { direction:ltr; }
        @media (max-width:768px) {
          .bw-hero-title { font-size:36px !important; }
          .bw-hero-sub { font-size:16px !important; max-width:100% !important; }
          .bw-hero-btns { flex-direction:column !important; align-items:stretch !important; }
          .bw-hero-btns a { text-align:center; justify-content:center; }
          .bw-hero-mockup-wrap { margin-top:40px !important; }
          .bw-feature-row { grid-template-columns:1fr !important; gap:40px !important; }
          .bw-feature-row.reverse { direction:ltr; }
          .bw-features-grid { grid-template-columns:1fr !important; }
          .bw-pricing-grid { grid-template-columns:1fr !important; max-width:400px !important; }
          .bw-section-title { font-size:32px !important; }
          .bw-footer-inner { flex-direction:column !important; text-align:center; gap:20px !important; }
          .bw-footer-links { justify-content:center !important; }
          .bw-nav-links { display:none !important; }
          .bw-nav-login { display:none !important; }
          .bw-trust-grid { grid-template-columns:1fr 1fr !important; }
          .bw-pills-wrap { display:none !important; }
          .bw-nf-grid { grid-template-columns:1fr !important; }
        }
        @media (max-width:480px) {
          .bw-hero-title { font-size:28px !important; }
          .bw-trust-grid { grid-template-columns:1fr !important; }
          .bw-pricing-grid { max-width:100% !important; }
        }
      `}</style>
      <Nav />
      <Hero />
      <TrustBar />
      <ShowcaseSection />
      <FeatureHighlights />
      <NonFictionSection />
      <IntelligenceGrid />
      <Pricing />
      <FAQ />
      <CTABanner />
      <Footer />
    </main>
  );
}

/* ── Nav ── */
function Nav() {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(12,12,29,0.97)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ ...wrap(), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 34, width: "auto" }} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div style={{ display: "flex", gap: 32 }} className="bw-nav-links">
            {[
              { label: "Features", href: "#features" },
              { label: "Non-Fiction", href: "#nonfiction" },
              { label: "Pricing", href: "#pricing" },
              { label: "News", href: "/news" },
              { label: "FAQ", href: "#faq" },
            ].map((l) => (
              <a key={l.href} href={l.href} style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}>
                {l.label}
              </a>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/login" className="bw-nav-login" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>Log in</Link>
            <Link href="/subscribe" style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px",
              fontSize: 13, fontWeight: 600, borderRadius: 10,
              background: C.btnPrimary, color: "#fff", textDecoration: "none",
              boxShadow: "0 2px 12px rgba(124,92,252,0.3)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}>
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero ── */
function Hero() {
  return (
    <section style={{ padding: 0, background: C.gradientHero, position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: "-30%", left: "50%", transform: "translateX(-50%)",
        width: "120%", height: "100%",
        background: "radial-gradient(ellipse at center, rgba(124,92,252,0.08) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: "20%", right: "-10%", width: 400, height: 400,
        background: "radial-gradient(circle, rgba(226,200,126,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ ...wrap(), textAlign: "center", padding: "100px 32px 80px", position: "relative", zIndex: 1 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 20px", borderRadius: 100, marginBottom: 36,
          background: "rgba(124,92,252,0.1)", border: "1px solid rgba(124,92,252,0.2)",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.accent, letterSpacing: "0.04em" }}>
            Fiction &amp; Non-Fiction Writing Studio
          </span>
        </div>

        <h1 className="bw-hero-title" style={{
          fontSize: "clamp(40px, 5.5vw, 68px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.06,
          margin: "0 auto", maxWidth: 820, color: "#ffffff",
        }}>
          Your entire novel.{" "}
          <span style={{
            backgroundImage: "linear-gradient(135deg, #b8a4ff, #e2c87e)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            One intelligent studio.
          </span>
        </h1>

        <p className="bw-hero-sub" style={{ fontSize: 18, lineHeight: 1.7, color: "rgba(255,255,255,0.5)", maxWidth: 600, margin: "28px auto 0" }}>
          Plan your plot spine. Draft scene by scene. The AI reads your characters, world, and voice before writing a single word. Edit with 11 continuity checks. Export a publish-ready manuscript.
        </p>

        <div className="bw-hero-btns" style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 44, flexWrap: "wrap" }}>
          <Link href="/subscribe" style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 40px",
            fontSize: 15, fontWeight: 600, borderRadius: 14,
            background: C.btnPrimary, color: "#fff", textDecoration: "none",
            boxShadow: "0 4px 24px rgba(124,92,252,0.35)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}>
            Start 7-Day Free Trial
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
          <a href="#features" style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 40px",
            fontSize: 15, fontWeight: 600, borderRadius: 14,
            background: "transparent", color: "rgba(255,255,255,0.65)", textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            transition: "all 0.15s",
          }}>
            See how it works
          </a>
        </div>

        {/* Abstract app preview */}
        <div className="bw-hero-mockup-wrap" style={{ marginTop: 72, position: "relative", maxWidth: 860, margin: "72px auto 0" }}>
          <div className="bw-float" style={{
            borderRadius: 20, overflow: "hidden",
            boxShadow: "0 60px 120px rgba(0,0,0,0.4), 0 0 80px rgba(124,92,252,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "linear-gradient(135deg, #12122a 0%, #1a1a3a 100%)",
          }}>
            {/* Browser chrome bar */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
              <span style={{ flex: 1, marginLeft: 12, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>blocwrite.com/studio</span>
              </span>
            </div>
            {/* App content preview */}
            <div style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "180px 1fr", gap: 20, minHeight: 340 }}>
              {/* Sidebar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, borderRight: "1px solid rgba(255,255,255,0.06)", paddingRight: 20 }}>
                {["Overview", "Canon", "Plan", "Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4", "Editor", "Health", "Export"].map((item, j) => (
                  <div key={item} style={{
                    padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                    color: j === 0 ? "#fff" : "rgba(255,255,255,0.35)",
                    background: j === 0 ? "rgba(124,92,252,0.2)" : "transparent",
                    border: j === 0 ? "1px solid rgba(124,92,252,0.3)" : "1px solid transparent",
                  }}>{item}</div>
                ))}
              </div>
              {/* Main content area */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, height: 80, borderRadius: 12, background: "rgba(124,92,252,0.08)", border: "1px solid rgba(124,92,252,0.15)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 16px" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Word Count</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "#b8a4ff" }}>47,832</span>
                  </div>
                  <div style={{ flex: 1, height: 80, borderRadius: 12, background: "rgba(226,200,126,0.06)", border: "1px solid rgba(226,200,126,0.12)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 16px" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Health Score</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "#e2c87e" }}>8.4</span>
                  </div>
                  <div style={{ flex: 1, height: 80, borderRadius: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 16px" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Chapters</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>24</span>
                  </div>
                </div>
                {/* Skeleton chapter list */}
                {[1,2,3].map(n => (
                  <div key={n} style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(124,92,252,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#7c5cfc" }}>{n}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 8, width: `${70 - n * 10}%`, borderRadius: 4, background: "rgba(255,255,255,0.1)", marginBottom: 6 }} />
                      <div style={{ height: 6, width: `${90 - n * 8}%`, borderRadius: 4, background: "rgba(255,255,255,0.04)" }} />
                    </div>
                    <div style={{ width: 48, height: 6, borderRadius: 4, background: n === 1 ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Trust Bar ── */
function TrustBar() {
  const items = [
    { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: "7-day free trial", sub: "Every feature unlocked" },
    { icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "Bring your own AI", sub: "OpenRouter, HuggingFace, LM Studio" },
    { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", label: "Private by default", sub: "We never read your writing" },
    { icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4", label: "Publish-ready export", sub: "EPUB & DOCX, zero AI metadata" },
  ];
  return (
    <section style={{ background: C.bgWhite, padding: "40px 0", borderBottom: `1px solid ${C.border}` }}>
      <div className="bw-trust-grid" style={{ ...wrap(), display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
        {items.map((s) => (
          <div key={s.label} style={{ textAlign: "center", padding: "0 8px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(124,92,252,0.06)", border: "1px solid rgba(124,92,252,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c5cfc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon}/></svg>
              </div>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: C.text }}>{s.label}</p>
            <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0", lineHeight: 1.5 }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Showcase — 3 hero features with styled UI previews ── */
function PlotSpinePreview() {
  const beats = [
    { act: "Act 1", label: "Inciting Incident", ch: "Ch 2", t: 0.3 },
    { act: "Act 1", label: "First Threshold", ch: "Ch 4", t: 0.5 },
    { act: "Act 2", label: "Rising Conflict", ch: "Ch 8", t: 0.7 },
    { act: "Act 2", label: "Midpoint Reversal", ch: "Ch 12", t: 0.85 },
    { act: "Act 3", label: "Climax", ch: "Ch 20", t: 1.0 },
    { act: "Act 3", label: "Resolution", ch: "Ch 24", t: 0.4 },
  ];
  return (
    <div style={{ borderRadius: 16, background: "#12122a", border: "1px solid rgba(124,92,252,0.15)", padding: 24, minHeight: 320 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c5cfc" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#b8a4ff", letterSpacing: "0.06em" }}>PLOT SPINE</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.25)", padding: "3px 10px", borderRadius: 6, background: "rgba(124,92,252,0.1)" }}>Hero&apos;s Journey</span>
      </div>
      {beats.map((b, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < beats.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", width: 36, textTransform: "uppercase" }}>{b.act}</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>{b.label}</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginRight: 8 }}>{b.ch}</span>
          <div style={{ width: 60, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ width: `${b.t * 100}%`, height: "100%", borderRadius: 3, background: `rgba(124,92,252,${0.3 + b.t * 0.5})` }} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 16, display: "flex", gap: 6 }}>
        {["3 Subplots", "4 Character Arcs", "24 Beats"].map(s => (
          <span key={s} style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function CanonPreview() {
  const chars = [
    { name: "Elena Voss", role: "Protagonist", color: "#e2c87e" },
    { name: "Marcus Chen", role: "Antagonist", color: "#ef4444" },
    { name: "Dr. Amara Obi", role: "Mentor", color: "#10b981" },
  ];
  return (
    <div style={{ borderRadius: 16, background: "#12122a", border: "1px solid rgba(226,200,126,0.15)", padding: 24, minHeight: 320 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e2c87e" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#e2c87e", letterSpacing: "0.06em" }}>THE CANON</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["Characters", "Locations", "Lore"].map((tab, j) => (
          <span key={tab} style={{ fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 8, color: j === 0 ? "#e2c87e" : "rgba(255,255,255,0.3)", background: j === 0 ? "rgba(226,200,126,0.1)" : "transparent", border: j === 0 ? "1px solid rgba(226,200,126,0.2)" : "1px solid transparent" }}>{tab}</span>
        ))}
      </div>
      {chars.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < chars.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.color}15`, border: `1px solid ${c.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: c.color }}>{c.name[0]}</div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{c.name}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: 8 }}>{c.role}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </div>
      ))}
      <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Voice Rules</span>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "6px 0 0", lineHeight: 1.5 }}>Close third-person. Spare prose. Short sentences in action. Let silence do the heavy lifting.</p>
      </div>
    </div>
  );
}

function BlocsPreview() {
  const blocs = [
    { num: 1, label: "The Arrival", words: "680 / 800", pct: 85, emotionalArc: "Anticipation \u2192 Unease" },
    { num: 2, label: "First Confrontation", words: "420 / 600", pct: 70, emotionalArc: "Tension \u2192 Resolve" },
    { num: 3, label: "The Revelation", words: "0 / 700", pct: 0, emotionalArc: "Shock \u2192 Determination" },
  ];
  return (
    <div style={{ borderRadius: 16, background: "#12122a", border: "1px solid rgba(98,70,234,0.15)", padding: 24, minHeight: 320 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6246ea" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#b8a4ff", letterSpacing: "0.06em" }}>CHAPTER 7 \u2014 BLOCS</span>
      </div>
      {blocs.map((b, i) => (
        <div key={i} style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", marginBottom: i < blocs.length - 1 ? 8 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(98,70,234,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#b8a4ff" }}>{b.num}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{b.label}</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{b.words}</span>
          </div>
          <div style={{ width: "100%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)", marginBottom: 8 }}>
            <div style={{ width: `${b.pct}%`, height: "100%", borderRadius: 2, background: b.pct > 0 ? "rgba(98,70,234,0.5)" : "transparent", transition: "width 0.3s" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>Emotional Arc:</span>
            <span style={{ fontSize: 10, color: "rgba(184,164,255,0.5)" }}>{b.emotionalArc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShowcaseSection() {
  const SHOWCASES = [
    {
      pre: "PLOT SPINE",
      title: "Build your story\u2019s DNA before writing a word.",
      desc: "Choose a narrative arc, and the AI generates story beats across three acts, subplots, and character arcs \u2014 all mapped to your chapters. Every scene knows where it sits in the bigger picture.",
      details: ["Genre-aware arc picker", "Beats, subplots, character arcs", "Auto-links to chapter plan", "Story Enhancer for emotional depth"],
      color: "#7c5cfc",
      preview: <PlotSpinePreview />,
    },
    {
      pre: "THE CANON",
      title: "Your story\u2019s single source of truth.",
      desc: "Characters with personality and speech patterns. Locations with sensory detail. Lore, voice rules, worldbuilding. The AI reads all of it before writing \u2014 so nothing ever drifts from your story.",
      details: ["Full character profiles", "Locations & worldbuilding", "Style & voice directives", "AI-powered synopsis tools"],
      color: "#e2c87e",
      preview: <CanonPreview />,
    },
    {
      pre: "SCENE-BY-SCENE DRAFTING",
      title: "Rich blueprints. Precise prose.",
      desc: "Each chapter splits into scene blocs with detailed writer\u2019s blueprints \u2014 opening lines, emotional arcs, sensory palettes, dialogue cues, and tension levels. The AI follows your blueprint exactly.",
      details: ["Opening & closing instructions", "Emotional arc tracking", "Sensory palette guidance", "Anti-AI prose rules built in"],
      color: "#6246ea",
      preview: <BlocsPreview />,
    },
  ];

  return (
    <section id="features" style={{ padding: "100px 0 60px" }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 80 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7c5cfc", marginBottom: 14 }}>
            HOW IT WORKS
          </p>
          <h2 className="bw-section-title" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.035em", margin: "0 0 16px", color: C.text }}>
            From first idea to finished manuscript.
          </h2>
          <p style={{ fontSize: 17, color: C.textSoft, maxWidth: 560, margin: "0 auto", lineHeight: 1.65 }}>
            Everything connects. Your Canon feeds the Plan. The Plan feeds the Blocs. The Blocs feed the prose. Nothing drifts.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 120 }}>
          {SHOWCASES.map((s, i) => (
            <div key={s.pre} className={`bw-feature-row${i % 2 === 1 ? " reverse" : ""}`}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: s.color }}>{s.pre}</span>
                <h3 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "14px 0 16px", color: C.text }}>{s.title}</h3>
                <p style={{ fontSize: 16, lineHeight: 1.7, color: C.textSoft, margin: "0 0 28px" }}>{s.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {s.details.map((d) => (
                    <div key={d} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      <span style={{ fontSize: 14, fontWeight: 500, color: C.textSoft }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bw-float" style={{ animationDelay: `${i * 0.8}s` }}>
                {s.preview}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Feature Highlights — compact grid ── */
function FeatureHighlights() {
  const features = [
    { title: "11-Point Continuity Engine", desc: "Canon Traits, Timeline, Relationships, Spatial Logic, Voice Drift, Emotional Arc and more. Instant checks catch what you miss.", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "#ef4444" },
    { title: "Manuscript Health Score", desc: "Pacing, dialogue, clarity, engagement \u2014 scored out of 10. Per-chapter breakdowns with specific tips.", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", color: "#e2c87e" },
    { title: "Chat with Characters", desc: "Live AI conversation with any character from your Canon. They answer in their own voice. Story Insights recommends updates.", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "#fb923c" },
    { title: "AI Co-Author", desc: "A writing partner who knows your entire novel. Ask about plot holes, brainstorm twists, get pacing feedback. Always available.", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", color: "#06b6d4" },
    { title: "Bolt-Ons & Writing Packs", desc: "Plain-English directives \u2014 \u2018keep it gritty\u2019, \u2018more dialogue\u2019. Genre craft kits: Romance, Thriller, Horror, Fantasy.", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", color: "#10b981" },
    { title: "Beta Reader Sharing", desc: "Password-protected links. Readers highlight and annotate in a branded view. Review feedback with AI-assisted accept or reject.", icon: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3", color: "#8b5cf6" },
  ];
  return (
    <section style={{ padding: "80px 0 100px", background: C.bgWhite }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7c5cfc", marginBottom: 14 }}>INTELLIGENCE LAYER</p>
          <h2 className="bw-section-title" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.035em", margin: 0, color: C.text }}>
            Features no other writing tool offers.
          </h2>
        </div>
        <div className="bw-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} className="bw-card-hover" style={{
              padding: 32, borderRadius: 20, border: `1px solid ${C.border}`, background: C.bg,
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${f.color}0a`, border: `1px solid ${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon}/></svg>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginTop: 20, marginBottom: 8, color: C.text }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: C.textSoft, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Non-Fiction Section ── */
function NonFictionSection() {
  const features = [
    { title: "Guided Life Interview", desc: "AI asks thoughtful, open-ended questions about your life, relationships, and turning points. Your answers become the foundation of your book.", icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" },
    { title: "Life Events & Emotional Timeline", desc: "Structure your real-life experiences with dates, people, places, and emotional weight. The AI uses this timeline to pace your story authentically.", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { title: "Auto-Extract to Canon", desc: "People, places, and themes from your interview are automatically pulled into your Canon. No manual data entry \u2014 your story bible builds itself.", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
    { title: "5 Non-Fiction Subtypes", desc: "Memoir, biography, true crime, historical, investigative. Each mode tailors the AI\u2019s writing style, research tools, and interview questions.", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  ];
  return (
    <section id="nonfiction" style={{ padding: "100px 0", background: C.gradientHero, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", bottom: "-20%", left: "20%", width: 500, height: 500, background: "radial-gradient(circle, rgba(226,200,126,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={wrap({ position: "relative", zIndex: 1 })}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(226,200,126,0.1)", border: "1px solid rgba(226,200,126,0.2)", marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.accentGold }}>NON-FICTION &amp; BIOGRAPHY</span>
          </span>
          <h2 className="bw-section-title" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.035em", color: "#fff", margin: "16px 0 16px" }}>
            True stories deserve real tools.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", maxWidth: 560, margin: "0 auto", lineHeight: 1.65 }}>
            Write memoir, biography, true crime, historical, or investigative non-fiction with AI tools designed specifically for real-world storytelling.
          </p>
        </div>

        <div className="bw-feature-row" style={{ marginBottom: 64 }}>
          <div>
            <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(226,200,126,0.12)", padding: 24, minHeight: 320 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e2c87e" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2c87e", letterSpacing: "0.06em" }}>LIFE INTERVIEW</span>
              </div>
              <div style={{ padding: 14, borderRadius: 10, background: "rgba(226,200,126,0.04)", border: "1px solid rgba(226,200,126,0.08)", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#e2c87e", display: "block", marginBottom: 6 }}>AI Question</span>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>Tell me about a moment that changed how you saw yourself. What happened, and who was there?</p>
              </div>
              <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 6 }}>Your Answer</span>
                <div style={{ height: 6, width: "90%", borderRadius: 3, background: "rgba(255,255,255,0.06)", marginBottom: 5 }} />
                <div style={{ height: 6, width: "75%", borderRadius: 3, background: "rgba(255,255,255,0.04)", marginBottom: 5 }} />
                <div style={{ height: 6, width: "60%", borderRadius: 3, background: "rgba(255,255,255,0.03)" }} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["3 People Extracted", "2 Locations Found", "1 Theme Identified"].map(s => (
                  <span key={s} style={{ fontSize: 9, fontWeight: 600, color: "rgba(226,200,126,0.5)", padding: "4px 8px", borderRadius: 6, background: "rgba(226,200,126,0.06)", border: "1px solid rgba(226,200,126,0.1)" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="bw-nf-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
              {features.map((f) => (
                <div key={f.title} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(226,200,126,0.08)", border: "1px solid rgba(226,200,126,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.accentGold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon}/></svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>{f.title}</h4>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.45)", margin: 0 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Intelligence Grid — extra features ── */
function IntelligenceGrid() {
  const items = [
    { title: "Smart Rewrite", desc: "Highlight text and rewrite in 6 modes: emotional, suspenseful, poetic, tighter, bestseller, or polish." },
    { title: "Story Enhancer", desc: "Deepen your synopses with richer emotion, stronger transitions, and more character depth \u2014 without changing plot." },
    { title: "Plot Spine Doctor", desc: "AI diagnoses structural issues in your plot spine and offers targeted fixes for pacing and tension." },
    { title: "Full Formatting Toolbar", desc: "Bold, italic, headings, alignment, section breaks. Formatting carries through to your exported manuscript." },
    { title: "Anti-AI Prose Rules", desc: "Built-in rules ban overused AI words, limit em dashes, and enforce natural sentence variety. Your prose reads human." },
    { title: "Publish-Ready Export", desc: "EPUB and DOCX. Clean chaptered prose with zero AI notes or metadata. Ready for agents or self-publishing." },
  ];
  return (
    <section style={{ padding: "80px 0 100px" }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 className="bw-section-title" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: C.text }}>And everything else you need.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="bw-features-grid">
          {items.map((f) => (
            <div key={f.title} style={{ padding: "24px 28px", borderRadius: 16, border: `1px solid ${C.border}`, background: C.bgWhite }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px", color: C.text }}>{f.title}</h4>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: C.textSoft, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ── */
function Pricing() {
  return (
    <section id="pricing" style={{ padding: "100px 0", background: C.bgWhite }}>
      <div style={wrap({ textAlign: "center" })}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7c5cfc", marginBottom: 14 }}>PRICING</p>
        <h2 className="bw-section-title" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.035em", margin: "0 0 12px", color: C.text }}>Studio access. No AI fees.</h2>
        <p style={{ fontSize: 17, color: C.textSoft, marginBottom: 12, lineHeight: 1.6 }}>The subscription covers the workspace. AI costs are yours to manage with your own key.</p>
        <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 56 }}>Every plan includes a 7-day free trial. Cancel anytime.</p>

        <div className="bw-pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 720, margin: "0 auto" }}>
          <PriceCard name="Monthly" price="£12.99" period="month" badge={null}
            features={["Full studio access", "Unlimited novels & chapters", "Canon, Plan, Blocs, Export", "The Editor & Co-Author", "Bolt-Ons & Writing Packs", "Non-Fiction & Biography mode", "Bring your own AI key", "Cancel anytime"]}
          />
          <PriceCard name="Annual" price="£99" period="year" badge="Save 36%" highlighted
            features={["Everything in Monthly", "Billed annually", "Works out to £8.25/mo", "Priority for new features", "Cancel anytime"]}
          />
        </div>

        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 36, maxWidth: 520, margin: "36px auto 0", lineHeight: 1.6 }}>
          AI usage is not billed by Blocwrite. Connect your own key from OpenRouter, Infermatic, Hugging Face, or LM Studio. Free models available.
        </p>
      </div>
    </section>
  );
}

function PriceCard({ name, price, period, badge, features, highlighted }: {
  name: string; price: string; period: string; badge: string | null; features: string[]; highlighted?: boolean;
}) {
  return (
    <div className="bw-card-hover" style={{
      padding: 36, borderRadius: 24, textAlign: "left", position: "relative",
      border: highlighted ? "2px solid #7c5cfc" : `1px solid ${C.border}`,
      background: highlighted ? "linear-gradient(135deg, rgba(124,92,252,0.03) 0%, rgba(184,164,255,0.02) 100%)" : C.bgWhite,
      boxShadow: highlighted ? "0 16px 56px rgba(124,92,252,0.1)" : "0 2px 8px rgba(0,0,0,0.02)",
    }}>
      {badge && (
        <span style={{
          position: "absolute", top: 18, right: 18, padding: "5px 14px", fontSize: 11, fontWeight: 700, borderRadius: 10,
          background: C.btnPrimary, color: "#fff",
        }}>{badge}</span>
      )}
      <p style={{ fontSize: 14, fontWeight: 600, color: C.textSoft, marginBottom: 10 }}>{name}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em", color: C.text }}>{price}</span>
        <span style={{ fontSize: 14, color: C.textMuted }}>/ {period}</span>
      </div>
      <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4, marginBottom: 28 }}>7-day free trial included</p>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px" }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.textSoft, padding: "6px 0" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c5cfc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
            {f}
          </li>
        ))}
      </ul>
      <Link href="/subscribe" style={{
        display: "flex", alignItems: "center", justifyContent: "center", padding: "14px 0", width: "100%",
        fontSize: 15, fontWeight: 700, borderRadius: 14, textDecoration: "none",
        background: highlighted ? C.btnPrimary : "transparent",
        color: highlighted ? "#fff" : "#7c5cfc",
        border: highlighted ? "none" : "1.5px solid #7c5cfc",
        boxShadow: highlighted ? "0 4px 16px rgba(124,92,252,0.25)" : "none",
        transition: "all 0.15s",
      }}>
        Start Free Trial
      </Link>
    </div>
  );
}

/* ── FAQ ── */
const FAQ_ITEMS = [
  { q: "What is Blocwrite?", a: "A complete writing studio for novels \u2014 fiction and non-fiction. Plot Spine planning, scene-by-scene drafting with rich blueprints, 11-point continuity checking, manuscript health scoring, character chat, AI co-author, smart rewrite, bolt-ons, writing packs, beta reader sharing, and EPUB/DOCX export." },
  { q: "Is AI included in the subscription?", a: "No. You bring your own API key from OpenRouter (free models available), Hugging Face, Infermatic, or LM Studio (local, completely free). We never charge for AI." },
  { q: "Can I use it without AI?", a: "Yes. Every feature works without AI. Plan, write, format, export \u2014 all by hand. AI is optional." },
  { q: "What is the Plot Spine?", a: "Your story\u2019s structural backbone. Choose a narrative arc, and the AI generates story beats across three acts, subplots, and character arcs \u2014 all auto-linked to your chapter plan." },
  { q: "How does The Editor work?", a: "One button, two modes. In a chapter: 11 continuity checks, grammar pass, and prose polish. In the overview: full-manuscript sentence-level rewrites with diffs." },
  { q: "Can I write non-fiction?", a: "Yes. Memoir, biography, true crime, historical, investigative. Guided Life Interview, Life Events timeline, emotional mapping, relationship webs, auto-extraction to Canon." },
  { q: "What are Bolt-Ons?", a: "Plain-English directives attached per-chapter or per-scene \u2014 \u2018keep it gritty\u2019, \u2018more dialogue\u2019. They tell the AI exactly how to write." },
  { q: "How does the free trial work?", a: "7 days, full access, every feature. No charge until the trial ends. Cancel anytime." },
  { q: "Is my writing private?", a: "Yes. Isolated storage, no training on your data. API keys stored in your browser. We never read or share your content." },
  { q: "Does the AI write like AI?", a: "We\u2019ve built in comprehensive anti-AI prose rules: banned overused words (fluorescent, ethereal, visceral...), limited em dashes, enforced sentence variety, and show-don\u2019t-tell guidelines. The prose reads human." },
];

function FAQ() {
  return (
    <section id="faq" style={{ padding: "100px 0", background: C.bg }}>
      <div style={wrap({ maxWidth: 720 })}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7c5cfc", marginBottom: 14 }}>FAQ</p>
          <h2 className="bw-section-title" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.035em", margin: 0, color: C.text }}>Common questions.</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {FAQ_ITEMS.map((item) => <FAQItem key={item.q} q={item.q} a={item.a} />)}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: "22px 0" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "none", border: "none", cursor: "pointer", padding: 0,
        textAlign: "left", fontSize: 16, fontWeight: 600, color: C.text, fontFamily: "inherit", lineHeight: 1.4,
      }}>
        <span>{q}</span>
        <span style={{ fontSize: 20, color: C.textMuted, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none", flexShrink: 0, marginLeft: 16 }}>+</span>
      </button>
      {open && <p style={{ fontSize: 15, lineHeight: 1.65, color: C.textSoft, marginTop: 14, marginBottom: 0 }}>{a}</p>}
    </div>
  );
}

/* ── CTA Banner ── */
function CTABanner() {
  return (
    <section style={{ padding: "100px 0", background: C.gradientHero, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", bottom: "-40%", left: "50%", transform: "translateX(-50%)", width: "80%", height: "100%", background: "radial-gradient(ellipse, rgba(124,92,252,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ ...wrap(), textAlign: "center", position: "relative", zIndex: 1 }}>
        <h2 className="bw-section-title" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.035em", color: "#fff", margin: "0 0 18px" }}>
          Ready to write something real?
        </h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", marginBottom: 48, maxWidth: 540, margin: "0 auto 48px", lineHeight: 1.6 }}>
          Plan your story. Draft scene by scene. Chat with your characters. Polish with The Editor. Export a clean manuscript. Fiction or non-fiction.
        </p>
        <Link href="/subscribe" style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 40px",
          fontSize: 15, fontWeight: 600, borderRadius: 14,
          background: C.btnPrimary, color: "#fff", textDecoration: "none",
          boxShadow: "0 4px 24px rgba(124,92,252,0.35)",
        }}>
          Start Free Trial
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer style={{ padding: "52px 0 44px", background: C.bgDark, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="bw-footer-inner" style={{ ...wrap(), display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 30, width: "auto", opacity: 0.5 }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>&copy; {new Date().getFullYear()} Blocwrite</span>
        </div>
        <div className="bw-footer-links" style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {[
            { label: "News", href: "/news" },
            { label: "Terms", href: "/terms" },
            { label: "Refund Policy", href: "/refunds" },
            { label: "Contact", href: "/contact" },
            { label: "Log in", href: "/login" },
          ].map((l) => (
            <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
