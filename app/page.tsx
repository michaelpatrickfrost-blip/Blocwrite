"use client";

import Link from "next/link";
import { useState } from "react";

/* ────────────────────────────────────────────────────────
   Colour palette — refined for premium feel
   ────────────────────────────────────────────────────── */
const C = {
  bg: "#ffffff",
  bgSoft: "#f8f8fa",
  bgDark: "#0e0e12",
  bgDarkSoft: "#18181e",
  text: "#111114",
  textSoft: "#4a4d56",
  textMuted: "#8c8f98",
  border: "#e8e9ed",
  borderSoft: "#f0f0f3",
  card: "#ffffff",
  accent: "#c8e630",
  /** Darker accent for text on light backgrounds — passes WCAG AA */
  accentText: "#4d6a00",
  accentSoft: "#e8f5a0",
  btnBg: "linear-gradient(135deg, #2a2a30, #1a1a1f)",
  btnText: "#ffffff",
  btnOutline: "#1a1a1f",
};

const MAX_W = 1120;
const wrap = (extra?: React.CSSProperties): React.CSSProperties => ({
  maxWidth: MAX_W,
  margin: "0 auto",
  padding: "0 28px",
  ...extra,
});

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "15px 36px",
  fontSize: 15,
  fontWeight: 600,
  color: C.btnText,
  background: C.btnBg,
  border: "none",
  borderRadius: 14,
  cursor: "pointer",
  textDecoration: "none",
  transition: "transform 0.15s, box-shadow 0.15s",
  boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
};

const btnOutline: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "15px 36px",
  fontSize: 15,
  fontWeight: 600,
  color: C.btnOutline,
  background: "transparent",
  border: `1.5px solid ${C.border}`,
  borderRadius: 14,
  cursor: "pointer",
  textDecoration: "none",
  transition: "all 0.15s",
};

