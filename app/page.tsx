"use client";

import Lenis from "lenis";
import Link from "next/link";
import { useEffect, useState } from "react";
import "lenis/dist/lenis.css";

function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.9,
      smoothWheel: false,
      autoRaf: true,
      anchors: { offset: 88 },
    });
    return () => lenis.destroy();
  }, []);
}

/* Premium: restrained, readable, editorial */
const C = {
  dark: "#0a0a0a",
  darkSoft: "#141414",
  darkCard: "#1a1a1a",
  light: "#fafaf9",
  lightAlt: "#f5f4f2",
  text: "#fafafa",
  textMuted: "rgba(255,255,255,0.6)",
  textOnLight: "#0a0a0a",
  textOnLightMuted: "#525252",
  accent: "#0a0a0a",
  accentSoft: "#404040",
  warm: "#8b6914",
  warmLight: "#a67c18",
  border: "rgba(255,255,255,0.06)",
  borderLight: "rgba(0,0,0,0.08)",
  white: "#ffffff",
  black: "#0a0a0a",
  bgAlt: "#141414",
};

const MAX_W = 1200;
const wrap = (extra?: React.CSSProperties): React.CSSProperties => ({
  maxWidth: MAX_W,
  margin: "0 auto",
  padding: "0 32px",
  ...extra,
});

export default function LandingPage() {
  useLenis();
  return (
    <main style={{ background: C.dark, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }} className="bw-landing">
      <style>{`
        .bw-landing { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .bw-landing h1, .bw-landing h2, .bw-landing h3 { font-family: var(--font-display, 'Figtree'), system-ui, sans-serif; }
        .bw-card-hover { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1); }
        .bw-card-hover:hover { transform: translateY(-6px); box-shadow: 0 32px 64px -12px rgba(0,0,0,0.25); }
        .bw-nav-link { transition: color 0.25s ease; }
        .bw-nav-link:hover { color: #fff !important; opacity: 1; }
        .bw-btn-primary { transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s; }
        .bw-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px -8px rgba(0,0,0,0.35); }
        .bw-btn-outline { transition: all 0.25s ease; }
        .bw-btn-outline:hover { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05); }
        .bw-faq-item { transition: box-shadow 0.3s ease, border-color 0.3s ease; }
        .bw-faq-item:hover { box-shadow: 0 8px 24px -4px rgba(0,0,0,0.08); }
        .bw-footer-link { transition: color 0.2s ease; }
        .bw-footer-link:hover { color: rgba(255,255,255,0.9) !important; }
        .bw-feature-row { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; }
        .bw-feature-row.reverse { direction:rtl; }
        .bw-feature-row.reverse > * { direction:ltr; }
        @media (max-width:768px) {
          .bw-hero-title { font-size:clamp(36px,10vw,56px) !important; }
          .bw-hero-sub { font-size:16px !important; }
          .bw-hero-btns { flex-direction:column !important; align-items:stretch !important; }
          .bw-feature-row { grid-template-columns:1fr !important; gap:48px !important; direction:ltr; }
          .bw-features-grid { grid-template-columns:1fr !important; }
          .bw-pricing-grid { grid-template-columns:1fr !important; }
          .bw-bento { grid-template-columns:1fr !important; }
          .bw-nav-links, .bw-nav-login { display:none !important; }
          .bw-faq-grid { grid-template-columns: 1fr !important; }
        }
        .bw-bento { display:grid; grid-template-columns: repeat(6, 1fr); gap:20px; }
      `}</style>
      <Nav />
      <Hero />
      <TrustBar />
      <ShowcaseSection />
      <FeatureHighlights />
      <NonFictionSection />
      <IntelligenceGrid />
      <Pricing />
      <AICostExamples />
      <FAQ />
      <CTABanner />
      <Footer />
    </main>
  );
}

