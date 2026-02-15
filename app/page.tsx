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
      <AdvancedFeatures />
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
        background: "rgba(20,20,24,0.95)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ ...wrap(), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 36, width: "auto", display: "block" }} />
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
                style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.6)", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
              >
                {l.label}
              </a>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
              Log in
            </Link>
            <Link href="/subscribe" style={{ ...btnPrimary, padding: "10px 24px", fontSize: 13, borderRadius: 12, background: C.accent, color: C.text, boxShadow: "none" }}>
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
          Write Smarter. Finish Faster.
        </p>

        <h1 style={{
          fontSize: "clamp(38px, 5.5vw, 64px)",
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1.08,
          margin: "0 auto",
          maxWidth: 840,
          color: "#ffffff",
        }}>
          The AI-powered writing studio
          <br />
          <span style={{ color: "rgba(255,255,255,0.35)" }}>that actually knows your story.</span>
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.7, color: "rgba(255,255,255,0.5)", maxWidth: 620, margin: "32px auto 0" }}>
          Blocwrite gives you a Canon-aware workspace to plan, draft, edit, and export your novel — with AI that reads your characters, locations, lore, and plot before it writes a single word. Chat with your characters, get line-by-line editing suggestions, and shape every generation with reusable bolt-on directives.
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
          {["Canon-aware AI drafting", "Talk to your characters", "Line-by-line editing", "AI Co-Author chat", "Writing Packs & Bolt-Ons", "EPUB & DOCX export", "Bring your own AI key", "Toggle AI on or off"].map((t) => (
            <span
              key={t}
              style={{
                display: "inline-block",
                padding: "7px 18px",
                fontSize: 12,
                fontWeight: 600,
                color: C.accent,
                background: "rgba(200,230,48,0.08)",
                borderRadius: 20,
                border: "1px solid rgba(200,230,48,0.18)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Trust bar — social proof strip ───────────────────── */
function TrustBar() {
  const items: { icon: React.ReactNode; headline: string; sub: string }[] = [
    {
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
      headline: "Try free for 7 days",
      sub: "Full studio access — every feature unlocked",
    },
    {
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>,
      headline: "You own your AI key",
      sub: "Connect OpenRouter, Hugging Face, Infermatic, or LM Studio — we never charge for AI",
    },
    {
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
      headline: "Your work stays yours",
      sub: "Private projects, no training on your data, API keys stored locally",
    },
    {
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
      headline: "Publish-ready export",
      sub: "EPUB & DOCX — clean chaptered prose, zero AI metadata",
    },
  ];
  return (
    <div style={{ background: C.bg, padding: "36px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
      <div style={{ ...wrap(), display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
        {items.map((s) => (
          <div key={s.headline} style={{ textAlign: "center", padding: "0 8px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>{s.icon}</div>
            <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", margin: 0, color: C.text }}>{s.headline}</p>
            <p style={{ fontSize: 13, fontWeight: 400, color: C.textMuted, margin: "6px 0 0", lineHeight: 1.5 }}>{s.sub}</p>
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
              <strong style={{ color: "rgba(255,255,255,0.8)" }}>Hugging Face</strong>,{" "}
              <strong style={{ color: "rgba(255,255,255,0.8)" }}>Infermatic</strong>, or{" "}
              <strong style={{ color: "rgba(255,255,255,0.8)" }}>LM Studio</strong> (local, 100% free). You choose your model, you control your costs. Don&apos;t want AI? Toggle it off — every feature works without it. The subscription covers the studio workspace only.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── How It Works — 8 stages ─────────────────────────── */
const STAGES = [
  {
    step: "01",
    title: "Your writing studio",
    subtitle: "All your novels in one place.",
    desc: "Your home screen shows every novel at a glance — word counts, chapter progress, characters, and reading time. Create a new project in one click and dive straight in. Everything autosaves as you work. Dark and light themes built in.",
    details: [
      "Novel dashboard with live word stats",
      "One-click project creation",
      "Track chapters, characters, locations, and lore",
      "Goal progress bar keeps you motivated",
    ],
    color: "#6366f1",
    screenshot: "/screenshots/studio.png?v=2",
  },
  {
    step: "02",
    title: "Build your Canon",
    subtitle: "Set the rules before you write a word.",
    desc: "The Canon is your story bible — every character, location, piece of lore, and voice rule you define lives here. When the AI drafts prose, it reads your entire Canon first. Characters stay in voice, your world stays consistent, and the AI never invents details that contradict your story.",
    details: [
      "Characters: name, personality, secrets, speech patterns",
      "Locations: physical details, mood, sensory notes",
      "Lore: world rules, magic systems, factions, timelines",
      "Synopsis with AI-powered clarity and trimming tools",
    ],
    color: "#f59e0b",
    screenshot: "/screenshots/overview.png?v=2",
  },
  {
    step: "03",
    title: "Steer the AI with Bolt-Ons",
    subtitle: "Reusable plugins that shape every generation.",
    desc: "Bolt-ons are short directives you write in plain English — 'keep it gritty', 'more dialogue', 'Yorkshire dialect'. Blocwrite turns them into focused AI prompts. Attach a bolt-on to a chapter or individual bloc and every generation respects your instruction. Browse pre-made Writing Packs for genre-specific kits — Romance Plot Kit, Fantasy World Builder, Thriller Dialogue Engine — and install them in one click.",
    details: [
      "Quick-add categories: voice, pacing, emotion, plot",
      "AI builds a focused prompt from your instruction",
      "Attach per-chapter or per-bloc",
      "Pre-made Writing Packs for every genre",
    ],
    color: "#10b981",
    screenshot: "/screenshots/boltons.png?v=2",
  },
  {
    step: "04",
    title: "Plan your chapters",
    subtitle: "One-click outline, then refine.",
    desc: "Hit Generate and Blocwrite builds a structured chapter plan from your synopsis and Canon. Each chapter gets a title, a detailed synopsis with real plot beats, named characters, and specific locations. Rearrange, add, or remove chapters. When you're ready, sync the plan to your manuscript.",
    details: [
      "AI generates all chapters in one batch",
      "Each synopsis names characters and locations",
      "Pacing control: slow-burn, balanced, or fast",
      "Chapters know what comes before and after",
    ],
    color: "#8b5cf6",
    screenshot: "/screenshots/plan.png?v=2",
  },
  {
    step: "05",
    title: "Draft in focused blocs",
    subtitle: "Small chunks. No drift.",
    desc: "Each chapter splits into 3-4 scene blocs, each targeting 400-1000 words. The AI gets the chapter synopsis, the Canon, any bolt-on directives, and the surrounding context. Because each chunk is small and tightly scoped, the prose stays coherent and follows your plan instead of going off on tangents. A full formatting toolbar gives you bold, italic, underline, strikethrough, headings, text alignment, and section breaks.",
    details: [
      "3-4 blocs per chapter with synopses",
      "Word targets: 400, 600, 800, 1000 or best-fit",
      "Bolt-ons for precise AI control per-bloc",
      "Full prose formatting toolbar",
    ],
    color: "#ec4899",
    screenshot: "/screenshots/blocs.png?v=2",
  },
  {
    step: "06",
    title: "Chat with your characters",
    subtitle: "Interview them. Let them shape the story.",
    desc: "Open a live AI conversation with any character from your Canon — ask about their fears, secrets, motivations, and backstory. The AI responds in character based on their profile. When you're done, press End & Review and the AI analyses the conversation and recommends changes to chapter synopses and character profiles. Accept or dismiss each one. Even characters with just a name can be chatted with — the AI will help you discover who they are.",
    details: [
      "Live AI chat with any character",
      "AI stays in character using their Canon profile",
      "End & Review recommends story changes",
      "Accept or reject each recommendation",
    ],
    color: "#fb923c",
    screenshot: "/screenshots/canon.png?v=2",
  },
  {
    step: "07",
    title: "Ask your Co-Author",
    subtitle: "An AI writing partner that knows your whole story.",
    desc: "The Co-Author is an AI chat that lives alongside your character conversations. Ask it anything — 'What's the emotional arc of chapter 3?', 'Does this scene contradict the lore?', 'How should I open the climax?' It reads your Canon, your chapter content, and your plan to give answers that are specific to your novel, not generic writing advice.",
    details: [
      "Ask questions about any chapter or the whole story",
      "AI reads your Canon + prose for every answer",
      "Always available, even with no characters",
      "Switch between Co-Author and character chats instantly",
    ],
    color: "#06b6d4",
    screenshot: "/screenshots/editor.png?v=2",
  },
  {
    step: "08",
    title: "Polish with The Editor",
    subtitle: "Line-by-line editing, not blind rewrites.",
    desc: "The Editor adapts to where you are. Inside a chapter, it runs ThreadKeeper continuity checks, grammar passes, and prose polish — showing you before and after for every paragraph. In the novel overview, it scans your entire manuscript and suggests specific sentence-level rewrites across every chapter, showing you the current text and the suggested replacement side by side. Accept, dismiss, or accept all — then apply with one click.",
    details: [
      "Chapter mode: ThreadKeeper, Grammar, Polish",
      "Overview mode: full-manuscript sentence-level edits",
      "Before/after diff for every suggestion",
      "One button — context switches automatically",
    ],
    color: "#6366f1",
    screenshot: "/screenshots/editor.png?v=2",
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
          <p style={{ fontSize: 17, color: C.textSoft, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
            Eight stages. Each one feeds the next. Your Canon stays in control throughout.
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
    desc: "Characters, locations, lore, and voice rules. Every AI generation reads your Canon first so nothing drifts from your story. The Canon is the single source of truth.",
    color: "#6366f1",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  },
  {
    title: "Chapters that know their context",
    desc: "Each chapter reads the one before and after it. The AI never writes in isolation — your story flows as one continuous narrative with no contradictions.",
    color: "#f59e0b",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  },
  {
    title: "Bolt-Ons & Writing Packs",
    desc: "Reusable AI directives like 'write in first person' or 'focus on dialogue'. Attach them per-chapter or per-bloc. Browse genre-specific Writing Packs and install craft kits in one click.",
    color: "#10b981",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2m0 2v2m0-2h-4.5M3 10v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9H3z" /><path d="M3 10l2-6h14l2 6" /></svg>,
  },
  {
    title: "Bring your own AI — or don't",
    desc: "Use OpenRouter, Hugging Face, Infermatic, or LM Studio (local, free). We never charge for AI. Toggle it off entirely and write by hand — every feature still works.",
    color: "#4d6a00",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  },
  {
    title: "Your data stays private",
    desc: "Novels are stored in your own isolated data space. API keys live in your browser, not our servers. We never read, share, or train on your writing.",
    color: "#8b5cf6",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  },
  {
    title: "Clean EPUB & DOCX export",
    desc: "Export prose-only manuscripts. No AI notes, no planning data, no metadata. Just chaptered prose ready for agents, publishers, or self-publishing platforms.",
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
            CORE FEATURES
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

/* ── Advanced Features (Intelligence Layer) ────────────── */
const ADVANCED_FEATURES = [
  {
    title: "Talk to Your Characters",
    desc: "Interview any character from your Canon in a live AI chat. Ask about their fears, secrets, and motivations — the AI responds in character. Press \"End & Review\" and the AI recommends changes to chapter synopses and character profiles based on what was revealed. Even a name-only character can be explored — the AI helps you discover who they are.",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    color: "#fb923c",
  },
  {
    title: "AI Co-Author",
    desc: "A writing partner that knows your entire novel. Ask it anything — 'How should I open the climax?', 'Does this scene work?', 'What's missing from this chapter?' It reads your Canon and chapter prose to give answers specific to your story. Always available alongside character chats, even with no characters created.",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    color: "#06b6d4",
    badge: "New",
  },
  {
    title: "The Editor — Chapter Mode",
    desc: "Inside any chapter, The Editor runs three passes: ThreadKeeper checks continuity against your Canon and adjacent chapters, Grammar catches sentence-level issues, and Polish elevates prose quality. Every change shows a before/after comparison so you accept or reject individually. Nothing changes without your approval.",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    color: "#a3e635",
    badge: "Upgraded",
  },
  {
    title: "The Editor — Manuscript Mode",
    desc: "From the novel overview, The Editor scans every chapter and suggests specific sentence-level rewrites across your entire manuscript. Each suggestion shows the exact current text alongside the proposed replacement, with a reason why. Accept or dismiss each one, then apply all accepted edits to your chapters with one click.",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    color: "#8b5cf6",
    badge: "New",
  },
  {
    title: "Smart Rewrite Modes",
    desc: "Highlight any text in the prose area or inside a bloc and instantly rewrite it in 6 modes: more emotional, suspenseful, poetic, tighter, bestseller tone, or prose polish. Preview changes before accepting. Works on selections or across an entire chapter with one click.",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    color: "#f472b6",
  },
  {
    title: "Writing Packs Marketplace",
    desc: "Pre-made genre kits built by experienced writers — Romance Plot Kit, Fantasy World Builder, Thriller Dialogue Engine, and more. Browse packs, install individual bolt-ons or the whole set. Available directly from the chapter and bloc toolbar so you never leave your writing flow.",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    color: "#0ea5e9",
  },
  {
    title: "ThreadKeeper Continuity Engine",
    desc: "Catches inconsistencies across your story before readers do. Checks character details, location descriptions, timeline accuracy, Canon compliance, and scene-to-scene continuity. Uses layered checking — quick deterministic scans first, then deeper AI analysis when needed.",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "#ef4444",
  },
  {
    title: "Shareable Manuscripts",
    desc: "Generate a time-limited shareable link for beta readers or editors. They read your manuscript in a clean, distraction-free view and can leave annotations and feedback. Set expiry dates and manage access — all without giving away your source files.",
    icon: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
    color: "#64748b",
  },
  {
    title: "Bloc-Based Story Architecture",
    desc: "Structure every chapter as a sequence of scene blocs — each with its own synopsis, bolt-on directive, and word target. Generate prose per-scene or write freely in the prose area. Toggle blocs off and write as a single continuous chapter whenever you want.",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    color: "#a78bfa",
  },
  {
    title: "Full Prose Formatting",
    desc: "A proper writing toolbar with bold, italic, underline, strikethrough, text alignment (left, centre, right, justify), heading insertion, and section breaks. Format your prose exactly how you want it — your formatting carries through to export.",
    icon: "M11 5l-7 7 7 7M17 5l-7 7 7 7",
    color: "#10b981",
  },
];

function AdvancedFeatures() {
  return (
    <section style={{ padding: "96px 0" }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.accentText, marginBottom: 14 }}>
            INTELLIGENCE LAYER
          </p>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.035em", margin: "0 0 12px" }}>
            Features no other writing tool offers.
          </h2>
          <p style={{ fontSize: 17, color: C.textSoft, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
            Every feature works with your Canon — keeping your story consistent, intentional, and publishable.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {ADVANCED_FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                padding: "24px 28px",
                borderRadius: 16,
                border: `1px solid ${C.border}`,
                background: C.card,
                display: "flex", gap: 16, alignItems: "flex-start",
                transition: "box-shadow 0.25s, transform 0.25s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.06)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = f.color + "44";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = C.border;
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `${f.color}10`, border: `1.5px solid ${f.color}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon}/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{f.title}</h3>
                  {"badge" in f && f.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                      padding: "2px 7px", borderRadius: 6,
                      background: `${f.color}18`, color: f.color,
                      border: `1px solid ${f.color}30`,
                    }}>{f.badge}</span>
                  )}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: C.textSoft, margin: 0 }}>{f.desc}</p>
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
          Every plan includes a 7-day free trial. Cancel anytime — no lock-in.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 720, margin: "0 auto" }}>
          <PriceCard
            name="Monthly"
            price="£12.99"
            period="month"
            badge={null}
            features={["Full studio access", "Unlimited novels & chapters", "Canon, Plan, Blocs, Export", "The Editor, Co-Author, Character Chat", "Bolt-Ons & Writing Packs", "Bring your own AI key", "Cancel anytime"]}
          />
          <PriceCard
            name="Annual"
            price="£99"
            period="year"
            badge="Save 36%"
            features={["Everything in Monthly", "Billed annually", "Works out to £8.25/mo", "Priority consideration for new features", "Cancel anytime"]}
            highlighted
          />
        </div>

        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 32, maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          AI usage is not included or billed by Blocwrite. You connect your own key from OpenRouter, Infermatic, Hugging Face, or LM Studio. Free AI models are available on OpenRouter and LM Studio is completely free.
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
          background: C.accent,
          color: C.bgDark,
          fontWeight: 700,
          boxShadow: highlighted ? "0 4px 16px rgba(200,230,48,0.25)" : "0 2px 8px rgba(200,230,48,0.12)",
        }}
      >
        Start Free Trial
      </Link>
    </div>
  );
}

/* ── FAQ ──────────────────────────────────────────────── */
const FAQ_ITEMS = [
  { q: "What exactly is Blocwrite?", a: "Blocwrite is a structured writing studio for long-form fiction. It gives you a story bible (Canon), a chapter planner, scene-by-scene drafting in focused blocs, AI character chat, an AI Co-Author, a smart editor that adapts to chapter or manuscript level, rewrite tools, bolt-on directives, writing packs, beta reader sharing, and clean EPUB/DOCX export. Think of it as the workspace between your outline and your finished book." },
  { q: "Is AI included in the subscription?", a: "No. Blocwrite does not include AI credits or charge for AI usage. You bring your own API key from OpenRouter, Infermatic, Hugging Face, or LM Studio. Free models are available on OpenRouter, and LM Studio is completely free (runs locally on your computer). The subscription covers the studio workspace and all its tools." },
  { q: "Can I use Blocwrite without AI at all?", a: "Absolutely. Every core feature works without AI — plan chapters, write prose, manage your Canon, format text, and export manuscripts entirely by hand. AI features like prose generation, smart rewrite, character chat, and The Editor are completely optional. Toggle AI off globally and still use the full writing environment." },
  { q: "What is the Canon?", a: "The Canon is your story bible — characters with personalities, speech patterns, goals, and secrets; locations with sensory details; lore rules; timeline events; and voice guidelines. Every AI feature reads your Canon first to stay consistent with your world. It's the single source of truth for your novel." },
  { q: "What does 'Talk to Your Characters' do?", a: "You can have a live AI conversation with any character from your Canon. Ask about their fears, motivations, or backstory — the AI responds in character based on their profile. Even characters with just a name can be explored. When you press 'End & Review', the AI analyses the conversation and recommends changes to future chapter synopses or character profiles. You accept or dismiss each recommendation individually." },
  { q: "What is the AI Co-Author?", a: "The Co-Author is an AI chat that sits alongside your character conversations. You can ask it anything about your story — 'Does this scene contradict the lore?', 'How should I open the climax?', 'What's missing from chapter 5?' It reads your Canon and chapter content to give novel-specific answers, not generic writing advice. It's always available, even if you haven't created any characters yet." },
  { q: "How does The Editor work?", a: "The Editor is one button that adapts to your context. Inside a chapter, it runs three passes: ThreadKeeper (continuity checking against your Canon), Grammar (sentence-level fixes), and Polish (prose quality improvements). In the novel overview, it scans your entire manuscript and suggests specific sentence-level rewrites across every chapter — showing you the current text and the proposed change side by side. You accept or dismiss each suggestion, then apply all accepted edits with one click." },
  { q: "What are Smart Rewrite modes?", a: "Highlight any text and rewrite it instantly in 6 modes: more emotional, suspenseful, poetic, tighter, bestseller tone, or prose polish. You can also rewrite an entire chapter in one click. It works in both the prose area and inside individual blocs." },
  { q: "What are Writing Packs?", a: "Pre-built genre-specific collections of bolt-on writing directives — like the Romance Plot Kit, Fantasy World Builder, or Thriller Dialogue Engine. Browse packs, select individual bolt-ons or install the whole set. Available right from the chapter and bloc toolbar, so you can install and apply them without leaving your writing flow." },
  { q: "Can I share my manuscript with beta readers?", a: "Yes. Generate a time-limited shareable link and send it to anyone. They'll see your manuscript in a clean reading view and can leave annotations and feedback. You control the expiry date and can revoke access at any time." },
  { q: "How does the 7-day free trial work?", a: "You get full access to every feature for 7 days — including The Editor, Co-Author, character chat, smart rewrite, bolt-ons, writing packs, and all analysis tools. No charge until the trial ends. Cancel anytime during the trial and you won't be billed." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel from your Settings panel inside the app. Your access continues until the end of the current billing period." },
  { q: "Is my writing private?", a: "Yes. Your novels are stored in your own isolated data space. We do not read, train on, or share your content. AI API keys are stored locally in your browser, not on our servers. When you use AI features, data is sent to your chosen AI provider — review their privacy policy for details." },
  { q: "What AI models can I use?", a: "Any model available through OpenRouter (including free ones like Llama, Mistral, and Gemma), Infermatic, Hugging Face, or a locally hosted model via LM Studio. You choose the model and control the costs." },
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
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", marginBottom: 48, maxWidth: 540, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          Plan your story, draft scene by scene, chat with your characters, polish with The Editor, and export a clean manuscript. Start your free trial today.
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
          <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 32, width: "auto", opacity: 0.6 }} />
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