/* ══════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}>
      <Nav />
      <Hero />
      <TrustBar />
      <AiBanner />
      <HowItWorks />
      <FeatureGrid />
      <Pricing />
      <FAQ />
      <CTABanner />
      <Footer />
    </main>
  );
}

/* ── Nav ───────────────────────────────────────────────── */
function Nav() {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid ${C.borderSoft}`,
      }}
    >
      <div style={{ ...wrap(), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.04em", lineHeight: 1 }}>
            <span style={{ color: C.accentText, fontWeight: 900 }}>/</span>Blocwrite
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div style={{ display: "flex", gap: 32 }} className="bw-nav-links">
            {[
              { label: "How it works", href: "#how-it-works" },
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "FAQ", href: "#faq" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{ fontSize: 14, fontWeight: 500, color: C.textSoft, textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.textSoft; }}
              >
                {l.label}
              </a>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 500, color: C.textSoft, textDecoration: "none" }}>
              Log in
            </Link>
            <Link href="/subscribe" style={{ ...btnPrimary, padding: "10px 24px", fontSize: 13, borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
              Start Free Trial
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero ──────────────────────────────────────────────── */
function Hero() {
  return (
    <section
      style={{
        padding: 0,
        background: `linear-gradient(180deg, ${C.bgDark} 0%, #151519 60%, #1a1a20 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle radial glow */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "140%",
          height: "100%",
          background: "radial-gradient(ellipse at center, rgba(200,230,48,0.05) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ ...wrap(), textAlign: "center", padding: "96px 28px 88px", position: "relative", zIndex: 1 }}>
        <p style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: C.accent,
          marginBottom: 32,
        }}>
          Instant Clarity
        </p>

        <h1 style={{
          fontSize: "clamp(38px, 5.5vw, 64px)",
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1.08,
          margin: "0 auto",
          maxWidth: 800,
          color: "#ffffff",
        }}>
          The writing studio that keeps
          <br />
          <span style={{ color: "rgba(255,255,255,0.35)" }}>your entire novel in focus.</span>
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.7, color: "rgba(255,255,255,0.5)", maxWidth: 580, margin: "32px auto 0" }}>
          Blocwrite is a structured workspace for novelists. Build a story bible, plan every chapter, draft scene-by-scene in focused blocs, and export a clean manuscript. Your AI key powers the assistant — we never charge for AI usage.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 48, flexWrap: "wrap" }}>
          <Link
            href="/subscribe"
            style={{
              ...btnPrimary,
              padding: "16px 40px",
              fontSize: 15,
              background: C.accent,
              color: C.bgDark,
              boxShadow: "0 4px 24px rgba(200,230,48,0.3)",
              borderRadius: 14,
            }}
          >
            Start 7-Day Free Trial
            <ArrowIcon color={C.bgDark} />
          </Link>
          <a
            href="#how-it-works"
            style={{
              ...btnOutline,
              padding: "16px 40px",
              color: "rgba(255,255,255,0.65)",
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            See how it works
          </a>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 40, flexWrap: "wrap" }}>
          {["7-day free trial", "Cancel anytime", "Bring your own AI key", "Toggle AI off anytime", "EPUB & DOCX export"].map((t) => {
            const isHighlight = t.includes("AI") || t.includes("Toggle");
            return (
              <span
                key={t}
                style={{
                  display: "inline-block",
                  padding: "7px 18px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isHighlight ? C.accent : "rgba(255,255,255,0.4)",
                  background: isHighlight ? "rgba(200,230,48,0.08)" : "rgba(255,255,255,0.03)",
                  borderRadius: 20,
                  border: isHighlight ? "1px solid rgba(200,230,48,0.18)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {t}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Trust bar — social proof strip ───────────────────── */
function TrustBar() {
  return (
    <div style={{ background: C.bg, padding: "28px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
      <div style={{ ...wrap(), display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
        {[
          { value: "7 days", label: "Free trial" },
          { value: "£0", label: "AI fees from us" },
          { value: "100%", label: "Your data, private" },
          { value: "EPUB + DOCX", label: "Export formats" },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, color: C.text }}>{s.value}</p>
            <p style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, margin: "4px 0 0" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── AI Banner — make it unmissable ──────────────────── */
function AiBanner() {
  return (
    <section style={{ padding: 0, background: C.bg }}>
      <div style={{ ...wrap(), maxWidth: 920, padding: "48px 28px" }}>
        <div style={{
          padding: "32px 36px",
          borderRadius: 20,
          background: `linear-gradient(135deg, #16161c 0%, #22222a 100%)`,
          border: "1px solid rgba(200,230,48,0.12)",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 28,
          alignItems: "center",
          boxShadow: "0 12px 48px rgba(0,0,0,0.12)",
        }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: "rgba(200,230,48,0.08)",
            border: "1px solid rgba(200,230,48,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
              Bring Your Own AI Key — we never charge for AI
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.5)", margin: 0 }}>
              Blocwrite does <strong style={{ color: "rgba(255,255,255,0.8)" }}>not</strong> include AI credits. You connect your own API key from{" "}
              <strong style={{ color: "rgba(255,255,255,0.8)" }}>OpenRouter</strong> (free models available),{" "}
              <strong style={{ color: "rgba(255,255,255,0.8)" }}>Infermatic</strong>, or{" "}
              <strong style={{ color: "rgba(255,255,255,0.8)" }}>LM Studio</strong> (local, 100% free). You choose your model, you control your costs. Don&apos;t want AI? Just toggle it off — every feature works without it. The subscription covers the studio workspace only.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── How It Works — 7 stages ─────────────────────────── */
const STAGES = [
  {
    step: "01",
    title: "Your writing studio",
    subtitle: "All your novels in one place.",
    desc: "Your home screen shows every novel at a glance — word counts, chapter progress, characters, and reading time. Create a new project in one click and dive straight in. Everything autosaves.",
    details: [
      "Novel dashboard with live word stats",
      "One-click project creation",
      "Track chapters, characters, locations, and lore",
      "Goal progress bar keeps you motivated",
    ],
    color: "#6366f1",
    screenshot: "/screenshots/studio.png",
  },
  {
    step: "02",
    title: "Build your Canon",
    subtitle: "Set the rules before you write a word.",
    desc: "The Canon is your story bible — every character, location, piece of lore, and voice rule you define lives here. When you later ask the AI to draft prose, it reads your entire Canon first. That means characters stay in voice, your world stays consistent, and the AI never invents details that contradict your story.",
    details: [
      "Characters: name, personality, secrets, speech patterns",
      "Locations: physical details, mood, sensory notes",
      "Lore: world rules, magic systems, factions, timelines",
      "Synopsis with AI-powered clarity tools",
    ],
    color: "#f59e0b",
    screenshot: "/screenshots/overview.png",
  },
  {
    step: "03",
    title: "Steer the AI with Bolt-Ons",
    subtitle: "Reusable plugins that shape every generation.",
    desc: "Bolt-ons are short directives you write in plain English — 'keep it gritty', 'more dialogue', 'Yorkshire dialect'. Blocwrite turns them into focused AI prompts. Attach a bolt-on to a chapter or individual bloc and every generation respects your instruction.",
    details: [
      "Quick-add categories: voice, pacing, emotion, plot",
      "AI builds a focused prompt from your instruction",
      "Attach per-chapter or per-bloc",
      "Save and reuse across your novel",
    ],
    color: "#10b981",
    screenshot: "/screenshots/boltons.png",
  },
  {
    step: "04",
    title: "Plan your chapters",
    subtitle: "One-click outline, then refine.",
    desc: "Hit Generate and Blocwrite builds a structured chapter plan from your synopsis and Canon. Each chapter gets a title, a detailed synopsis with real plot beats, named characters, and specific locations. Sync the plan to your manuscript when you are ready.",
    details: [
      "AI generates all chapters in one batch",
      "Each synopsis names characters and locations",
      "Pacing control: slow-burn, balanced, or fast",
      "Chapters know what comes before and after",
    ],
    color: "#8b5cf6",
    screenshot: "/screenshots/plan.png",
  },
  {
    step: "05",
    title: "Draft in focused blocs",
    subtitle: "Small chunks. No drift.",
    desc: "Each chapter splits into 3-4 scene blocs, each targeting 400-1000 words. The AI gets the chapter synopsis, the Canon, and any bolt-on directives. Because each chunk is small and tightly scoped, the AI produces coherent prose that follows your plan instead of going off on tangents.",
    details: [
      "3-4 blocs per chapter with synopses",
      "Word targets: 400, 600, 800, 1000 or best-fit",
      "Bolt-ons for precise AI control",
      "Canon + context fed into every generation",
    ],
    color: "#ec4899",
    screenshot: "/screenshots/blocs.png",
  },
  {
    step: "06",
    title: "Canon-aware synopsis",
    subtitle: "AI that reads your entire story.",
    desc: "Every AI action in Blocwrite reads your full Canon first. Your synopsis, characters, locations, and lore all feed into every generation. Use tools like 'Improve clarity', 'Tighten and trim', or 'Back-cover blurb' to refine your synopsis while the AI respects everything you have already built.",
    details: [
      "AI reads your full Canon for every action",
      "Multiple synopsis tools: clarity, trim, blurb, arc",
      "Themes and core conflict always accessible",
      "Run Assistant to expand any field",
    ],
    color: "#f59e0b",
    screenshot: "/screenshots/canon.png",
  },
  {
    step: "07",
    title: "Polish with The Editor",
    subtitle: "Professional chapter-level editing.",
    desc: "When your draft is written, run The Editor over any chapter. It enhances prose quality, catches inconsistencies with your Canon, and checks continuity across scenes — all while respecting your voice. Only changed paragraphs are returned, so it is fast and safe.",
    details: [
      "Prose quality check and enhancement",
      "Scene and place consistency verification",
      "Before/after comparison for every edit",
      "Accept or reject each change individually",
    ],
    color: "#6366f1",
    screenshot: "/screenshots/editor.png",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: "96px 0 100px" }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accentText, marginBottom: 14 }}>
            HOW IT WORKS
          </p>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.035em", margin: "0 0 14px" }}>
            From idea to finished manuscript.
          </h2>
          <p style={{ fontSize: 17, color: C.textSoft, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
            Five stages. Each one feeds the next. Your Canon stays in control throughout.
          </p>
        </div>

        <div style={{ display: "grid", gap: 80 }}>
          {STAGES.map((s, i) => (
            <div
              key={s.step}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 56,
                alignItems: "center",
              }}
            >
              {/* Text side */}
              <div style={{ order: i % 2 === 0 ? 1 : 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: `${s.color}14`,
                    border: `1.5px solid ${s.color}30`,
                    fontSize: 13,
                    fontWeight: 800,
                    color: s.color,
                  }}>
                    {s.step}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: s.color }}>
                    {s.title}
                  </span>
                </div>

                <h3 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.18, margin: "0 0 16px" }}>
                  {s.subtitle}
                </h3>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: C.textSoft, margin: "0 0 24px" }}>
                  {s.desc}
                </p>

                {/* Detail pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {s.details.map((d) => (
                    <span
                      key={d}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 500,
                        color: C.textSoft,
                        background: C.bgSoft,
                        borderRadius: 10,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Screenshot side */}
              <div style={{ order: i % 2 === 0 ? 2 : 1 }}>
                <div style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.04)",
                  background: "#ffffff",
                }}>
                  <img
                    src={s.screenshot}
                    alt={`${s.title} screenshot`}
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Feature Grid ─────────────────────────────────────── */
const FEATURES = [
  {
    title: "Your Canon drives everything",
    desc: "Characters, locations, lore, and voice rules. Every AI generation reads your Canon first so nothing drifts from your story.",
    color: "#6366f1",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  },
  {
    title: "Chapters that know their context",
    desc: "Each chapter reads the one before and after it. The AI never writes in isolation — your story flows like one continuous narrative.",
    color: "#f59e0b",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  },
  {
    title: "Bolt-on directives",
    desc: "Reusable AI instructions like 'write in first person' or 'focus on dialogue'. Attach them to chapters or individual blocs for precise control.",
    color: "#10b981",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2m0 2v2m0-2h-4.5M3 10v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9H3z" /><path d="M3 10l2-6h14l2 6" /></svg>,
  },
  {
    title: "Bring your own AI — or don't",
    desc: "Use OpenRouter, Infermatic, or LM Studio. We never charge for AI. Don't want AI? Toggle it off and write entirely by hand.",
    color: "#4d6a00",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  },
  {
    title: "Per-user data isolation",
    desc: "Your novels are stored in your own private data space. We never read, share, or train on your writing. Your words stay yours.",
    color: "#8b5cf6",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  },
  {
    title: "Clean EPUB & DOCX export",
    desc: "Export prose-only manuscripts. No AI notes, no planning data, no metadata. Just chaptered prose ready for agents or self-publishing.",
    color: "#0ea5e9",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  },
];

function FeatureGrid() {
  return (
    <section id="features" style={{ padding: "96px 0", background: C.bgSoft }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accentText, marginBottom: 14 }}>
            FEATURES
          </p>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.035em", margin: 0 }}>
            Everything you need to finish a novel.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                padding: 32,
                borderRadius: 20,
                border: `1px solid ${C.border}`,
                background: C.card,
                transition: "box-shadow 0.25s, transform 0.25s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.06)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: `${f.color}10`,
                  border: `1.5px solid ${f.color}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: f.color,
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginTop: 20, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: C.textSoft, margin: 0 }}>{f.desc}</p>
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
    <section id="pricing" style={{ padding: "100px 0" }}>
      <div style={wrap({ textAlign: "center" })}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accentText, marginBottom: 14 }}>
          PRICING
        </p>
        <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.035em", margin: "0 0 10px" }}>
          Studio access. No AI fees.
        </h2>
        <p style={{ fontSize: 17, color: C.textSoft, marginBottom: 12, lineHeight: 1.6 }}>
          The subscription covers the workspace. AI costs are yours to manage with your own API key.
        </p>
        <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 56 }}>
          Start with a 7-day free trial. Cancel anytime.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 720, margin: "0 auto" }}>
          <PriceCard
            name="Monthly"
            price="£12.99"
            period="month"
            badge={null}
            features={["Full studio access", "Unlimited novels & chapters", "Canon, Plan, Blocs, Export", "Bring your own AI key", "Cancel anytime"]}
          />
          <PriceCard
            name="Annual"
            price="£99"
            period="year"
            badge="Save 36%"
            features={["Everything in Monthly", "Billed annually", "Works out to £8.25/mo", "Priority consideration", "Cancel anytime"]}
            highlighted
          />
        </div>

        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 32, maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          AI usage is not included or billed by Blocwrite. You connect your own key from OpenRouter, Infermatic, or LM Studio. Free AI models are available on OpenRouter.
        </p>
      </div>
    </section>
  );
}

function PriceCard({
  name, price, period, badge, features, highlighted,
}: {
  name: string; price: string; period: string; badge: string | null; features: string[]; highlighted?: boolean;
}) {
  return (
    <div
      style={{
        padding: 36,
        borderRadius: 24,
        border: highlighted ? `2px solid ${C.text}` : `1px solid ${C.border}`,
        background: C.card,
        textAlign: "left",
        position: "relative",
        boxShadow: highlighted ? "0 16px 56px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.02)",
        transition: "box-shadow 0.25s, transform 0.25s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = highlighted ? "0 20px 64px rgba(0,0,0,0.12)" : "0 12px 40px rgba(0,0,0,0.06)";
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = highlighted ? "0 16px 56px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.02)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {badge && (
        <span style={{
          position: "absolute", top: 18, right: 18,
          padding: "5px 14px", fontSize: 11, fontWeight: 700, borderRadius: 10,
          background: C.accent, color: C.bgDark,
        }}>
          {badge}
        </span>
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
            <CheckIcon />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href="/subscribe"
        style={{
          ...btnPrimary,
          width: "100%",
          justifyContent: "center",
          padding: "14px 0",
          borderRadius: 14,
          ...(highlighted
            ? { background: C.accent, color: C.bgDark, boxShadow: "0 4px 16px rgba(200,230,48,0.2)" }
            : { background: "transparent", color: C.text, border: `1.5px solid ${C.border}`, boxShadow: "none" }),
        }}
      >
        Start Free Trial
      </Link>
    </div>
  );
}

/* ── FAQ ──────────────────────────────────────────────── */
const FAQ_ITEMS = [
  { q: "What exactly is Blocwrite?", a: "Blocwrite is a structured writing studio for long-form fiction. It gives you a story bible (Canon), a chapter planner, scene-by-scene drafting in focused blocs, and clean manuscript export. Think of it as the workspace between your outline and your finished book." },
  { q: "Is AI included in the subscription?", a: "No. Blocwrite does not include AI credits or charge for AI usage. You bring your own API key from OpenRouter, Infermatic, or LM Studio. Free models are available on OpenRouter, and LM Studio is completely free (runs locally on your computer). The subscription covers only the studio workspace." },
  { q: "Can I use Blocwrite without AI at all?", a: "Absolutely. Every feature works without AI. You can plan chapters, write prose, manage your Canon, and export manuscripts entirely by hand. AI generation buttons are completely optional — you can toggle them off whenever you like and just use Blocwrite as a structured writing tool." },
  { q: "What is the Canon?", a: "The Canon is your story bible — characters with personalities and speech patterns, locations with sensory details, lore rules, and voice guidelines. When you ask the AI to generate prose, it reads your entire Canon first to stay consistent." },
  { q: "How does the 7-day free trial work?", a: "You get full access to every feature for 7 days. No charge until the trial ends. Cancel anytime during the trial and you will not be billed." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel from your Settings panel inside the app. Your access continues until the end of the current billing period." },
  { q: "Is my writing private?", a: "Yes. Your novels are stored in your own isolated data space. We do not read, train on, or share your content." },
  { q: "What AI models can I use?", a: "Any model available through OpenRouter (including free ones like Llama, Mistral, and Gemma), Infermatic, or a locally hosted model via LM Studio. You choose the model and control the costs." },
];

function FAQ() {
  return (
    <section id="faq" style={{ padding: "100px 0", background: C.bgSoft }}>
      <div style={wrap({ maxWidth: 720 })}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accentText, marginBottom: 14 }}>
            FAQ
          </p>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.035em", margin: 0 }}>
            Common questions.
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {FAQ_ITEMS.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: "22px 0" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          textAlign: "left", fontSize: 16, fontWeight: 600, color: C.text, fontFamily: "inherit",
        }}
      >
        {q}
        <span style={{
          fontSize: 20, color: C.textMuted, transition: "transform 0.2s",
          transform: open ? "rotate(45deg)" : "none",
          flexShrink: 0, marginLeft: 16,
        }}>+</span>
      </button>
      {open && (
        <p style={{ fontSize: 15, lineHeight: 1.65, color: C.textSoft, marginTop: 14, marginBottom: 0 }}>{a}</p>
      )}
    </div>
  );
}

/* ── CTA Banner ───────────────────────────────────────── */
function CTABanner() {
  return (
    <section
      style={{
        padding: "100px 0",
        background: `linear-gradient(135deg, ${C.bgDark}, #1e1e26)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", bottom: "-40%", left: "50%", transform: "translateX(-50%)",
        width: "80%", height: "100%",
        background: "radial-gradient(ellipse, rgba(200,230,48,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ ...wrap(), textAlign: "center", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.035em", color: "#fff", margin: "0 0 18px" }}>
          Ready to write something real?
        </h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", marginBottom: 48, maxWidth: 500, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          Start your 7-day free trial. Connect your AI key (or write without AI). Cancel anytime.
        </p>
        <Link
          href="/subscribe"
          style={{
            ...btnPrimary,
            padding: "16px 40px",
            fontSize: 15,
            background: C.accent,
            color: C.bgDark,
            boxShadow: "0 4px 24px rgba(200,230,48,0.3)",
            borderRadius: 14,
          }}
        >
          Start Free Trial
          <ArrowIcon color={C.bgDark} />
        </Link>
      </div>
    </section>
  );
}

/* ── Footer ───────────────────────────────────────────── */
function Footer() {
  const linkStyle: React.CSSProperties = {
    fontSize: 14, color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.15s",
  };
  return (
    <footer style={{ padding: "52px 0 44px", background: C.bgDark, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ ...wrap(), display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/blocwrite-main-dark.png" alt="Blocwrite" style={{ height: 32, width: "auto", opacity: 0.6 }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>
            &copy; {new Date().getFullYear()} Blocwrite
          </span>
        </div>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {[
            { label: "Terms", href: "/terms" },
            { label: "Refund Policy", href: "/refunds" },
            { label: "Contact", href: "/contact" },
            { label: "Log in", href: "/login" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={linkStyle}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ── Icons ─────────────────────────────────────────────── */
function ArrowIcon({ color = "#fff" }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