/* ── Nav: minimal dark ── */
function Nav() {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: C.dark,
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      boxShadow: "0 1px 0 rgba(255,255,255,0.04)",
    }}>
      <div style={{ ...wrap(), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", minHeight: 44, overflow: "visible" }}>
          <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 80, width: "auto", maxWidth: 260, opacity: 0.95, objectFit: "contain" }} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div style={{ display: "flex", gap: 28 }} className="bw-nav-links">
            {[
              { label: "Features", href: "#features" },
              { label: "Non-Fiction", href: "#nonfiction" },
              { label: "Pricing", href: "#pricing" },
              { label: "News", href: "/news" },
              { label: "FAQ", href: "#faq" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="bw-nav-link" style={{ fontSize: 14, fontWeight: 500, color: C.textMuted, textDecoration: "none" }}>{l.label}</a>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }} className="bw-nav-login">
            <Link href="/login" className="bw-nav-link" style={{ fontSize: 14, fontWeight: 500, color: C.textMuted, textDecoration: "none" }}>Log in</Link>
        <Link href="/subscribe" className="bw-btn-primary" style={{
          padding: "11px 24px", fontSize: 14, fontWeight: 600, borderRadius: 12,
          background: C.white, color: C.dark, textDecoration: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
        }}>
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero: full bleed dark, oversized type ── */
function Hero() {
  return (
    <section style={{
      minHeight: "90vh", display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "120px 0 140px",
      background: C.dark,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 120% 100% at 80% 0%, rgba(139,105,20,0.06) 0%, transparent 45%), radial-gradient(ellipse 80% 60% at 10% 90%, rgba(139,105,20,0.04) 0%, transparent 50%)" }} />
      <div style={{ ...wrap(), position: "relative", zIndex: 1 }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: C.warm, marginBottom: 32, opacity: 0.95 }}>
          The novel writing studio
        </p>
        <h1 className="bw-hero-title" style={{
          fontSize: "clamp(56px, 10vw, 120px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.95,
          margin: 0, color: "#fff", maxWidth: 1000, textShadow: "0 2px 40px rgba(0,0,0,0.2)",
        }}>
          Stop writing into the dark.
        </h1>
        <p className="bw-hero-sub" style={{ fontSize: 19, lineHeight: 1.7, color: "rgba(255,255,255,0.72)", maxWidth: 500, margin: "44px 0 56px" }}>
          Map the arc. Lock the canon. Draft scene by scene. The AI knows your story before it writes a word.
        </p>
        <div className="bw-hero-btns" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/subscribe" className="bw-btn-primary" style={{
            display: "inline-flex", alignItems: "center", gap: 10, padding: "18px 36px",
            fontSize: 15, fontWeight: 700, borderRadius: 14,
            background: C.white, color: C.dark, textDecoration: "none", boxShadow: "0 4px 20px -4px rgba(0,0,0,0.3)",
          }}>
            Start Free Trial
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
          <a href="#features" className="bw-btn-outline" style={{
            display: "inline-flex", alignItems: "center", padding: "18px 36px",
            fontSize: 15, fontWeight: 600, borderRadius: 14,
            color: "#fff", textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.2)",
          }}>
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── Trust Strip: dark, minimal ── */
function TrustBar() {
  return (
    <section style={{ background: C.darkSoft, padding: "28px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ ...wrap(), display: "flex", justifyContent: "center", alignItems: "center", gap: 40, flexWrap: "wrap" }}>
        {["7-day free trial • no card", "Your AI key, your control", "We never see your words", "EPUB & DOCX export", "Cancel anytime"].map((t) => (
          <span key={t} style={{ fontSize: 13, fontWeight: 500, color: I.accentMuted }}>{t}</span>
        ))}
      </div>
    </section>
  );
}

/* ── Illustration palette — clean, modern ── */
const I = {
  accent: C.warm,
  warm: C.warm,
  warmSoft: C.warmLight,
  text: "rgba(255,255,255,0.92)",
  dark: "#141414",
  card: "#1a1a1a",
  cardBorder: "rgba(255,255,255,0.06)",
  muted: "rgba(255,255,255,0.5)",
  accentMuted: C.textMuted,
  accentSoft: "rgba(255,255,255,0.75)",
  accentOnLight: C.textOnLight,
  accentOnLightMuted: C.textOnLightMuted,
};

function ArchitectPreview() {
  return (
    <div style={{ maxWidth: 440, width: "100%", padding: "24px 0" }}>
      <div style={{
        background: "linear-gradient(180deg, #ffffff 0%, #fafaf8 100%)",
        borderRadius: 24, padding: 36, border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 24px 48px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32, padding: "12px 0", borderBottom: "2px solid rgba(139,105,20,0.15)" }}>
          {["ACT I", "ACT II", "ACT III"].map((act, i) => (
            <span key={act} style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: i === 1 ? C.warm : C.textOnLightMuted }}>{act}</span>
          ))}
        </div>
        <svg viewBox="0 0 360 80" style={{ width: "100%", height: "auto", marginBottom: 28 }}>
          <defs>
            <linearGradient id="arc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={C.warm} stopOpacity="0.3" />
              <stop offset="50%" stopColor={C.warm} stopOpacity="1" />
              <stop offset="100%" stopColor={C.warm} stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path d="M30 70 C90 70 120 25 180 30 C240 35 270 55 330 30" fill="none" stroke="url(#arc)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {[{ x: 30, y: 70 }, { x: 120, y: 25 }, { x: 180, y: 30 }, { x: 270, y: 55 }, { x: 330, y: 30 }].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="6" fill={C.warm} opacity={i === 2 ? 1 : 0.75} />
          ))}
        </svg>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {["Setup", "Rising", "Midpoint", "Climax", "Resolution"].map((b, i) => (
            <span key={b} style={{ fontSize: 13, fontWeight: 600, color: C.textOnLight, padding: "8px 14px", borderRadius: 10, background: i === 2 ? "rgba(139,105,20,0.1)" : "rgba(0,0,0,0.04)", border: i === 2 ? `1px solid rgba(139,105,20,0.2)` : "1px solid rgba(0,0,0,0.06)" }}>{b}</span>
          ))}
        </div>
        <div style={{ marginTop: 24, padding: 16, borderRadius: 14, background: "rgba(139,105,20,0.06)", fontSize: 12, color: C.textOnLightMuted }}>
          Subplots · Romance · Identity · Ticking clock
        </div>
      </div>
    </div>
  );
}

