"use client";

import Link from "next/link";
import { useState } from "react";

/* ────────────────────────────────────────────────────────
   Colour palette — light premium (Apple-inspired)
   ────────────────────────────────────────────────────── */
const C = {
  bg: "#ffffff",
  bgSoft: "#f8f8fa",
  bgDark: "#1a1a1f",
  text: "#1a1a1f",
  textSoft: "#64666d",
  textMuted: "#9ea0a8",
  border: "#e5e6ea",
  card: "#ffffff",
  btnBg: "linear-gradient(135deg, #2a2a30, #1a1a1f)",
  btnText: "#ffffff",
  btnOutline: "#1a1a1f",
};

/* ── Shared inline helpers ──────────────────────────────── */
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
  padding: "14px 32px",
  fontSize: 15,
  fontWeight: 600,
  color: C.btnText,
  background: C.btnBg,
  border: "none",
  borderRadius: 14,
  cursor: "pointer",
  textDecoration: "none",
  transition: "opacity 0.15s",
};

const btnOutline: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "14px 32px",
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

/* ════════════════════════════════════════════════════════════
   Landing Page
   ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}>
      <Nav />
      <Hero />
      <ProductShowcase />
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
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ ...wrap(), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 28px" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <img src="/blocwrite-full-light.png" alt="Blocwrite" style={{ height: 32, width: "auto" }} />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ display: "flex", gap: 28 }} className="bw-nav-links">
            {[
              { label: "Product", href: "#product" },
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
            <Link href="/subscribe" style={{ ...btnPrimary, padding: "10px 24px", fontSize: 14 }}>
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
    <section style={{ padding: "100px 0 80px", textAlign: "center" }}>
      <div style={wrap()}>
        <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMuted, marginBottom: 20 }}>
          Canon-aware writing studio
        </p>

        <h1 style={{ fontSize: "clamp(36px, 5.5vw, 64px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.08, margin: "0 auto", maxWidth: 720 }}>
          Write like you mean it.
          <br />
          <span style={{ color: C.textSoft }}>Without losing the thread.</span>
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.6, color: C.textSoft, maxWidth: 540, margin: "24px auto 0" }}>
          Plan chapters, lock your Canon, draft scene-by-scene, and export clean prose. A modern studio for long-form fiction.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 40, flexWrap: "wrap" }}>
          <Link href="/subscribe" style={btnPrimary}>
            Start Free Trial
            <ArrowIcon />
          </Link>
          <a href="#product" style={btnOutline}>
            See how it works
          </a>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 40, flexWrap: "wrap" }}>
          {["7-day free trial", "Cancel anytime", "EPUB & DOCX export"].map((t) => (
            <span
              key={t}
              style={{
                display: "inline-block",
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 600,
                color: C.textSoft,
                background: C.bgSoft,
                borderRadius: 20,
                border: `1px solid ${C.border}`,
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

/* ── Product Showcase ─────────────────────────────────── */
const PRODUCTS = [
  {
    eyebrow: "CANON",
    title: "Your story bible, always in reach.",
    desc: "Characters, locations, lore, style rules. Set your constraints once and keep every chapter consistent. The AI reads your Canon before generating a single word.",
    pills: ["Characters with voice + secrets", "Location details", "Lore constraints", "Genre & tone"],
  },
  {
    eyebrow: "THE PLAN",
    title: "Outline fast. Expand when ready.",
    desc: "Generate a full chapter outline in one shot, then drill into detailed synopses with linked characters, locations, and events. Every chapter knows where it sits in the arc.",
    pills: ["One-shot plan generation", "Synopsis to chapters", "Entity linking", "Pacing control"],
  },
  {
    eyebrow: "BLOCKS",
    title: "Draft scenes like building blocks.",
    desc: "Each chapter splits into focused scene blocs with word targets, style presets, and bolt-on directives. Write 400-1000 words at a time so the AI never drifts off course.",
    pills: ["400-1000 word targets", "Style presets", "Bolt-on plugins", "Focus mode"],
  },
  {
    eyebrow: "EXPORT",
    title: "Clean exports. Your words, your file.",
    desc: "When you are ready, export your novel as a professionally formatted EPUB or DOCX. Prose only, no metadata clutter. Ready for agents, beta readers, or self-publishing.",
    pills: ["EPUB export", "DOCX export", "Prose-only output", "Chapter selection"],
  },
];

