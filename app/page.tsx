"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#ffffff",
  bgSoft: "#f9fafb",
  bgDark: "#0b0b0f",
  bgDarkSoft: "#141418",
  text: "#0f0f12",
  textSoft: "#4b4d56",
  textMuted: "#8a8d96",
  border: "#e6e8ec",
  borderSoft: "#f0f1f4",
  card: "#ffffff",
  accent: "#c8e630",
  accentText: "#4d6a00",
  accentSoft: "#eaf5a8",
  btnBg: "#0f0f12",
  btnText: "#ffffff",
  btnOutline: "#0f0f12",
  gradientStart: "#c8e630",
  gradientEnd: "#a3c420",
};

const MAX_W = 1200;
const wrap = (extra?: React.CSSProperties): React.CSSProperties => ({
  maxWidth: MAX_W,
  margin: "0 auto",
  padding: "0 32px",
  ...extra,
});

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "16px 40px",
  fontSize: 15,
  fontWeight: 600,
  color: C.btnText,
  background: C.btnBg,
  border: "none",
  borderRadius: 14,
  cursor: "pointer",
  textDecoration: "none",
  transition: "transform 0.2s, box-shadow 0.2s",
  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
};

const btnOutline: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "16px 40px",
  fontSize: 15,
  fontWeight: 600,
  color: C.btnOutline,
  background: "transparent",
  border: `1.5px solid ${C.border}`,
  borderRadius: 14,
  cursor: "pointer",
  textDecoration: "none",
  transition: "all 0.2s",
};