function CanonPreview() {
  const chars = [
    { name: "Jack", role: "Protagonist", color: C.warm },
    { name: "Clara", role: "Mentor", color: "#7c6b5a" },
    { name: "Tom", role: "Antagonist", color: "#5a4a3a" },
    { name: "Singh", role: "Deuteragonist", color: C.warmLight },
  ];
  return (
    <div style={{ maxWidth: 440, width: "100%", padding: "24px 0" }}>
      <div style={{
        background: "linear-gradient(180deg, #ffffff 0%, #fafaf8 100%)",
        borderRadius: 24, padding: 36, border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 24px 48px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 28 }}>
          {chars.map((c, i) => (
            <div key={c.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${c.color} 0%, ${c.color}dd 100%)`, boxShadow: "0 4px 16px rgba(139,105,20,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>{c.name[0]}</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.textOnLight }}>{c.name}</div>
                <div style={{ fontSize: 11, color: C.textOnLightMuted }}>{c.role}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[{ n: "5", l: "Characters" }, { n: "16", l: "Locations" }, { n: "7", l: "Lore" }].map((s) => (
            <div key={s.l} style={{ padding: 18, borderRadius: 14, background: "rgba(139,105,20,0.06)", border: "1px solid rgba(139,105,20,0.12)", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.warm }}>{s.n}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textOnLightMuted, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Gritty noir", "Close 3rd", "Past tense"].map((t) => (
            <span key={t} style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,0.04)", color: C.textOnLightMuted }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlocsPreview() {
  return (
    <div style={{ maxWidth: 440, width: "100%", padding: "24px 0" }}>
      <div style={{
        background: "linear-gradient(180deg, #ffffff 0%, #fafaf8 100%)",
        borderRadius: 24, padding: 32, border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 24px 48px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: 18, borderRadius: 14, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.textOnLightMuted }}>SCENE 1 — COMPLETE</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.warm }}>1,247 words ✓</span>
            </div>
            <p style={{ fontSize: 14, color: C.textOnLight, lineHeight: 1.6, margin: 0, fontFamily: "Georgia, serif" }}>
              She stepped off the train into salt air and silence.
            </p>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: "rgba(139,105,20,0.08)", border: "1px solid rgba(139,105,20,0.2)", boxShadow: "0 4px 16px rgba(139,105,20,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.warm }}>SCENE 2 — WRITING</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.warm }}>634 / 1,200</span>
            </div>
            <p style={{ fontSize: 14, color: C.textOnLight, lineHeight: 1.6, margin: 0, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
              The door hadn&apos;t been opened in years. She ran her fingers along the frame...
            </p>
            <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.5)", marginTop: 14, overflow: "hidden" }}>
              <div style={{ width: "53%", height: "100%", borderRadius: 3, background: C.warm }} />
            </div>
          </div>
          <div style={{ padding: 18, borderRadius: 14, border: "2px dashed rgba(0,0,0,0.1)", background: "rgba(0,0,0,0.02)" }}>
            <span style={{ fontSize: 11, color: C.textOnLightMuted }}>Scene 3 — Planned</span>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {[70, 50, 85].map((w, i) => <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.06)" }} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NFPreview() {
  const events = [
    { year: "1962", title: "Born in Sheffield", emotion: "Nostalgia" },
    { year: "1985", title: "First day at the newspaper", emotion: "Hope" },
    { year: "1998", title: "The letter arrives", emotion: "Grief" },
    { year: "2012", title: "The book deal", emotion: "Joy" },
  ];
  return (
    <div style={{ maxWidth: 440, width: "100%", padding: "24px 0" }}>
      <div style={{
        background: "linear-gradient(180deg, #ffffff 0%, #fafaf8 100%)",
        borderRadius: 24, padding: 36, border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 24px 48px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
      }}>
        <div style={{ position: "relative", paddingLeft: 48 }}>
          <div style={{ position: "absolute", left: 11, top: 12, bottom: 12, width: 2, background: `linear-gradient(to bottom, ${C.warm} 0%, rgba(139,105,20,0.3) 50%, ${C.warm} 100%)`, borderRadius: 1 }} />
          {events.map((e, i) => (
            <div key={e.year} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ position: "relative", left: -42, width: 14, height: 14, borderRadius: "50%", background: i % 2 === 0 ? C.warm : "rgba(139,105,20,0.5)", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", flexShrink: 0 }} />
              <div style={{ flex: 1, padding: 14, borderRadius: 12, background: i === 2 ? "rgba(139,105,20,0.08)" : "rgba(0,0,0,0.03)", border: `1px solid ${i === 2 ? "rgba(139,105,20,0.15)" : "rgba(0,0,0,0.06)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.warm }}>{e.year}</span>
                  <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 6, background: "rgba(0,0,0,0.05)", color: C.textOnLightMuted }}>{e.emotion}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.textOnLight }}>{e.title}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, padding: 20, borderRadius: 14, background: "rgba(139,105,20,0.08)", border: "1px solid rgba(139,105,20,0.15)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: C.warm, marginBottom: 8 }}>LIFE INTERVIEW</div>
          <p style={{ fontSize: 13, color: C.textOnLightMuted, lineHeight: 1.6, margin: 0 }}>&ldquo;What did your grandmother teach you without meaning to?&rdquo;</p>
        </div>
      </div>
    </div>
  );
}