function ProductShowcase() {
  return (
    <section id="product" style={{ padding: "40px 0 60px" }}>
      {PRODUCTS.map((p, i) => (
        <div
          key={p.eyebrow}
          style={{
            padding: "60px 0",
            background: i % 2 === 1 ? C.bgSoft : C.bg,
          }}
        >
          <div style={{ ...wrap(), display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
            {/* Text side */}
            <div style={{ order: i % 2 === 1 ? 2 : 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 12 }}>
                {p.eyebrow}
              </p>
              <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15, margin: 0 }}>
                {p.title}
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: C.textSoft, marginTop: 16 }}>
                {p.desc}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
                {p.pills.map((pill) => (
                  <span
                    key={pill}
                    style={{
                      padding: "5px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.textSoft,
                      background: i % 2 === 1 ? C.bg : C.bgSoft,
                      borderRadius: 16,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            {/* Screenshot placeholder */}
            <div
              style={{
                order: i % 2 === 1 ? 1 : 2,
                aspectRatio: "4/3",
                borderRadius: 20,
                border: `1px solid ${C.border}`,
                background: i % 2 === 1 ? C.bg : C.bgSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div style={{ textAlign: "center", padding: 32 }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.15 }}>
                  {["🏛️", "📐", "🧱", "📦"][i]}
                </div>
                <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>
                  Screenshot placeholder
                </p>
                <p style={{ fontSize: 11, color: C.textMuted, opacity: 0.7, marginTop: 4 }}>
                  Drop your image into /public/assets/
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ── Feature Grid ─────────────────────────────────────── */
const FEATURES = [
  {
    title: "Canon-aware consistency",
    desc: "Every generation reads your story bible first. Characters stay in voice, lore rules are respected, and continuity holds across chapters.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Plan to manuscript sync",
    desc: "Chapter synopses stay linked to your outline. Change the plan and the manuscript structure follows. No manual bookkeeping.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    title: "Scene bloc drafting",
    desc: "Break chapters into focused 400-1000 word blocs. Each bloc has its own synopsis and word target so the AI stays on track.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 4V2m0 2v2m0-2h-4.5M3 10v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9H3z" /><path d="M3 10l2-6h14l2 6" />
      </svg>
    ),
  },
  {
    title: "Story bible that scales",
    desc: "Characters, locations, lore entries, timelines, factions. Add as much depth as you need and the AI will reference it all.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    title: "Provider-agnostic AI",
    desc: "Connect OpenRouter, Infermatic, or your own local LM Studio. Use free models or premium ones. Your API key, your choice.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    title: "Clean exports",
    desc: "Export your finished novel as EPUB or DOCX. Prose-only output with no AI metadata, no planning notes. Just your words.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

function FeatureGrid() {
  return (
    <section id="features" style={{ padding: "80px 0", background: C.bgSoft }}>
      <div style={wrap()}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 12 }}>
          FEATURES
        </p>
        <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 48px" }}>
          Built for long sessions.
        </h2>

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
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: C.bgSoft,
                  border: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.text,
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
    <section id="pricing" style={{ padding: "80px 0" }}>
      <div style={wrap({ textAlign: "center" })}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 12 }}>
          PRICING
        </p>
        <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
          One subscription. Full access.
        </h2>
        <p style={{ fontSize: 16, color: C.textSoft, marginBottom: 48 }}>
          Start with a 7-day free trial. Cancel anytime.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 680, margin: "0 auto" }}>
          {/* Monthly */}
          <PriceCard
            name="Monthly"
            price="£12.99"
            period="month"
            badge={null}
            features={["Full studio access", "Unlimited chapters", "All AI features", "EPUB + DOCX export", "Cancel anytime"]}
          />
          {/* Annual */}
          <PriceCard
            name="Annual"
            price="£99"
            period="year"
            badge="Save 36%"
            features={["Everything in Monthly", "Billed annually", "Works out to £8.25/mo", "Priority consideration", "Cancel anytime"]}
            highlighted
          />
        </div>
      </div>
    </section>
  );
}

function PriceCard({
  name,
  price,
  period,
  badge,
  features,
  highlighted,
}: {
  name: string;
  price: string;
  period: string;
  badge: string | null;
  features: string[];
  highlighted?: boolean;
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
      }}
    >
      {badge && (
        <span
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            padding: "4px 12px",
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 10,
            background: C.bgDark,
            color: C.btnText,
          }}
        >
          {badge}
        </span>
      )}
      <p style={{ fontSize: 14, fontWeight: 600, color: C.textSoft, marginBottom: 8 }}>{name}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em" }}>{price}</span>
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
          ...(highlighted ? {} : { background: "transparent", color: C.text, border: `1.5px solid ${C.border}` }),
        }}
      >
        Start Free Trial
      </Link>
    </div>
  );
}

