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
          Plot your story spine. Build a canon the AI actually reads. Draft scene by scene with blueprints that keep prose tight, human, and on-brand. Catch every continuity error. Export a publish-ready manuscript. Fiction and non-fiction.
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

        {/* spacer after hero text */}
        <div style={{ height: 40 }} />
      </div>
    </section>
  );
}

/* ── Trust Strip ── */
function TrustBar() {
  return (
    <section style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
      <div className="bw-trust-grid" style={{ ...wrap(), display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "22px 32px", flexWrap: "wrap" }}>
        {[
          "7-day free trial",
          "You own your AI key",
          "No training on your data",
          "EPUB & DOCX export",
          "Cancel anytime",
        ].map((t, i, arr) => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textSoft }}>{t}</span>
            </span>
            {i < arr.length - 1 && <span style={{ color: C.border, fontSize: 11 }}>|</span>}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ── Screenshot preview — no fade, just clean rounded shadow ── */
function ScreenshotPreview({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)", maxWidth: 520 }}>
      <img src={src} alt={alt} style={{ width: "100%", height: "auto", display: "block" }} />
    </div>
  );
}

function PlotSpinePreview() {
  return <ScreenshotPreview src="/previews/plot-spine.png" alt="Blocwrite Plot Spine — story beats, tension arc, character presence" />;
}

function CanonPreview() {
  return <ScreenshotPreview src="/previews/bolt-ons.png" alt="Blocwrite Canon — Bolt-Ons and craft directives" />;
}

function BlocsPreview() {
  return <ScreenshotPreview src="/previews/blocs.png" alt="Blocwrite Scene Blocs — chapter editor with scene-by-scene drafting" />;
}

function NFPreview() {
  return <ScreenshotPreview src="/previews/non-fiction.png" alt="Blocwrite Non-Fiction — Life Events for biography and memoir" />;
}


function ShowcaseSection() {
  const SHOWCASES: { pre: string; title: string; desc: string; details: string[]; color: string; preview: React.ReactNode }[] = [
    {
      pre: "PLOT SPINE",
      title: "Map your entire story before you write a word.",
      desc: "Pick a narrative arc \u2014 Hero\u2019s Journey, Three-Act, Save the Cat \u2014 and the AI builds story beats across all three acts, weaves in subplots, and tracks character arcs. Every chapter knows exactly where it sits in the bigger picture. No more \u2018writing into the dark\u2019.",
      details: ["Genre-aware arc picker", "Beats, subplots & character arcs", "Auto-links to your chapter plan", "Story Enhancer deepens emotional layers"],
      color: "#7c5cfc",
      preview: <PlotSpinePreview />,
    },
    {
      pre: "THE CANON",
      title: "The AI reads your world before it writes a sentence.",
      desc: "Build out characters with backstories, speech patterns, and secrets. Drop in locations with atmosphere and sensory detail. Set voice rules and lore. Every single AI generation reads your Canon first \u2014 so the prose never contradicts your world or forgets who your characters are.",
      details: ["Deep character profiles & voice", "Locations with sensory detail", "Lore, rules & worldbuilding", "AI-powered synopsis generation"],
      color: "#e2c87e",
      preview: <CanonPreview />,
    },
    {
      pre: "SCENE-BY-SCENE DRAFTING",
      title: "Every scene gets a blueprint. The AI follows it.",
      desc: "Chapters split into focused scene blocs, each with its own synopsis, word target, and detailed instructions \u2014 opening lines, emotional arcs, sensory palettes, dialogue cues, tension levels. The AI doesn\u2019t guess. It follows your blueprint and writes prose that actually sounds human.",
      details: ["Writer\u2019s blueprint per scene", "Emotional arc & tension tracking", "Sensory palette guidance", "Anti-AI prose rules baked in"],
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
            Idea to finished manuscript. Zero drift.
          </h2>
          <p style={{ fontSize: 17, color: C.textSoft, maxWidth: 580, margin: "0 auto", lineHeight: 1.65 }}>
            Your Canon feeds the Plan. The Plan feeds the Blocs. The Blocs feed the prose. Every layer is connected. Nothing gets lost.
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
                  {s.details.map((dd) => (
                    <div key={dd} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      <span style={{ fontSize: 14, fontWeight: 500, color: C.textSoft }}>{dd}</span>
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
    { title: "11-Point Continuity Engine", desc: "Catches the mistakes you won\u2019t. Canon traits, timeline, relationships, spatial logic, voice drift, emotional arc \u2014 11 checks, one button. Nothing slips through.", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "#ef4444" },
    { title: "Manuscript Health Score", desc: "Is your novel ready? Pacing, dialogue, clarity, engagement \u2014 each scored out of 10 with per-chapter breakdowns and specific tips to level up.", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", color: "#e2c87e" },
    { title: "Chat with Your Characters", desc: "Open a live conversation with any character. They answer in voice, drawing on their backstory and secrets. Story Insights suggests profile updates after every chat.", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "#fb923c" },
    { title: "AI Co-Author", desc: "A collaborator who\u2019s read every chapter. Ask about plot holes, brainstorm twists, test dialogue, get pacing feedback \u2014 answers are specific to your story, not generic advice.", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", color: "#06b6d4" },
    { title: "Bolt-Ons & Writing Packs", desc: "Tell the AI exactly how to write. \u2018Keep it gritty.\u2019 \u2018More dialogue.\u2019 \u2018Yorkshire dialect.\u2019 Stack as many as you like, per-chapter or per-scene. Genre craft kits included.", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", color: "#10b981" },
    { title: "Beta Reader Sharing", desc: "Send a password-protected link to anyone. Readers highlight text and leave annotations in a clean branded view. Review every piece of feedback with AI-assisted accept or reject.", icon: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3", color: "#8b5cf6" },
  ];
  return (
    <section style={{ padding: "80px 0 100px", background: C.bgWhite }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7c5cfc", marginBottom: 14 }}>INTELLIGENCE LAYER</p>
          <h2 className="bw-section-title" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.035em", margin: 0, color: C.text }}>
            The intelligence layer behind every chapter.
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
    { title: "Two dedicated paths", desc: "Biography & memoir, or other non-fiction. Pick once when you start. Every tool, menu, and AI prompt adapts to your category \u2014 no irrelevant options cluttering the screen.", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
    { title: "Guided Life Interview", desc: "For biographies: the AI walks you through your story in phases \u2014 big-picture, deep-dive, connections, reflection. Your answers are extracted into Canon automatically.", icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" },
    { title: "Emotional Timeline", desc: "Map real events with dates, people, places, and emotional weight. Sort by date or impact. The AI spots gaps in your coverage and paces your story around the moments that matter.", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { title: "Researcher & Source Tracking", desc: "For other non-fiction: paste in research, chat through it, and the AI builds structured notes with source-strength ratings. Everything feeds into your chapter plan.", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
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
            True stories deserve proper tools.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", maxWidth: 600, margin: "0 auto", lineHeight: 1.65 }}>
            Biography or textbook, memoir or history \u2014 each path gets its own tailored Canon sections, AI prompts, and research workflows. No fiction features getting in the way.
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
    { title: "Smart Rewrite", desc: "Highlight any passage and rewrite it six ways: emotional, suspenseful, poetic, tighter, bestseller, or polish. Pick the version you like." },
    { title: "Story Enhancer", desc: "Enriches your chapter synopses with deeper emotion, stronger transitions, and more character nuance \u2014 without changing a single plot beat." },
    { title: "Plot Spine Doctor", desc: "Scans your entire spine for structural weaknesses \u2014 pacing drops, missing tension, character gaps \u2014 and offers one-click fixes." },
    { title: "Full Formatting Toolbar", desc: "Bold, italic, headings, alignment, section breaks. Every format option carries through cleanly to your exported manuscript." },
    { title: "Anti-AI Prose Rules", desc: "No \u2018fluorescent\u2019, no \u2018ethereal\u2019, no walls of em dashes. Built-in rules enforce natural sentence variety and show-don\u2019t-tell writing." },
    { title: "Publish-Ready Export", desc: "One click to EPUB or DOCX. Cleanly chaptered prose with zero AI notes, zero metadata. Ready for agents, editors, or self-publishing." },
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
  const shared = [
    "Full studio access",
    "Unlimited novels & chapters",
    "Plot Spine, Canon, Plan & Blocs",
    "The Editor & AI Co-Author",
    "Bolt-Ons & Writing Packs",
    "Non-Fiction & Biography tools",
    "Beta reader sharing & export",
    "You bring your own AI key",
  ];
  return (
    <section id="pricing" style={{ padding: "100px 0", background: C.bgWhite }}>
      <div style={wrap({ textAlign: "center" })}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7c5cfc", marginBottom: 14 }}>PRICING</p>
        <h2 className="bw-section-title" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.035em", margin: "0 0 12px", color: C.text }}>
          One studio. You bring the AI.
        </h2>
        <p style={{ fontSize: 17, color: C.textSoft, maxWidth: 540, margin: "0 auto", marginBottom: 8, lineHeight: 1.6 }}>
          Your subscription covers the full workspace. AI runs on your own API key — you pick the model, you control the cost. No hidden fees.
        </p>
        <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 56 }}>7-day free trial on every plan. Cancel anytime.</p>

        <div className="bw-pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, maxWidth: 740, margin: "0 auto", alignItems: "stretch" }}>
          <PriceCard name="Monthly" price="£12.99" period="month" badge={null} features={[...shared, "Cancel anytime"]} />
          <PriceCard name="Annual" price="£99" period="year" badge="Save 36%" highlighted features={[...shared, "Priority for new features"]} />
        </div>

        <p style={{ fontSize: 13, color: C.textMuted, maxWidth: 540, margin: "40px auto 0", lineHeight: 1.6 }}>
          Blocwrite never charges for AI. Connect your key from OpenRouter (free models available), Hugging Face, Infermatic, or LM Studio (local, completely free). Don&apos;t want AI? Toggle it off — every feature still works.
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
      padding: "40px 36px", borderRadius: 24, textAlign: "left", position: "relative",
      display: "flex", flexDirection: "column",
      border: highlighted ? "2px solid #7c5cfc" : `1px solid ${C.border}`,
      background: highlighted ? "linear-gradient(180deg, rgba(124,92,252,0.04) 0%, rgba(184,164,255,0.01) 100%)" : C.bgWhite,
      boxShadow: highlighted ? "0 16px 56px rgba(124,92,252,0.1)" : "0 2px 8px rgba(0,0,0,0.03)",
    }}>
      {badge && (
        <span style={{
          position: "absolute", top: 20, right: 20, padding: "5px 14px", fontSize: 11, fontWeight: 700, borderRadius: 10,
          background: C.btnPrimary, color: "#fff",
        }}>{badge}</span>
      )}
      <p style={{ fontSize: 14, fontWeight: 600, color: C.textSoft, marginBottom: 12 }}>{name}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.04em", color: C.text }}>{price}</span>
        <span style={{ fontSize: 15, color: C.textMuted, fontWeight: 500 }}>/ {period}</span>
      </div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 32 }}>7-day free trial included</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.textSoft, padding: "7px 0" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c5cfc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
            {f}
          </li>
        ))}
      </ul>
      <Link href="/subscribe" style={{
        display: "flex", alignItems: "center", justifyContent: "center", padding: "15px 0", width: "100%",
        fontSize: 15, fontWeight: 700, borderRadius: 14, textDecoration: "none", marginTop: 32,
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
  { q: "What is Blocwrite?", a: "A full novel-writing studio. You get Plot Spine planning, a living Canon that the AI actually reads, scene-by-scene drafting with detailed blueprints, 11-point continuity checking, manuscript health scoring, character chat, an AI co-author, smart rewrite, bolt-ons, writing packs, beta reader sharing, and publish-ready EPUB/DOCX export. Fiction and non-fiction." },
  { q: "Wait \u2014 AI isn\u2019t included in the price?", a: "Correct. Blocwrite is the workspace; AI runs on your own API key. That means you choose the model and control the cost. Connect via OpenRouter (which offers free models), Hugging Face, Infermatic, or LM Studio for local, completely free inference. We will never charge you for AI usage." },
  { q: "What if I don\u2019t want to use AI at all?", a: "Toggle it off. Every feature \u2014 planning, writing, formatting, exporting \u2014 works without AI. You also get a writing session tracker, focus mode, and chapter word counts when AI is off." },
  { q: "What is the Plot Spine?", a: "Your story\u2019s structural backbone. Pick a narrative arc (Hero\u2019s Journey, Three-Act, Save the Cat, and more), and the AI generates story beats across all three acts, weaves in subplots, and maps character arcs. Every element auto-links to your chapter plan so each chapter knows exactly where it sits in the bigger picture." },
  { q: "How does The Editor work?", a: "One button, two modes. Inside a chapter: 11 continuity checks against your Canon, a grammar pass, and a prose polish. On the overview page: full-manuscript sentence-level rewrites with inline diffs you can accept or reject." },
  { q: "Can I write non-fiction?", a: "Absolutely. When you create a non-fiction book, you pick a path \u2014 Biography & Memoir or Other Non-Fiction. Each path gets its own tailored Canon sections, AI prompts, and research tools. Biographies get a guided Life Interview and emotional timeline. Other non-fiction gets a Researcher chat and source-tracked notes." },
  { q: "What are Bolt-Ons?", a: "Plain-English directives you attach per-chapter or per-scene. \u2018Keep it gritty.\u2019 \u2018More dialogue.\u2019 \u2018Yorkshire dialect.\u2019 Stack as many as you like. Genre craft kits (Romance, Thriller, Horror, Fantasy) are included." },
  { q: "How does the free trial work?", a: "7 days. Full access to every feature. No credit card required upfront. If you don\u2019t cancel, your chosen plan begins automatically. Cancel anytime from your account." },
  { q: "Is my writing private?", a: "Yes. Your novels are stored in isolated storage. We never train on your data, read your content, or share it. API keys stay in your browser and are never sent to our servers." },
  { q: "Does the AI write like AI?", a: "We\u2019ve gone further than anyone to prevent it. Anti-AI prose rules are baked into every generation: banned words (fluorescent, ethereal, visceral, tapestry...), strict em-dash limits, enforced sentence-length variety, and show-don\u2019t-tell guidelines. The prose reads like a human wrote it." },
];

function FAQ() {
  return (
    <section id="faq" style={{ padding: "100px 0", background: C.bg }}>
      <div style={wrap({ maxWidth: 720 })}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7c5cfc", marginBottom: 14 }}>FAQ</p>
          <h2 className="bw-section-title" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.035em", margin: 0, color: C.text }}>Questions we get asked a lot.</h2>
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
          Your novel deserves a proper studio.
        </h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", marginBottom: 48, maxWidth: 540, margin: "0 auto 48px", lineHeight: 1.6 }}>
          Plot Spine. Canon. Scene blueprints. 11-point continuity checks. Anti-AI prose. Publish-ready export. Try the full studio free for 7 days.
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