function ShowcaseSection() {
  const SHOWCASES: { pre: string; title: string; desc: string; details: string[]; color: string; preview: React.ReactNode }[] = [
    {
      pre: "The Architect",
      title: "Your story mapped before you type a word.",
      desc: "Pick an arc \u2014 Hero\u2019s Journey, Three-Act, Save the Cat \u2014 and watch the AI build beats, subplots, and character arcs across every act. Every chapter knows its place. No more wandering.",
      details: ["Beats, subplots & arcs in one view", "Auto-links to your chapter plan", "Genre-aware from day one", "Emotional layering built in"],
      color: I.accent,
      preview: <ArchitectPreview />,
    },
    {
      pre: "The Canon",
      title: "The AI has read your world before it writes.",
      desc: "Characters with backstories and voice. Locations with texture. Lore with rules. Every generation pulls from your Canon first \u2014 so it never forgets who’s who, where they are, or what’s true.",
      details: ["Characters, locations, lore in one place", "Voice rules the AI respects", "Secrets and backstories locked in", "Synopsis generation from your canon"],
      color: I.warm,
      preview: <CanonPreview />,
    },
    {
      pre: "Scene blocs",
      title: "Blueprint first. Prose second.",
      desc: "Each scene gets a synopsis, word target, emotional arc, sensory palette, and tension level. The AI follows your blueprint \u2014 no guessing, no drift. Prose that sounds like you wrote it.",
      details: ["One blueprint per scene", "Tension & arc tracking", "Anti-AI prose rules baked in", "Human-sounding output"],
      color: I.accent,
      preview: <BlocsPreview />,
    },
  ];

  return (
    <section id="features" style={{ padding: "140px 0 120px", background: C.light }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 110 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textOnLightMuted, marginBottom: 18 }}>
            How it works
          </p>
          <h2 className="bw-section-title" style={{ fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 20px", color: I.accentOnLight, lineHeight: 1.05 }}>
            Structure. Then flow.
          </h2>
          <p style={{ fontSize: 18, color: I.accentOnLightMuted, maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            Canon → Plan → Blocs → Prose. Each layer feeds the next.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 140 }}>
          {SHOWCASES.map((s, i) => (
            <div key={s.pre} className={`bw-feature-row${i % 2 === 1 ? " reverse" : ""}`}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.warm }}>{s.pre}</span>
                <h3 style={{ fontSize: "clamp(28px, 3.2vw, 40px)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.1, margin: "18px 0 20px", color: I.accentOnLight }}>{s.title}</h3>
                <p style={{ fontSize: 17, lineHeight: 1.7, color: I.accentOnLightMuted, margin: "0 0 28px" }}>{s.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {s.details.map((dd) => (
                    <div key={dd} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.warm} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      <span style={{ fontSize: 15, fontWeight: 500, color: I.accentOnLightMuted }}>{dd}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>{s.preview}</div>
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
    { title: "Continuity Engine", desc: "Canon drift. Timeline errors. Voice slip. Spatial logic. One click, catches what you\u2019d miss on the 47th read-through.", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: I.accent },
    { title: "Manuscript Health Score", desc: "Pacing, dialogue, clarity, engagement \u2014 each scored out of 10. Per-chapter breakdowns. Specific tips. Know when you\u2019re ready to ship.", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", color: I.warm },
    { title: "Chat with Your Characters", desc: "Talk to any character. They answer in voice, from backstory and secrets. Story Insights suggests profile tweaks. Weird and brilliant.", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: I.warmSoft },
    { title: "AI Co-Author", desc: "It\u2019s read every chapter. Ask about plot holes, test dialogue, get pacing feedback. Answers are about your story, not generic advice.", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", color: I.accent },
    { title: "Bolt-Ons & Writing Packs", desc: "\u2018Keep it gritty.\u2019 \u2018More dialogue.\u2019 \u2018Yorkshire dialect.\u2019 Stack directives per chapter or scene. Genre kits included.", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", color: I.accent },
    { title: "Beta Reader Sharing", desc: "Send a link. They highlight and annotate. You review with AI-assisted accept or reject. Clean, branded, done.", icon: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3", color: I.accent },
  ];
  return (
    <section style={{ padding: "120px 0 140px", background: C.darkSoft }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textMuted, marginBottom: 18 }}>Built-in smarts</p>
          <h2 className="bw-section-title" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 800, letterSpacing: "-0.04em", margin: 0, color: "#fff", lineHeight: 1.1 }}>
            The tools that catch what you miss.
          </h2>
        </div>
        <div className="bw-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {features.map((f) => (
            <div key={f.title}             className="bw-card-hover" style={{
              padding: 44, borderRadius: 24, border: "1px solid rgba(255,255,255,0.06)", background: C.darkCard,
              boxShadow: "0 8px 32px -8px rgba(0,0,0,0.35)",
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${f.color}0a`, border: `1px solid ${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon}/></svg>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 24, marginBottom: 10, color: "#fff" }}>{f.title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: I.accentMuted, margin: 0 }}>{f.desc}</p>
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
    { title: "Two dedicated paths", desc: "Biography & memoir, or other non-fiction. Pick once. Every tool and prompt adapts. No fiction clutter.", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
    { title: "Guided Life Interview", desc: "The AI walks you through your story. Big-picture → deep-dive → connections. Answers flow into Canon.", icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" },
    { title: "Emotional Timeline", desc: "Map events with dates, people, places, emotional weight. AI spots gaps. Paces around the moments that matter.", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { title: "Researcher & Source Tracking", desc: "Paste research. Chat through it. AI builds structured notes with source ratings. Feeds your chapter plan.", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
  ];
  return (
    <section id="nonfiction" style={{ padding: "100px 0", background: C.light }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textOnLightMuted, marginBottom: 20 }}>Non-Fiction &amp; Biography</p>
          <h2 className="bw-section-title" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 800, letterSpacing: "-0.04em", color: I.accentOnLight, margin: "16px 0 16px", lineHeight: 1.1 }}>
            Real stories. Real structure.
          </h2>
          <p style={{ fontSize: 17, color: I.accentOnLightMuted, maxWidth: 600, margin: "0 auto", lineHeight: 1.65 }}>
            Biography, memoir, or other non-fiction. Each path gets its own Canon, prompts, and research flow. No fiction clutter.
          </p>
        </div>

        <div className="bw-feature-row" style={{ marginBottom: 64 }}>
          <div>
            <NFPreview />
          </div>
          <div>
            <div className="bw-nf-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
              {features.map((f) => (
                <div key={f.title} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(139,105,20,0.08)", border: "1px solid rgba(139,105,20,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.warm} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon}/></svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 700, color: I.accentOnLight, margin: "0 0 6px" }}>{f.title}</h4>
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: I.accentOnLightMuted, margin: 0 }}>{f.desc}</p>
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
    { title: "Smart Rewrite", desc: "Six ways in one click: emotional, suspenseful, tighter, bestseller, polish. Pick the one that lands." },
    { title: "Chapter Depth Tools", desc: "Deeper emotion. Stronger transitions. Sharper nuance. Core plot stays intact." },
    { title: "Story Doctor", desc: "Spots pacing drops, missing tension, character gaps. Suggests one-click fixes." },
    { title: "Full Formatting Toolbar", desc: "Bold, italic, headings, breaks. Everything carries through to export." },
    { title: "Anti-AI Prose Rules", desc: "No fluorescent. No ethereal. No em-dash walls. Built-in rules that keep it human." },
    { title: "Publish-Ready Export", desc: "One click → EPUB or DOCX. Clean. No AI notes. Ready for agents or self-pub." },
  ];
  return (
    <section style={{ padding: "100px 0 120px", background: C.lightAlt }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 className="bw-section-title" style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-0.04em", margin: 0, color: I.accentOnLight, lineHeight: 1.15 }}>Plus the extras that matter.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="bw-features-grid">
          {items.map((f) => (
            <div key={f.title} style={{ padding: "32px 36px", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)", background: C.light, boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px", color: I.accentOnLight }}>{f.title}</h4>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: I.accentOnLightMuted, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ── */
function Pricing() {
  const shared = [
    "Full studio access",
    "Unlimited novels & chapters",
    "The Architect, Canon, Plan & Blocs",
    "The Editor & AI Co-Author",
    "Bolt-Ons & Writing Packs",
    "Non-Fiction & Biography tools",
    "Beta reader sharing & export",
    "You bring your own AI key",
  ];
  return (
    <section id="pricing" style={{ padding: "120px 0", background: C.dark }}>
      <div style={wrap({ textAlign: "center" })}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 18 }}>Pricing</p>
        <h2 className="bw-display bw-section-title" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 16px", color: "#fff", lineHeight: 1.1 }}>
          One studio. You bring the AI.
        </h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", maxWidth: 540, margin: "0 auto", marginBottom: 8, lineHeight: 1.6 }}>
          Your subscription covers the full workspace. AI runs on your own API key — you pick the model, you control the cost. No hidden fees.
        </p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginBottom: 56 }}>7-day free trial. Cancel anytime.</p>

        <div className="bw-pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, maxWidth: 740, margin: "0 auto", alignItems: "stretch" }}>
          <PriceCard name="Monthly" price="£12.99" period="month" badge={null} features={[...shared, "Cancel anytime"]} />
          <PriceCard name="Annual" price="£99" period="year" badge="Save 36%" highlighted features={[...shared, "Priority for new features"]} />
        </div>

        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", maxWidth: 540, margin: "40px auto 0", lineHeight: 1.6 }}>
          Blocwrite never charges for AI. Connect your key from OpenRouter (free models available). Don&apos;t want AI? Toggle it off — every feature still works.
        </p>
      </div>
    </section>
  );
}

function AICostExamples() {
  const rows = [
    { words: "60,000", gpt: "$5.97", claude: "$2.94", grok: "$0.52", gemini: "$0.11" },
    { words: "70,000", gpt: "$6.96", claude: "$3.43", grok: "$0.61", gemini: "$0.12" },
    { words: "80,000", gpt: "$7.94", claude: "$3.93", grok: "$0.69", gemini: "$0.14" },
    { words: "90,000", gpt: "$8.94", claude: "$4.41", grok: "$0.78", gemini: "$0.16" },
    { words: "100,000", gpt: "$9.93", claude: "$4.90", grok: "$0.87", gemini: "$0.18" },
  ];

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 760,
  };
  const thStyle: React.CSSProperties = {
    textAlign: "left",
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: C.warm,
    padding: "16px 20px",
    borderBottom: `1px solid rgba(139,105,20,0.25)`,
    background: "rgba(139,105,20,0.06)",
  };
  const tdStyle: React.CSSProperties = {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    padding: "16px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  };

  return (
    <section style={{ padding: "0 0 100px", background: C.bgAlt }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.warm, marginBottom: 14 }}>
            AI COST EXAMPLES
          </p>
          <h2 className="bw-section-title" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px", color: C.text }}>
            Estimated AI spend per full novel
          </h2>
          <p style={{ fontSize: 15, color: C.textMuted, maxWidth: 760, margin: "0 auto", lineHeight: 1.6 }}>
            These are example totals for the full workflow (The Architect, Canon, Plan, Blocs, Prose, and Editor). Estimates are based on recent OpenRouter model pricing and vary with rewrite volume.
          </p>
        </div>

        <div className="bw-ai-cost-table-wrap" style={{ borderRadius: 20, overflow: "hidden", background: "rgba(26,26,26,0.6)", border: "1px solid rgba(139,105,20,0.15)", boxShadow: "0 16px 48px -16px rgba(0,0,0,0.4)" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Novel Words</th>
                <th style={thStyle}>GPT 5.2</th>
                <th style={thStyle}>Claude Haiku 4.6</th>
                <th style={thStyle}>Grok</th>
                <th style={thStyle}>Gemini 3 12B</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`full-${r.words}`}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: "#fff" }}>{r.words}</td>
                  <td style={tdStyle}>{r.gpt}</td>
                  <td style={tdStyle}>{r.claude}</td>
                  <td style={tdStyle}>{r.grok}</td>
                  <td style={tdStyle}>{r.gemini}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 12, color: C.textMuted, marginTop: 12, lineHeight: 1.6 }}>
          Pricing basis used: GPT 5.2 ($1.75/M input, $14/M output), Claude Haiku 4.6 ($1/M input, $5/M output), Grok ($0.20/M input, $0.50/M output), Gemini 3 12B ($0.04/M input, $0.13/M output).
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
      padding: "44px 40px", borderRadius: 24, textAlign: "left", position: "relative",
      display: "flex", flexDirection: "column",
      border: highlighted ? `1px solid rgba(255,255,255,0.12)` : "1px solid rgba(255,255,255,0.06)",
      background: highlighted ? C.darkCard : C.darkSoft,
      boxShadow: highlighted ? "0 16px 48px -12px rgba(0,0,0,0.45)" : "0 8px 32px -8px rgba(0,0,0,0.35)",
    }}>
      {badge && (
        <span style={{
          position: "absolute", top: 20, right: 20, padding: "6px 16px", fontSize: 11, fontWeight: 700, borderRadius: 10,
          background: C.white, color: C.dark,
        }}>{badge}</span>
      )}
      <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 12 }}>{name}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.04em", color: "#fff" }}>{price}</span>
        <span style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>/ {period}</span>
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 32 }}>7-day free trial</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(255,255,255,0.85)", padding: "7px 0" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.warm} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
            {f}
          </li>
        ))}
      </ul>
      <Link href="/subscribe" className="bw-btn-primary" style={{
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 0", width: "100%",
        fontSize: 15, fontWeight: 700, borderRadius: 14, textDecoration: "none", marginTop: 32,
        background: highlighted ? C.white : "transparent",
        color: highlighted ? C.dark : "#fff",
        border: highlighted ? "none" : "1.5px solid rgba(255,255,255,0.3)",
        boxShadow: "none",
      }}>
        Start Free Trial
      </Link>
    </div>
  );
}