/* ── FAQ ──────────────────────────────────────────────── */
const FAQ_ITEMS = [
  { q: "What is Blocwrite?", a: "Blocwrite is a modern writing studio for long-form fiction. It combines a story bible (Canon), chapter planning, scene-by-scene drafting, and AI assistance into one focused workspace." },
  { q: "Do I need an AI API key?", a: "The AI features are optional. You can write entirely by hand. If you want AI assistance, you connect your own API key from OpenRouter, Infermatic, or LM Studio. Free models are available on OpenRouter." },
  { q: "What is the Canon?", a: "The Canon is your story bible — characters, locations, lore, voice rules, and worldbuilding. Every AI generation reads your Canon first to stay consistent with your story." },
  { q: "How does the 7-day free trial work?", a: "You get full access to every feature for 7 days. No charge until the trial ends. Cancel anytime during the trial and you will not be billed." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel through your account at any time. Your access continues until the end of the current billing period." },
  { q: "What export formats are supported?", a: "EPUB and DOCX. The export includes only your prose — no AI metadata, planning notes, or formatting clutter." },
  { q: "Is my writing private?", a: "Yes. Your novels are stored in your own isolated data space. We do not read, train on, or share your content." },
  { q: "What AI models can I use?", a: "Any model available through OpenRouter (including free ones), Infermatic, or a locally hosted model via LM Studio. You choose the model and provide your own key." },
];

function FAQ() {
  return (
    <section id="faq" style={{ padding: "80px 0", background: C.bgSoft }}>
      <div style={wrap({ maxWidth: 720 })}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 12 }}>
          FAQ
        </p>
        <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 40px" }}>
          Common questions.
        </h2>

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
    <div
      style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "20px 0",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
          fontSize: 16,
          fontWeight: 600,
          color: C.text,
          fontFamily: "inherit",
        }}
      >
        {q}
        <span style={{ fontSize: 20, color: C.textMuted, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none" }}>
          +
        </span>
      </button>
      {open && (
        <p style={{ fontSize: 15, lineHeight: 1.6, color: C.textSoft, marginTop: 12, marginBottom: 0 }}>
          {a}
        </p>
      )}
    </div>
  );
}

/* ── CTA Banner ───────────────────────────────────────── */
function CTABanner() {
  return (
    <section style={{ padding: "80px 0", background: C.bgDark }}>
      <div style={{ ...wrap(), textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", margin: "0 0 16px" }}>
          Ready to write something real?
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 36 }}>
          Start your 7-day free trial. No credit card required upfront.
        </p>
        <Link
          href="/subscribe"
          style={{
            ...btnPrimary,
            background: "#fff",
            color: C.bgDark,
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
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textDecoration: "none",
    transition: "color 0.15s",
  };
  return (
    <footer style={{ padding: "48px 0", background: C.bgDark }}>
      <div style={{ ...wrap(), display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/blocwrite-logo.png" alt="Blocwrite" style={{ height: 24, width: "auto", opacity: 0.8 }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
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
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ── Inline SVG icons ─────────────────────────────────── */
function ArrowIcon({ color = "#fff" }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