export default function LandingPage() {
  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .bw-fade-up { animation: fadeUp 0.7s ease-out both; }
        .bw-float { animation: float 6s ease-in-out infinite; }
        .bw-hero-img { transition: transform 0.4s ease, box-shadow 0.4s ease; }
        .bw-hero-img:hover { transform: scale(1.02) translateY(-4px); box-shadow: 0 40px 100px rgba(0,0,0,0.18) !important; }
        .bw-card-hover { transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s; }
        .bw-card-hover:hover { transform: translateY(-6px); box-shadow: 0 20px 60px rgba(0,0,0,0.08) !important; }
        .bw-stage-img-wrap { transition: transform 0.35s ease, box-shadow 0.35s ease; }
        .bw-stage-img-wrap:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 24px 80px rgba(0,0,0,0.12) !important; }
        .bw-btn-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important; }
        .bw-glow { box-shadow: 0 0 80px rgba(200,230,48,0.15), 0 0 160px rgba(200,230,48,0.08); }
        @media (max-width: 768px) {
          .bw-nav-links { display: none !important; }
          .bw-nav-actions { gap: 8px !important; }
          .bw-nav-actions .bw-nav-login { display: none !important; }
          .bw-nav-cta { padding: 10px 20px !important; font-size: 13px !important; }
          .bw-hero-wrap { padding: 64px 20px 48px !important; }
          .bw-hero-title { font-size: 32px !important; }
          .bw-hero-sub { font-size: 15px !important; }
          .bw-hero-btns { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .bw-hero-btns a { text-align: center; justify-content: center; padding: 14px 24px !important; }
          .bw-hero-pills { gap: 6px !important; }
          .bw-hero-pills span { font-size: 10px !important; padding: 5px 12px !important; }
          .bw-hero-mockup { margin: 32px 16px 0 !important; }
          .bw-trust-grid { grid-template-columns: 1fr 1fr !important; gap: 20px !important; }
          .bw-section-title { font-size: 28px !important; }
          .bw-section-sub { font-size: 15px !important; }
          .bw-stages-grid { gap: 48px !important; }
          .bw-stage-row { grid-template-columns: 1fr !important; gap: 24px !important; }
          .bw-stage-text { order: 1 !important; }
          .bw-stage-img { order: 2 !important; }
          .bw-stage-subtitle { font-size: 22px !important; }
          .bw-features-grid { grid-template-columns: 1fr !important; }
          .bw-advanced-grid { grid-template-columns: 1fr !important; }
          .bw-pricing-grid { grid-template-columns: 1fr !important; max-width: 400px !important; }
          .bw-nf-grid { grid-template-columns: 1fr !important; }
          .bw-cta-title { font-size: 28px !important; }
          .bw-footer-inner { flex-direction: column !important; text-align: center; gap: 16px !important; }
          .bw-footer-links { justify-content: center !important; }
          .bw-section-pad { padding: 56px 0 !important; }
          .bw-ai-banner-card { grid-template-columns: 1fr !important; text-align: center; padding: 24px 20px !important; }
        }
        @media (max-width: 480px) {
          .bw-trust-grid { grid-template-columns: 1fr !important; }
          .bw-hero-title { font-size: 26px !important; }
          .bw-hero-pills span { font-size: 9px !important; padding: 4px 10px !important; }
        }
      `}</style>
      <Nav />
      <Hero />
      <TrustBar />
      <AiBanner />
      <HowItWorks />
      <NonFictionHighlight />
      <FeatureGrid />
      <AdvancedFeatures />
      <Pricing />
      <FAQ />
      <CTABanner />
      <Footer />
    </main>
  );
}

/* ── Nav ─────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: scrolled ? "rgba(11,11,15,0.97)" : "rgba(11,11,15,0.92)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
      transition: "all 0.3s",
    }}>
      <div style={{ ...wrap(), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 36, width: "auto", display: "block" }} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }} className="bw-nav-actions">
          <div style={{ display: "flex", gap: 32 }} className="bw-nav-links">
            {[
              { label: "How it works", href: "#how-it-works" },
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "News", href: "/news" },
              { label: "FAQ", href: "#faq" },
            ].map((l) => (
              <a key={l.href} href={l.href} style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
              >{l.label}</a>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/login" className="bw-nav-login" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>Log in</Link>
            <Link href="/subscribe" className="bw-nav-cta bw-btn-hover" style={{
              ...btnPrimary, padding: "10px 24px", fontSize: 13, borderRadius: 12,
              background: C.accent, color: C.bgDark, boxShadow: "0 2px 12px rgba(200,230,48,0.25)",
            }}>
              Start Free Trial <ArrowIcon color={C.bgDark} />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero ─────────────────────────────────────────────── */
function Hero() {
  return (
    <section style={{ padding: 0, background: `linear-gradient(180deg, ${C.bgDark} 0%, #111116 55%, #18181e 80%, ${C.bgDark} 100%)`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-30%", left: "50%", transform: "translateX(-50%)", width: "160%", height: "100%", background: "radial-gradient(ellipse at center, rgba(200,230,48,0.06) 0%, transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "10%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,230,48,0.04) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(60px)" }} />

      <div className="bw-hero-wrap" style={{ ...wrap(), textAlign: "center", padding: "100px 32px 0", position: "relative", zIndex: 1 }}>
        <div className="bw-fade-up">
          <span style={{
            display: "inline-block", padding: "6px 16px", fontSize: 12, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: C.accent, background: "rgba(200,230,48,0.1)", borderRadius: 20,
            border: "1px solid rgba(200,230,48,0.2)", marginBottom: 28,
          }}>
            The AI Writing Studio for Novelists
          </span>
        </div>

        <h1 className="bw-hero-title bw-fade-up" style={{
          fontSize: "clamp(38px, 5.5vw, 68px)", fontWeight: 800, letterSpacing: "-0.045em",
          lineHeight: 1.06, margin: "0 auto", maxWidth: 900, color: "#ffffff",
          animationDelay: "0.1s",
        }}>
          Write smarter.<br />
          <span style={{ background: "linear-gradient(135deg, #c8e630 0%, #e6ff4b 50%, #c8e630 100%)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Finish faster.
          </span>
        </h1>

        <p className="bw-hero-sub bw-fade-up" style={{
          fontSize: 19, lineHeight: 1.7, color: "rgba(255,255,255,0.45)",
          maxWidth: 640, margin: "32px auto 0", animationDelay: "0.2s",
        }}>
          Plan, draft, edit, and export your novel in one workspace. Fiction or non-fiction.
          The AI reads your Canon before writing a single word. 11 continuity checks catch mistakes.
          No other writing tool comes close.
        </p>

        <div className="bw-hero-btns bw-fade-up" style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 44, flexWrap: "wrap", animationDelay: "0.3s" }}>
          <Link href="/subscribe" className="bw-btn-hover" style={{
            ...btnPrimary, background: C.accent, color: C.bgDark,
            boxShadow: "0 4px 32px rgba(200,230,48,0.3)", borderRadius: 14,
          }}>
            Start 7-Day Free Trial <ArrowIcon color={C.bgDark} />
          </Link>
          <a href="#how-it-works" className="bw-btn-hover" style={{ ...btnOutline, color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.12)" }}>
            See how it works
          </a>
        </div>

        <div className="bw-hero-pills bw-fade-up" style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 36, flexWrap: "wrap", animationDelay: "0.4s" }}>
          {["Canon-aware AI", "11-point continuity", "Fiction & Non-Fiction", "Character chat", "AI Co-Author", "Writing Packs", "Beta reader sharing", "EPUB & DOCX export", "Bring your own AI key"].map((t) => (
            <span key={t} style={{
              display: "inline-block", padding: "7px 16px", fontSize: 12, fontWeight: 600,
              color: C.accent, background: "rgba(200,230,48,0.07)", borderRadius: 20,
              border: "1px solid rgba(200,230,48,0.15)",
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Hero screenshot */}
      <div className="bw-hero-mockup bw-fade-up" style={{ maxWidth: 1100, margin: "56px auto 0", padding: "0 32px", position: "relative", zIndex: 1, animationDelay: "0.5s" }}>
        <div className="bw-hero-img bw-glow" style={{
          borderRadius: 16, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
        }}>
          <img src="/screenshots/hero-mockup.png" alt="Blocwrite writing studio" style={{ width: "100%", height: "auto", display: "block" }} />
        </div>
        {/* Fade to white at bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 32, right: 32, height: 120, background: `linear-gradient(transparent, ${C.bgDark})`, pointerEvents: "none", borderRadius: "0 0 16px 16px" }} />
      </div>
    </section>
  );
}

/* ── Trust bar ────────────────────────────────────────── */
function TrustBar() {
  const items = [
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accentText} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, headline: "7-day free trial", sub: "Full studio access — every feature unlocked" },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accentText} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>, headline: "You own your AI key", sub: "OpenRouter, Hugging Face, Infermatic, or LM Studio" },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accentText} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, headline: "Your work stays yours", sub: "Private projects. No training on your data." },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accentText} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>, headline: "Publish-ready export", sub: "EPUB & DOCX — clean prose, zero AI metadata" },
  ];
  return (
    <div style={{ background: C.bg, padding: "40px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
      <div className="bw-trust-grid" style={{ ...wrap(), display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
        {items.map((s) => (
          <div key={s.headline} style={{ textAlign: "center", padding: "0 8px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>{s.icon}</div>
            <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: C.text }}>{s.headline}</p>
            <p style={{ fontSize: 13, color: C.textMuted, margin: "6px 0 0", lineHeight: 1.5 }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── AI Banner ────────────────────────────────────────── */
function AiBanner() {
  return (
    <section style={{ padding: 0, background: C.bg }}>
      <div style={{ ...wrap(), maxWidth: 960, padding: "48px 32px" }}>
        <div className="bw-ai-banner-card" style={{
          padding: "28px 36px", borderRadius: 20,
          background: "linear-gradient(135deg, #14141a 0%, #1e1e26 100%)",
          border: "1px solid rgba(200,230,48,0.12)",
          display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center",
          boxShadow: "0 12px 48px rgba(0,0,0,0.12)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "rgba(200,230,48,0.08)", border: "1px solid rgba(200,230,48,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Bring Your Own AI Key — we never charge for AI</p>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.45)", margin: 0 }}>
              Connect your API key from <strong style={{ color: "rgba(255,255,255,0.75)" }}>OpenRouter</strong> (free models available),{" "}
              <strong style={{ color: "rgba(255,255,255,0.75)" }}>Hugging Face</strong>,{" "}
              <strong style={{ color: "rgba(255,255,255,0.75)" }}>Infermatic</strong>, or{" "}
              <strong style={{ color: "rgba(255,255,255,0.75)" }}>LM Studio</strong> (local, 100% free).
              You choose your model, you control your costs. Don&apos;t want AI? Toggle it off — every feature works without it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ─────────────────────────────────────── */
const STAGES = [
  {
    step: "01", title: "Novel Dashboard", subtitle: "Every story. One workspace.",
    desc: "Cover art, word count, chapter progress, reading time — see it all at a glance. Create a new novel in one click. Everything autosaves. Dark and light themes built in.",
    details: ["Live stats per novel", "Cover image upload", "Word goal tracking", "Autosave everywhere"],
    color: "#6366f1", screenshot: "/screenshots/studio.png",
  },
  {
    step: "02", title: "The Canon", subtitle: "Your story\u2019s single source of truth.",
    desc: "Characters with personality and speech patterns, locations with sensory detail, lore and world rules, voice settings and synopsis tools. Define your world — every AI generation reads it first.",
    details: ["Deep character profiles", "Locations with atmosphere", "Lore, timelines, and rules", "AI-powered synopsis tools"],
    color: "#f59e0b", screenshot: "/screenshots/canon.png",
  },
  {
    step: "03", title: "Bolt-Ons & Writing Packs", subtitle: "Tell the AI how to write.",
    desc: "Bolt-ons are plain-English directives — \u2018keep it gritty\u2019, \u2018more dialogue\u2019, \u2018Yorkshire dialect\u2019. Browse genre-specific Writing Packs and install craft kits in one click.",
    details: ["Voice, pacing, emotion, plot", "Per-chapter or per-bloc control", "Genre-specific writing packs", "Build your own or use pre-made"],
    color: "#10b981", screenshot: "/screenshots/boltons.png",
  },
  {
    step: "04", title: "Chapter Planning", subtitle: "Structured outline in seconds.",
    desc: "Generate a full chapter plan from your synopsis and Canon. Each chapter gets a title, detailed synopsis, named characters, and locations. Arc Intelligence scores your story structure and suggests narrative directions.",
    details: ["AI chapter generation", "Arc Intelligence with scoring", "Character and location linking", "Sync to manuscript in one click"],
    color: "#8b5cf6", screenshot: "/screenshots/plan.png",
  },
  {
    step: "05", title: "Novel Overview", subtitle: "The big picture at a glance.",
    desc: "Cover, synopsis, Canon summary, word count dashboard, chapter list, manuscript health, and export — all in one view. The command centre for your novel.",
    details: ["Canon stats at a glance", "Word goal progress bar", "Manuscript health score", "One-click export"],
    color: "#0ea5e9", screenshot: "/screenshots/overview.png",
  },
  {
    step: "06", title: "Bloc-Based Drafting", subtitle: "Small scenes. Zero drift.",
    desc: "Each chapter splits into focused scene blocs with their own synopsis and word target. The AI gets tight context — Canon, bolt-ons, adjacent scenes — so prose stays coherent. Full formatting toolbar built in.",
    details: ["Scene-level synopses", "Flexible word targets", "Bolt-on control per bloc", "Bold, italic, alignment, headings"],
    color: "#ec4899", screenshot: "/screenshots/blocs.png",
  },
  {
    step: "07", title: "The Editor \u2014 Chapter", subtitle: "11 continuity checks. Before and after.",
    desc: "Run Canon Traits, Character Presence, Timeline, Emotional Arc, Voice Drift, Spatial Logic, and more. Grammar & Style pass. Final Polish. Accept or dismiss individually — nothing changes without your approval.",
    details: ["Instant + AI-powered checks", "Grammar & Style pass", "Final Polish pass", "Accept, dismiss, or accept all"],
    color: "#a3e635", screenshot: "/screenshots/editor.png",
  },
  {
    step: "08", title: "The Editor \u2014 Manuscript", subtitle: "Intelligence across your entire novel.",
    desc: "Arc Intelligence analyses your story structure and generates scored arc directions. Compare them side by side, pick the best fit. Full-manuscript editing scans every chapter for sentence-level improvements.",
    details: ["Full-manuscript scan", "Arc Intelligence with scores", "Current vs. suggested diff", "One-click apply"],
    color: "#8b5cf6", screenshot: "/screenshots/editor-manuscript.png",
  },
  {
    step: "09", title: "Manuscript Health", subtitle: "Know if your novel is ready.",
    desc: "AI scores your manuscript on pacing, dialogue, clarity, and engagement. Get per-chapter breakdowns with specific tips. Track your word goal and see exactly where your writing is strong.",
    details: ["Overall score out of 10", "Per-chapter breakdown", "Word goal progress", "Actionable tips"],
    color: "#f59e0b", screenshot: "/screenshots/health.png",
  },
  {
    step: "10", title: "Share for Feedback", subtitle: "Beta readers. Built in.",
    desc: "Generate a time-limited link and send it to anyone. Readers see your manuscript in a clean branded view, highlight text, and leave annotations — comments, suggestions, or issues. Review feedback with AI-assisted changes.",
    details: ["Branded reader experience", "Highlight-to-annotate", "AI-assisted feedback review", "Expiry and password control"],
    color: "#64748b", screenshot: "/screenshots/reader.png",
  },
  {
    step: "11", title: "Chat with Characters & Co-Author", subtitle: "Interview your characters. Brainstorm with a partner who knows your whole novel.",
    desc: "Open a live AI chat with any character — they answer in voice, drawing on their Canon backstory, goals, and personality. Switch to Co-Author mode for a collaborator who\u2019s read every chapter.",
    details: ["In-character responses from Canon", "Story Insights after each chat", "Co-Author knows your full manuscript", "Plot, structure, and pacing advice"],
    color: "#fb923c", screenshot: "/screenshots/character-chat.png",
  },
  {
    step: "12", title: "Non-Fiction & Biography", subtitle: "True stories deserve real tools.",
    desc: "Write memoir, biography, true crime, historical, or investigative non-fiction. A guided Life Interview captures your memories. Life Events structure your timeline. AI extracts people, places, and themes into your Canon automatically.",
    details: ["5 non-fiction subtypes", "AI-guided Life Interview", "Life Events timeline", "Auto-extract to Canon"],
    color: "#06b6d4", screenshot: "/screenshots/nonfiction.png",
    badge: "New",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="bw-section-pad" style={{ padding: "100px 0 108px" }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 80 }}>
          <p className="bw-section-pre" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accentText, marginBottom: 14 }}>HOW IT WORKS</p>
          <h2 className="bw-section-title" style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 16px" }}>From idea to finished manuscript.</h2>
          <p className="bw-section-sub" style={{ fontSize: 18, color: C.textSoft, maxWidth: 580, margin: "0 auto", lineHeight: 1.65 }}>
            Twelve stages. Each one feeds the next. Your Canon stays in control throughout.
          </p>
        </div>

        <div className="bw-stages-grid" style={{ display: "grid", gap: 88 }}>
          {STAGES.map((s, i) => (
            <div key={s.step} className="bw-stage-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
              <div className="bw-stage-text" style={{ order: i % 2 === 0 ? 1 : 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 40, height: 40, borderRadius: 12,
                    background: `${s.color}12`, border: `1.5px solid ${s.color}28`,
                    fontSize: 13, fontWeight: 800, color: s.color,
                  }}>{s.step}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: s.color }}>{s.title}</span>
                  {"badge" in s && s.badge && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                      padding: "3px 10px", borderRadius: 8,
                      background: "rgba(200,230,48,0.12)", color: C.accentText,
                      border: "1px solid rgba(200,230,48,0.25)",
                    }}>{s.badge}</span>
                  )}
                </div>
                <h3 className="bw-stage-subtitle" style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 16px" }}>{s.subtitle}</h3>
                <p className="bw-stage-desc" style={{ fontSize: 15, lineHeight: 1.75, color: C.textSoft, margin: "0 0 24px" }}>{s.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {s.details.map((d) => (
                    <span key={d} style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      padding: "7px 14px", fontSize: 12, fontWeight: 500, color: C.textSoft,
                      background: C.bgSoft, borderRadius: 10, border: `1px solid ${C.border}`,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bw-stage-img" style={{ order: i % 2 === 0 ? 2 : 1 }}>
                <div className="bw-stage-img-wrap" style={{
                  borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}`,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.03)",
                  background: "#fff",
                }}>
                  <img src={s.screenshot} alt={`${s.title} screenshot`} style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Non-Fiction Highlight ─────────────────────────────── */
function NonFictionHighlight() {
  return (
    <section style={{
      padding: "100px 0", position: "relative", overflow: "hidden",
      background: `linear-gradient(135deg, ${C.bgDark} 0%, #161620 50%, #1a1a24 100%)`,
    }}>
      <div style={{ position: "absolute", top: "20%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(80px)" }} />
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span style={{
            display: "inline-block", padding: "5px 14px", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "#06b6d4", background: "rgba(6,182,212,0.1)", borderRadius: 8,
            border: "1px solid rgba(6,182,212,0.2)", marginBottom: 20,
          }}>NEW</span>
          <h2 className="bw-section-title" style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.04em", color: "#fff", margin: "0 0 16px" }}>
            Write non-fiction that reads like a novel.
          </h2>
          <p className="bw-section-sub" style={{ fontSize: 18, color: "rgba(255,255,255,0.45)", maxWidth: 600, margin: "0 auto", lineHeight: 1.65 }}>
            Memoir, biography, true crime, historical, investigative — Blocwrite guides you from raw memories to structured manuscript.
          </p>
        </div>

        <div className="bw-nf-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
          <div>
            {[
              { title: "Guided Life Interview", desc: "AI asks thoughtful questions about your experiences. You talk, it listens, then extracts people, places, and themes into your Canon.", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
              { title: "Life Events Timeline", desc: "Structure your story chronologically. Add dates, people, emotions, and impact. AI suggests events you might have missed.", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
              { title: "Emotional Timeline", desc: "Visualise the emotional arc of your life story. See where the highs and lows fall — then shape your chapters around them.", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
              { title: "Relationship Web", desc: "AI maps relationships between every person in your story. See who connects to whom and how — perfect for complex family histories.", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
              { title: "Privacy Shield", desc: "Mark sensitive content. Control what stays private and what gets published. Built-in safeguards for real-life stories.", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
            ].map((f) => (
              <div key={f.title} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 28 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{f.title}</h4>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.4)", margin: 0 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div style={{
              borderRadius: 16, overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
            }}>
              <img src="/screenshots/nonfiction-interview.png" alt="Non-fiction Life Interview" style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Feature Grid ─────────────────────────────────────── */
const FEATURES = [
  { title: "Canon-aware AI", desc: "Every generation reads your characters, locations, lore, and voice rules before writing. The AI never invents details that contradict your story.", color: "#6366f1", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
  { title: "Context-aware chapters", desc: "Each chapter reads the one before and after it. No contradictions, no drift. Your story flows as one continuous narrative.", color: "#f59e0b", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
  { title: "Writing Packs", desc: "Genre-specific craft kits — Romance, Fantasy, Thriller, Horror, Sci-Fi, Literary, Mystery. Install bolt-ons in one click.", color: "#10b981", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2m0 2v2m0-2h-4.5M3 10v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9H3z" /><path d="M3 10l2-6h14l2 6" /></svg> },
  { title: "Bring your own AI", desc: "OpenRouter, Hugging Face, Infermatic, or LM Studio (local, free). You choose your model. We never charge for AI.", color: "#4d6a00", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> },
  { title: "Private by default", desc: "Your novels live in isolated storage. API keys stay in your browser. We never read, share, or train on your writing.", color: "#8b5cf6", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> },
  { title: "Publish-ready export", desc: "EPUB and DOCX. Clean chaptered prose with no AI notes or metadata. Ready for agents, publishers, or self-publishing.", color: "#0ea5e9", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> },
];

function FeatureGrid() {
  return (
    <section id="features" className="bw-section-pad" style={{ padding: "100px 0", background: C.bgSoft }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p className="bw-section-pre" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accentText, marginBottom: 14 }}>CORE FEATURES</p>
          <h2 className="bw-section-title" style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.04em", margin: 0 }}>Everything you need to finish a novel.</h2>
        </div>
        <div className="bw-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="bw-card-hover" style={{
              padding: 32, borderRadius: 20, border: `1px solid ${C.border}`, background: C.card,
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: `${f.color}10`, border: `1.5px solid ${f.color}20`,
                display: "flex", alignItems: "center", justifyContent: "center", color: f.color,
              }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginTop: 20, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: C.textSoft, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Advanced Features ─────────────────────────────────── */
const ADVANCED_FEATURES = [
  { title: "Talk to Your Characters", desc: "Live AI chat with any character. Ask about secrets and motivations. Story Insights recommends changes based on what was revealed.", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "#fb923c" },
  { title: "AI Co-Author", desc: "A writing partner that knows your whole novel. Answers are specific to your story, not generic writing advice.", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", color: "#06b6d4" },
  { title: "11-Point Continuity Engine", desc: "Canon Traits, Timeline, Relationships, Knowledge, Spatial Logic, Emotional Arc, Voice Drift, and more.", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "#ef4444" },
  { title: "Manuscript Health Score", desc: "Pacing, dialogue, clarity, engagement — scored out of 10 with per-chapter breakdowns and actionable tips.", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", color: "#f59e0b" },
  { title: "Smart Rewrite", desc: "Highlight text, rewrite in 6 modes: emotional, suspenseful, poetic, tighter, bestseller, or polish.", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", color: "#f472b6" },
  { title: "Beta Reader Sharing", desc: "Password-protected, time-limited links. Readers highlight and annotate. Feedback arrives instantly.", icon: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3", color: "#64748b" },
  { title: "Scene-Level Blocs", desc: "Each chapter splits into focused scenes with their own synopsis, bolt-on, and word target.", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", color: "#a78bfa" },
  { title: "Non-Fiction Mode", desc: "Memoir, biography, true crime, historical, investigative. Guided interviews, life events, emotional timelines.", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", color: "#06b6d4", badge: "New" },
];

function AdvancedFeatures() {
  return (
    <section className="bw-section-pad" style={{ padding: "100px 0" }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p className="bw-section-pre" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accentText, marginBottom: 14 }}>INTELLIGENCE LAYER</p>
          <h2 className="bw-section-title" style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 14px" }}>Features no other writing tool offers.</h2>
          <p className="bw-section-sub" style={{ fontSize: 18, color: C.textSoft, maxWidth: 600, margin: "0 auto", lineHeight: 1.65 }}>Every feature works with your Canon — keeping your story consistent, intentional, and publishable.</p>
        </div>
        <div className="bw-advanced-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {ADVANCED_FEATURES.map((f) => (
            <div key={f.title} className="bw-card-hover" style={{
              padding: "24px 28px", borderRadius: 16, border: `1px solid ${C.border}`,
              background: C.card, display: "flex", gap: 16, alignItems: "flex-start",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `${f.color}10`, border: `1.5px solid ${f.color}20`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{f.title}</h3>
                  {"badge" in f && f.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                      padding: "2px 8px", borderRadius: 6,
                      background: `${f.color}14`, color: f.color, border: `1px solid ${f.color}28`,
                    }}>{f.badge}</span>
                  )}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: C.textSoft, margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ──────────────────────────────────────────── */
function Pricing() {
  return (
    <section id="pricing" className="bw-section-pad" style={{ padding: "100px 0", background: C.bgSoft }}>
      <div style={wrap({ textAlign: "center" })}>
        <p className="bw-section-pre" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accentText, marginBottom: 14 }}>PRICING</p>
        <h2 className="bw-section-title" style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 12px" }}>Studio access. No AI fees.</h2>
        <p style={{ fontSize: 17, color: C.textSoft, marginBottom: 12, lineHeight: 1.65 }}>The subscription covers the workspace. AI costs are yours to manage with your own API key.</p>
        <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 56 }}>Every plan includes a 7-day free trial. Cancel anytime — no lock-in.</p>
        <div className="bw-pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 740, margin: "0 auto" }}>
          <PriceCard name="Monthly" price="£12.99" period="month" badge={null} features={["Full studio access", "Unlimited novels & chapters", "Canon, Plan, Blocs, Export", "The Editor, Co-Author, Character Chat", "Bolt-Ons & Writing Packs", "Non-Fiction & Biography mode", "Bring your own AI key", "Cancel anytime"]} />
          <PriceCard name="Annual" price="£99" period="year" badge="Save 36%" features={["Everything in Monthly", "Billed annually", "Works out to £8.25/mo", "Priority consideration for new features", "Cancel anytime"]} highlighted />
        </div>
        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 32, maxWidth: 540, marginLeft: "auto", marginRight: "auto", lineHeight: 1.65 }}>
          AI usage is not included or billed by Blocwrite. You connect your own key from OpenRouter, Infermatic, Hugging Face, or LM Studio. Free AI models are available.
        </p>
      </div>
    </section>
  );
}

function PriceCard({ name, price, period, badge, features, highlighted }: { name: string; price: string; period: string; badge: string | null; features: string[]; highlighted?: boolean }) {
  return (
    <div className="bw-card-hover" style={{
      padding: 36, borderRadius: 24,
      border: highlighted ? `2px solid ${C.text}` : `1px solid ${C.border}`,
      background: C.card, textAlign: "left", position: "relative",
      boxShadow: highlighted ? "0 16px 56px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.02)",
    }}>
      {badge && (
        <span style={{
          position: "absolute", top: 18, right: 18,
          padding: "5px 14px", fontSize: 11, fontWeight: 700, borderRadius: 10,
          background: C.accent, color: C.bgDark,
        }}>{badge}</span>
      )}
      <p style={{ fontSize: 14, fontWeight: 600, color: C.textSoft, marginBottom: 10 }}>{name}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em" }}>{price}</span>
        <span style={{ fontSize: 14, color: C.textMuted }}>/ {period}</span>
      </div>
      <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4, marginBottom: 28 }}>7-day free trial included</p>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px" }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.textSoft, padding: "6px 0" }}>
            <CheckIcon />{f}
          </li>
        ))}
      </ul>
      <Link href="/subscribe" className="bw-btn-hover" style={{
        ...btnPrimary, width: "100%", justifyContent: "center", padding: "14px 0",
        borderRadius: 14, background: C.accent, color: C.bgDark, fontWeight: 700,
        boxShadow: highlighted ? "0 4px 16px rgba(200,230,48,0.25)" : "0 2px 8px rgba(200,230,48,0.12)",
      }}>Start Free Trial</Link>
    </div>
  );
}

/* ── FAQ ──────────────────────────────────────────────── */
const FAQ_ITEMS = [
  { q: "What is Blocwrite?", a: "A structured writing studio for novels — fiction and non-fiction. Canon (story bible), chapter planning, scene-by-scene drafting, 11-point continuity checking, manuscript health scoring, character chat, AI Co-Author, smart rewrite, bolt-ons, writing packs, beta reader sharing, and EPUB/DOCX export. Everything between your outline and a finished book." },
  { q: "Is AI included in the subscription?", a: "No. You bring your own API key from OpenRouter (free models available), Hugging Face, Infermatic, or LM Studio (local, completely free). We never charge for AI. The subscription covers the workspace." },
  { q: "Can I use it without AI?", a: "Yes. Every feature works without AI. Plan, write, format, export \u2014 all by hand. AI is optional. Toggle it off globally." },
  { q: "What is the Canon?", a: "Your story bible. Characters, locations, lore, voice rules, synopsis. Every AI feature reads it first so nothing contradicts your world." },
  { q: "How does The Editor work?", a: "One button, two modes. In a chapter: 11 continuity checks, grammar pass, and prose polish. In the overview: full-manuscript sentence-level rewrites with current vs. suggested diffs. Accept or dismiss each one." },
  { q: "Can I write non-fiction or biography?", a: "Yes. When you create a novel, choose Fiction or Non-Fiction. Non-fiction supports memoir, biography, true crime, historical, and investigative subtypes. You get a guided Life Interview where AI asks about your experiences, a Life Events timeline, emotional mapping, relationship webs, and auto-extraction to your Canon. All the same drafting, editing, and export tools apply." },
  { q: "What is Manuscript Health?", a: "AI scores your novel on pacing, dialogue, clarity, and engagement (out of 10). Per-chapter breakdowns with specific tips to improve." },
  { q: "What are Writing Packs?", a: "Genre-specific craft kits \u2014 Romance Plot Kit, Fantasy World Builder, Thriller Dialogue Engine, Horror Atmosphere, Sci-Fi World Engine, and more. Install bolt-ons in one click." },
  { q: "What are Bolt-Ons?", a: "Plain-English directives you attach per-chapter or per-scene \u2014 \u2018keep it gritty\u2019, \u2018more dialogue\u2019, \u2018Yorkshire dialect\u2019. They tell the AI exactly how to write. Stack as many as you like." },
  { q: "What is Arc Intelligence?", a: "AI analyses your story structure and generates three scored arc directions. Compare them side by side, pick the best fit, and it rewrites every chapter synopsis to match." },
  { q: "How does Chat with Characters work?", a: "Open a live AI conversation with any character from your Canon. They answer in their own voice using their backstory, goals, and personality. Story Insights recommends profile updates based on what was revealed." },
  { q: "Can I share with beta readers?", a: "Yes. Generate a password-protected, time-limited link. Readers see your manuscript in a clean branded view, highlight text, and leave annotations. Review feedback with AI-assisted accept or reject." },
  { q: "How does the free trial work?", a: "7 days, full access, every feature. No charge until the trial ends. Cancel anytime \u2014 no questions asked." },
  { q: "Is my writing private?", a: "Yes. Isolated storage, no training on your data, API keys stored in your browser. We never read or share your content." },
];

function FAQ() {
  return (
    <section id="faq" className="bw-section-pad" style={{ padding: "100px 0" }}>
      <div style={wrap({ maxWidth: 740 })}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="bw-section-pre" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accentText, marginBottom: 14 }}>FAQ</p>
          <h2 className="bw-section-title" style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.04em", margin: 0 }}>Common questions.</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
        <span className="bw-faq-q">{q}</span>
        <span style={{
          fontSize: 20, color: C.textMuted, transition: "transform 0.25s",
          transform: open ? "rotate(45deg)" : "none", flexShrink: 0, marginLeft: 16,
        }}>+</span>
      </button>
      <div style={{
        maxHeight: open ? 500 : 0, overflow: "hidden",
        transition: "max-height 0.3s ease",
      }}>
        <p className="bw-faq-a" style={{ fontSize: 15, lineHeight: 1.65, color: C.textSoft, marginTop: 14, marginBottom: 0 }}>{a}</p>
      </div>
    </div>
  );
}

/* ── CTA Banner ───────────────────────────────────────── */
function CTABanner() {
  return (
    <section style={{
      padding: "100px 0",
      background: `linear-gradient(135deg, ${C.bgDark} 0%, #181820 50%, #1e1e28 100%)`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", bottom: "-40%", left: "50%", transform: "translateX(-50%)",
        width: "80%", height: "100%",
        background: "radial-gradient(ellipse, rgba(200,230,48,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ ...wrap(), textAlign: "center", position: "relative", zIndex: 1 }}>
        <h2 className="bw-cta-title" style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.04em", color: "#fff", margin: "0 0 18px" }}>
          Ready to write something real?
        </h2>
        <p className="bw-cta-sub" style={{ fontSize: 18, color: "rgba(255,255,255,0.4)", marginBottom: 48, maxWidth: 560, marginLeft: "auto", marginRight: "auto", lineHeight: 1.65 }}>
          Plan your story, draft scene by scene, chat with your characters, polish with The Editor, and export a clean manuscript. Fiction or non-fiction. Start your free trial today.
        </p>
        <Link href="/subscribe" className="bw-btn-hover" style={{
          ...btnPrimary, padding: "16px 44px", fontSize: 16,
          background: C.accent, color: C.bgDark,
          boxShadow: "0 4px 32px rgba(200,230,48,0.3)", borderRadius: 14,
        }}>
          Start Free Trial <ArrowIcon color={C.bgDark} />
        </Link>
      </div>
    </section>
  );
}

/* ── Footer ───────────────────────────────────────────── */
function Footer() {
  const linkStyle: React.CSSProperties = { fontSize: 14, color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.15s" };
  return (
    <footer style={{ padding: "52px 0 44px", background: C.bgDark, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="bw-footer-inner" style={{ ...wrap(), display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 32, width: "auto", opacity: 0.6 }} />
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
            <Link key={l.href} href={l.href} style={linkStyle}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >{l.label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ── Icons ─────────────────────────────────────────────── */
function ArrowIcon({ color = "#fff" }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
  );
}