/* ── FAQ ── */
const FAQ_ITEMS = [
  { q: "What is Blocwrite?", a: "A full novel-writing studio. You get The Architect for plot planning, a living Canon that the AI actually reads, scene-by-scene drafting with detailed blueprints, continuity checking, manuscript health scoring, character chat, an AI co-author, smart rewrite, bolt-ons, writing packs, beta reader sharing, and publish-ready EPUB/DOCX export. Fiction and non-fiction." },
  { q: "Wait \u2014 AI isn\u2019t included in the price?", a: "Correct. Blocwrite is the workspace; AI runs on your own API key. That means you choose the model and control the cost. Connect via OpenRouter (which offers free models). We will never charge you for AI usage." },
  { q: "What if I don\u2019t want to use AI at all?", a: "Toggle it off. Every feature \u2014 planning, writing, formatting, exporting \u2014 works without AI. You also get a writing session tracker, focus mode, and chapter word counts when AI is off." },
  { q: "What is The Architect?", a: "Your story\u2019s structural backbone. Pick a narrative arc (Hero\u2019s Journey, Three-Act, Save the Cat, and more), and the AI generates story beats across all three acts, weaves in subplots, and maps character arcs. Every element auto-links to your chapter plan so each chapter knows exactly where it sits in the bigger picture." },
  { q: "How does The Editor work?", a: "One button, two modes. Inside a chapter: continuity checks against your Canon, a grammar pass, and a prose polish. On the overview page: full-manuscript sentence-level rewrites with inline diffs you can accept or reject." },
  { q: "Can I write non-fiction?", a: "Absolutely. When you create a non-fiction book, you pick a path \u2014 Biography & Memoir or Other Non-Fiction. Each path gets its own tailored Canon sections, AI prompts, and research tools. Biographies get a guided Life Interview and emotional timeline. Other non-fiction gets a Researcher chat and source-tracked notes." },
  { q: "What are Bolt-Ons?", a: "Plain-English directives you attach per-chapter or per-scene. \u2018Keep it gritty.\u2019 \u2018More dialogue.\u2019 \u2018Yorkshire dialect.\u2019 Stack as many as you like. Genre craft kits (Romance, Thriller, Horror, Fantasy) are included." },
  { q: "How does the free trial work?", a: "7 days. Full access to every feature. No credit card required upfront. If you don\u2019t cancel, your chosen plan begins automatically. Cancel anytime from your account." },
  { q: "Is my writing private?", a: "Yes. Your novels are stored in isolated storage. We never train on your data, read your content, or share it. API keys stay in your browser and are never sent to our servers." },
  { q: "Does the AI write like AI?", a: "We\u2019ve gone further than anyone to prevent it. Anti-AI prose rules are baked into every generation: banned words (fluorescent, ethereal, visceral, tapestry...), strict em-dash limits, enforced sentence-length variety, and show-don\u2019t-tell guidelines. The prose reads like a human wrote it." },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section id="faq" style={{ padding: "120px 0 140px", background: C.light }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.textOnLightMuted, marginBottom: 18 }}>FAQ</p>
          <h2 className="bw-section-title" style={{ fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 800, letterSpacing: "-0.04em", margin: 0, color: C.textOnLight, lineHeight: 1.15 }}>Straight answers.</h2>
        </div>
        <div className="bw-faq-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24, maxWidth: 960, margin: "0 auto", alignItems: "start" }}>
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem
              key={item.q}
              q={item.q}
              a={item.a}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="bw-faq-item" style={{
      padding: 28, borderRadius: 20, background: C.white, border: `1px solid ${C.borderLight}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    }}>
      <button type="button" onClick={onToggle} style={{
        width: "100%", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
        background: "none", border: "none", cursor: "pointer", padding: 0,
        textAlign: "left", fontSize: 15, fontWeight: 600, color: "#0a0a0a", fontFamily: "inherit", lineHeight: 1.45,
      }}>
        <span style={{ flex: 1 }}>{q}</span>
        <span style={{ fontSize: 18, color: "#737373", transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)", transform: open ? "rotate(45deg)" : "none", flexShrink: 0 }}>+</span>
      </button>
      {open && <p style={{ fontSize: 14, lineHeight: 1.75, color: "#404040", marginTop: 14, marginBottom: 0 }}>{a}</p>}
    </div>
  );
}

/* ── CTA Banner ── */
function CTABanner() {
  return (
    <section style={{ padding: "140px 0", background: `linear-gradient(180deg, ${C.darkSoft} 0%, #121212 100%)` }}>
      <div style={{ ...wrap(), textAlign: "center" }}>
        <h2 className="bw-section-title" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#fff", margin: "0 0 28px", lineHeight: 1.1 }}>
          Ready to write the book?
        </h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", maxWidth: 540, margin: "0 auto 48px", lineHeight: 1.6 }}>
          Structure. Canon. Blueprints. Continuity checks. Prose that sounds like you. One-click export. Try it free for 7 days.
        </p>
        <Link href="/subscribe" className="bw-btn-primary" style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 36px",
          fontSize: 15, fontWeight: 600, background: C.white, color: C.dark, textDecoration: "none",
          boxShadow: "0 4px 24px -4px rgba(0,0,0,0.35)", borderRadius: 14,
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
    <footer style={{ padding: "64px 0 48px", background: "#000000" }}>
      <div className="bw-footer-inner" style={{ ...wrap(), display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 56, width: "auto", maxWidth: 220, opacity: 0.6, objectFit: "contain", filter: "contrast(1.15) drop-shadow(0 0 0.5px rgba(255,255,255,0.5))", background: "transparent", display: "block" }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>© 2026 Blocwrite. All rights reserved.</span>
        </div>
        <div className="bw-footer-links" style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {[
            { label: "News", href: "/news" },
            { label: "Terms", href: "/terms" },
            { label: "Refund Policy", href: "/refunds" },
            { label: "Contact", href: "/contact" },
            { label: "Log in", href: "/login" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="bw-footer-link" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
