"use client";

import Link from "next/link";
import { useState } from "react";

/* ────────────────────────────────────────────────────────
   Colour palette
   ────────────────────────────────────────────────────── */
const C = {
  bg: "#ffffff",
  bgSoft: "#f6f6f8",
  bgDark: "#0e0e12",
  bgDarkSoft: "#18181e",
  text: "#1a1a1f",
  textSoft: "#5a5d66",
  textMuted: "#9ea0a8",
  border: "#e5e6ea",
  card: "#ffffff",
  accent: "#c8e630",
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
  boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
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

/* ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}>
      <Nav />
      <Hero />
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
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ ...wrap(), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <img src="/blocwrite-main-dark.png" alt="Blocwrite" style={{ height: 64, width: "auto" }} />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ display: "flex", gap: 28 }} className="bw-nav-links">
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

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 500, color: C.textSoft, textDecoration: "none" }}>
              Log in
            </Link>
            <Link href="/subscribe" style={{ ...btnPrimary, padding: "10px 24px", fontSize: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.1)" }}>
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
        padding: "0",
        background: `linear-gradient(180deg, ${C.bgDark} 0%, ${C.bgDarkSoft} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "120%",
          height: "100%",
          background: "radial-gradient(ellipse at center, rgba(200,230,48,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ ...wrap(), textAlign: "center", padding: "80px 28px 72px", position: "relative", zIndex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent, marginBottom: 28 }}>
          Instant Clarity
        </p>

        <h1 style={{ fontSize: "clamp(36px, 5.5vw, 60px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1, margin: "0 auto", maxWidth: 780, color: "#ffffff" }}>
          The writing studio that keeps
          <br />
          <span style={{ color: "rgba(255,255,255,0.45)" }}>your entire novel in focus.</span>
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.65, color: "rgba(255,255,255,0.55)", maxWidth: 600, margin: "28px auto 0" }}>
          Blocwrite is a structured workspace for novelists. Build a story bible, plan every chapter, draft scene-by-scene in focused blocs, and export a clean manuscript. Your AI key powers the assistant — we never charge for AI usage.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 44, flexWrap: "wrap" }}>
          <Link
            href="/subscribe"
            style={{
              ...btnPrimary,
              background: C.accent,
              color: C.bgDark,
              boxShadow: "0 4px 20px rgba(200,230,48,0.25)",
            }}
          >
            Start 7-Day Free Trial
            <ArrowIcon color={C.bgDark} />
          </Link>
          <a
            href="#how-it-works"
            style={{
              ...btnOutline,
              color: "rgba(255,255,255,0.7)",
              borderColor: "rgba(255,255,255,0.15)",
            }}
          >
            See how it works
          </a>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 36, flexWrap: "wrap" }}>
          {["7-day free trial", "Cancel anytime", "Bring your own AI key", "Toggle AI off anytime", "EPUB & DOCX export"].map((t) => (
            <span
              key={t}
              style={{
                display: "inline-block",
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 600,
                color: (t.includes("AI") || t.includes("Toggle")) ? C.accent : "rgba(255,255,255,0.45)",
                background: (t.includes("AI") || t.includes("Toggle")) ? "rgba(200,230,48,0.08)" : "rgba(255,255,255,0.04)",
                borderRadius: 20,
                border: (t.includes("AI") || t.includes("Toggle")) ? "1px solid rgba(200,230,48,0.2)" : "1px solid rgba(255,255,255,0.08)",
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

/* ── AI Banner — make it unmissable ──────────────────── */
function AiBanner() {
  return (
    <section style={{ padding: "0", background: C.bg }}>
      <div style={{
        ...wrap(),
        maxWidth: 900,
        padding: "40px 28px",
      }}>
        <div style={{
          padding: "28px 32px",
          borderRadius: 16,
          background: `linear-gradient(135deg, #1a1a1f 0%, #2a2a32 100%)`,
          border: "1px solid rgba(200,230,48,0.15)",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 24,
          alignItems: "center",
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "rgba(200,230,48,0.1)",
            border: "1px solid rgba(200,230,48,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            flexShrink: 0,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
              Bring Your Own AI Key — we never charge for AI
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.55)", margin: 0 }}>
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

/* ── How It Works — 5 stages ─────────────────────────── */
const STAGES = [
  {
    step: "01",
    title: "Build your Canon",
    subtitle: "Set the rules before you write a word.",
    desc: "The Canon is your story bible — every character, location, piece of lore, and voice rule you define lives here. When you later ask the AI to draft prose, it reads your entire Canon first. That means characters stay in voice, your world stays consistent, and the AI never invents details that contradict your story.",
    details: [
      "Characters: name, personality, secrets, speech patterns, relationships",
      "Locations: physical details, mood, sensory notes, rules",
      "Lore: world rules, magic systems, factions, timelines",
      "Bolt-ons: reusable AI directives like 'write in first person'",
    ],
    color: "#6366f1",
    screenshot: "/screenshots/canon.png",
  },
  {
    step: "02",
    title: "Plan your chapters",
    subtitle: "One-click outline, then refine.",
    desc: "Hit Generate and Blocwrite builds a structured chapter plan from your synopsis and Canon. Each chapter gets a title, a detailed synopsis (not a vague blurb — real plot beats, named characters, specific locations), and linked entities. You can regenerate any chapter individually, adjust pacing, and add or remove chapters manually. When you are happy, sync the plan to your manuscript.",
    details: [
      "AI generates all chapters in one batch call — fast",
      "Each synopsis names characters, locations, and events",
      "Pacing control: slow-burn, balanced, or fast",
      "Chapters know what comes before and after them",
    ],
    color: "#f59e0b",
    screenshot: "/screenshots/plan.png",
  },
  {
    step: "03",
    title: "Draft in focused blocs",
    subtitle: "Small chunks. No drift.",
    desc: "Each chapter splits into 3-4 scene blocs, each targeting 400-1000 words. When you generate prose for a bloc, the AI gets the chapter synopsis, the Canon, what happened in the previous bloc, and any bolt-on directives you have attached. Because each chunk is small and tightly scoped, the AI produces coherent prose that actually follows your plan instead of going off on tangents.",
    details: [
      "3-4 blocs per chapter with individual synopses",
      "Word targets keep each scene the right length",
      "Bolt-ons: reusable AI directives for precise control",
      "AI reads the Canon + chapter context for every generation",
    ],
    color: "#10b981",
    screenshot: "/screenshots/blocs.png",
  },
  {
    step: "04",
    title: "Polish with The Editor",
    subtitle: "Professional chapter-level editing.",
    desc: "When your draft is written, run The Editor over any chapter. It enhances prose quality, catches inconsistencies with your Canon, and checks continuity across scenes — all while respecting your voice and story. Only changed paragraphs are returned, so it is fast and safe. Think of it as a careful second pass that never rewrites your intent.",
    details: [
      "Prose quality check and enhancement",
      "Scene and place consistency verification",
      "Respects your voice — only touches what needs fixing",
      "Returns only changed paragraphs for speed",
    ],
    color: "#8b5cf6",
    screenshot: "/screenshots/editor.png",
  },
  {
    step: "05",
    title: "Export your manuscript",
    subtitle: "Prose only. Your words, your file.",
    desc: "When you are ready, export your novel as a professionally formatted EPUB or DOCX. The export strips out all planning notes, synopses, and AI metadata. What you get is clean, chaptered prose — ready to send to agents, share with beta readers, or upload for self-publishing. No cleanup required.",
    details: [
      "EPUB format for e-readers and digital distribution",
      "DOCX format for agents and traditional submission",
      "Select which chapters to include",
      "Zero metadata clutter in the output",
    ],
    color: "#ec4899",
    screenshot: "/screenshots/export.png",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: "72px 0 80px" }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.accent, marginBottom: 12 }}>
            HOW IT WORKS
          </p>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
            From idea to finished manuscript.
          </h2>
          <p style={{ fontSize: 16, color: C.textSoft, maxWidth: 520, margin: "0 auto" }}>
            Four stages. Each one feeds the next. Your Canon stays in control throughout.
          </p>
        </div>

        <div style={{ display: "grid", gap: 48 }}>
          {STAGES.map((s, i) => (
            <div
              key={s.step}
              style={{
                display: "grid",
                gridTemplateColumns: i % 2 === 0 ? "1fr 1fr" : "1fr 1fr",
                gap: 48,
                alignItems: "start",
              }}
            >
              <div style={{ order: i % 2 === 0 ? 1 : 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: `${s.color}12`,
                    border: `1px solid ${s.color}25`,
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

                <h3 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.2, margin: "0 0 14px" }}>
                  {s.subtitle}
                </h3>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: C.textSoft, margin: "0 0 20px" }}>
                  {s.desc}
                </p>
              </div>

              <div style={{ order: i % 2 === 0 ? 2 : 1, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Screenshot */}
                <div style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                  background: C.bgSoft,
                }}>
                  <img
                    src={s.screenshot}
                    alt={`${s.title} screenshot`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>

                {/* Detail pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.details.map((d) => (
                    <span
                      key={d}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
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
    desc: "Use OpenRouter (free models available), Infermatic, or LM Studio. We never charge for AI. You control the model and the cost. Don't want AI? Toggle it off and write entirely by hand.",
    color: "#c8e630",
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
    <section id="features" style={{ padding: "80px 0", background: C.bgSoft }}>
      <div style={wrap()}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.accent, marginBottom: 12 }}>
            FEATURES
          </p>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
            Everything you need to finish a novel.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                padding: 28,
                borderRadius: 18,
                border: `1px solid ${C.border}`,
                background: C.card,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `${f.color}10`,
                  border: `1px solid ${f.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: f.color,
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 18, marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: C.textSoft, margin: 0 }}>{f.desc}</p>
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
    <section id="pricing" style={{ padding: "88px 0" }}>
      <div style={wrap({ textAlign: "center" })}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.accent, marginBottom: 12 }}>
          PRICING
        </p>
        <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
          Studio access. No AI fees.
        </h2>
        <p style={{ fontSize: 16, color: C.textSoft, marginBottom: 12 }}>
          The subscription covers the workspace. AI costs are yours to manage with your own API key.
        </p>
        <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 48 }}>
          Start with a 7-day free trial. Cancel anytime.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 700, margin: "0 auto" }}>
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

        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 28, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
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
        padding: 32,
        borderRadius: 20,
        border: highlighted ? `2px solid ${C.text}` : `1px solid ${C.border}`,
        background: C.card,
        textAlign: "left",
        position: "relative",
        boxShadow: highlighted ? "0 8px 40px rgba(0,0,0,0.08)" : "none",
      }}
    >
      {badge && (
        <span style={{
          position: "absolute", top: 16, right: 16,
          padding: "5px 14px", fontSize: 11, fontWeight: 700, borderRadius: 10,
          background: C.accent, color: C.bgDark,
        }}>
          {badge}
        </span>
      )}
      <p style={{ fontSize: 14, fontWeight: 600, color: C.textSoft, marginBottom: 8 }}>{name}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-0.03em" }}>{price}</span>
        <span style={{ fontSize: 14, color: C.textMuted }}>/ {period}</span>
      </div>
      <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4, marginBottom: 24 }}>7-day free trial included</p>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px" }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.textSoft, padding: "5px 0" }}>
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
          padding: "13px 0",
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
    <section id="faq" style={{ padding: "88px 0", background: C.bgSoft }}>
      <div style={wrap({ maxWidth: 720 })}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.accent, marginBottom: 12 }}>
            FAQ
          </p>
          <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
            Common questions.
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: "20px 0" }}>
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
        <span style={{ fontSize: 20, color: C.textMuted, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      {open && (
        <p style={{ fontSize: 15, lineHeight: 1.6, color: C.textSoft, marginTop: 12, marginBottom: 0 }}>{a}</p>
      )}
    </div>
  );
}

/* ── CTA Banner ───────────────────────────────────────── */
function CTABanner() {
  return (
    <section
      style={{
        padding: "88px 0",
        background: `linear-gradient(135deg, ${C.bgDark}, ${C.bgDarkSoft})`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", bottom: "-40%", left: "50%", transform: "translateX(-50%)",
        width: "80%", height: "100%",
        background: "radial-gradient(ellipse, rgba(200,230,48,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ ...wrap(), textAlign: "center", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", margin: "0 0 16px" }}>
          Ready to write something real?
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 40, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          Start your 7-day free trial. Connect your AI key (or write without AI). Cancel anytime.
        </p>
        <Link
          href="/subscribe"
          style={{
            ...btnPrimary,
            background: C.accent,
            color: C.bgDark,
            boxShadow: "0 4px 20px rgba(200,230,48,0.25)",
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
    fontSize: 14, color: "rgba(255,255,255,0.45)", textDecoration: "none", transition: "color 0.15s",
  };
  return (
    <footer style={{ padding: "48px 0 40px", background: C.bgDark, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ ...wrap(), display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/blocwrite-main-dark.png" alt="Blocwrite" style={{ height: 28, width: "auto", opacity: 0.7 }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
            &copy; {new Date().getFullYear()} Blocwrite
          </span>
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
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
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
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
