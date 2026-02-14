"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

/* ────────────────────────────────────────────────────────
   Colour palette — light premium theme
   ────────────────────────────────────────────────────── */
const C = {
  bg: "#ffffff",
  bgSoft: "#f7f8fa",
  bgDark: "#111116",
  text: "#111116",
  textSoft: "#5a5e6b",
  textMuted: "#9ca0ab",
  accent: "#e6ff4b",
  accentDark: "#c8e030",
  border: "#e8e9ed",
  card: "#ffffff",
};

export default function LandingPage() {
  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}>
      <Nav />
      <Hero />
      <LogoStrip />
      <Features />
      <StudioShowcase />
      <HowItWorks />
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
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", color: C.text }}>
            Bloc<span style={{ color: C.accentDark }}>write</span>
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href="#features" style={{ padding: "8px 14px", fontSize: 13, fontWeight: 500, color: C.textSoft, textDecoration: "none" }}>Features</a>
          <a href="#pricing" style={{ padding: "8px 14px", fontSize: 13, fontWeight: 500, color: C.textSoft, textDecoration: "none" }}>Pricing</a>
          <a href="#faq" style={{ padding: "8px 14px", fontSize: 13, fontWeight: 500, color: C.textSoft, textDecoration: "none" }}>FAQ</a>
          <Link href="/login" style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: C.text, textDecoration: "none", borderRadius: 8, border: `1px solid ${C.border}` }}>
            Sign In
          </Link>
          <Link href="/login?mode=register" style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: C.bgDark, textDecoration: "none", borderRadius: 8, background: C.accent, border: "none" }}>
            Start Free Trial
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero ──────────────────────────────────────────────── */
function Hero() {
  return (
    <section style={{ maxWidth: 1140, margin: "0 auto", padding: "80px 28px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
      {/* Left — copy */}
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "rgba(230,255,75,0.15)", border: "1px solid rgba(200,224,48,0.3)", fontSize: 12, fontWeight: 600, color: "#6b7a10", marginBottom: 24 }}>
          <span>&#9889;</span> AI-Powered Novel Writing
        </div>

        <h1 style={{ fontSize: "clamp(34px, 4.5vw, 56px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.035em", margin: "0 0 20px" }}>
          Write your novel,<br />
          <span style={{ background: `linear-gradient(135deg, ${C.accentDark}, #8bc34a)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>scene by scene.</span>
        </h1>

        <p style={{ fontSize: 17, lineHeight: 1.65, color: C.textSoft, maxWidth: 460, margin: "0 0 32px" }}>
          Blocwrite breaks your story into manageable blocs. Plan chapters, build your canon, and let AI assist your writing — without ever losing your voice.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/login?mode=register" style={{ padding: "14px 32px", fontSize: 15, fontWeight: 700, borderRadius: 12, background: C.accent, color: C.bgDark, textDecoration: "none", boxShadow: "0 2px 12px rgba(200,224,48,0.25)" }}>
            Start 7-Day Free Trial
          </Link>
          <a href="#features" style={{ padding: "14px 32px", fontSize: 15, fontWeight: 600, borderRadius: 12, border: `1px solid ${C.border}`, color: C.text, textDecoration: "none" }}>
            Learn More
          </a>
        </div>

        <p style={{ marginTop: 16, fontSize: 12, color: C.textMuted }}>
          No credit card required to start &middot; Cancel anytime
        </p>
      </div>

      {/* Right — illustration + screenshot */}
      <div style={{ position: "relative" }}>
        {/* Studio screenshot mockup */}
        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.04)", border: `1px solid ${C.border}` }}>
          {/* Browser bar */}
          <div style={{ background: "#f1f2f4", padding: "10px 16px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
            <span style={{ marginLeft: 12, fontSize: 11, color: C.textMuted, background: "#e8e9ed", padding: "3px 40px", borderRadius: 4 }}>blocwrite.com/studio</span>
          </div>
          {/* Dark studio preview */}
          <div style={{ background: "#111116", padding: "28px 24px", minHeight: 280 }}>
            {/* Simulated studio UI */}
            <div style={{ display: "flex", gap: 16 }}>
              {/* Sidebar */}
              <div style={{ width: 160, flexShrink: 0 }}>
                <div style={{ background: "#1c1c22", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <div style={{ width: "70%", height: 8, background: "#2a2a32", borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ width: "50%", height: 6, background: "#222228", borderRadius: 4 }} />
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ padding: "8px 12px", borderRadius: 6, background: i === 2 ? "rgba(230,255,75,0.08)" : "transparent", borderLeft: i === 2 ? "2px solid #e6ff4b" : "2px solid transparent", marginBottom: 2 }}>
                    <div style={{ width: `${55 + i * 8}%`, height: 6, background: i === 2 ? "rgba(230,255,75,0.3)" : "#2a2a32", borderRadius: 3 }} />
                  </div>
                ))}
              </div>
              {/* Main content */}
              <div style={{ flex: 1 }}>
                <div style={{ background: "#1c1c22", borderRadius: 8, padding: 16 }}>
                  <div style={{ width: "40%", height: 10, background: "#e6ff4b", borderRadius: 4, marginBottom: 12, opacity: 0.7 }} />
                  {[100, 95, 80, 90, 70, 85, 60].map((w, i) => (
                    <div key={i} style={{ width: `${w}%`, height: 5, background: "#2a2a32", borderRadius: 3, marginBottom: 6 }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {["Plan", "Write", "Edit"].map((label) => (
                    <div key={label} style={{ flex: 1, background: "#1c1c22", borderRadius: 6, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ width: "60%", height: 5, background: "#2a2a32", borderRadius: 3, margin: "0 auto" }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating person illustration */}
        <div style={{ position: "absolute", bottom: -20, left: -30, width: 80, height: 80 }}>
          <WriterIllustration />
        </div>
      </div>
    </section>
  );
}

/* ── Logo strip / social proof ─────────────────────────── */
function LogoStrip() {
  return (
    <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "24px 28px", marginTop: 60 }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: C.textMuted, marginBottom: 0 }}>
          TRUSTED BY WRITERS WORLDWIDE &mdash; PLAN, WRITE &amp; PUBLISH WITH CONFIDENCE
        </p>
      </div>
    </section>
  );
}

/* ── Features ──────────────────────────────────────────── */
function Features() {
  const features = [
    {
      icon: <PenIcon />,
      title: "Bloc-by-Bloc Writing",
      desc: "Break chapters into focused blocs. Write scene by scene so the AI stays on track and your prose flows naturally — every time.",
    },
    {
      icon: <BrainIcon />,
      title: "AI-Powered Planning",
      desc: "Generate chapter outlines, bloc synopses, and full prose with quality gates that keep your story consistent and on voice.",
    },
    {
      icon: <BookIcon />,
      title: "Story Bible & Canon",
      desc: "Characters, locations, lore — your entire world in one place. AI reads your canon to maintain continuity across every chapter.",
    },
    {
      icon: <ExportIcon />,
      title: "Export Anywhere",
      desc: "One click to export your finished novel as EPUB or DOCX. Ready for publishers, beta readers, or self-publishing.",
    },
    {
      icon: <PluginIcon />,
      title: "Bolt-On Plugins",
      desc: "Add reusable writing directives — tone, pacing, POV rules — that guide the AI across chapters and projects.",
    },
    {
      icon: <ShieldIcon />,
      title: "Your Voice, Protected",
      desc: "AI assists, never replaces. Quality gates and author-style matching ensure the final prose sounds like you.",
    },
  ];

  return (
    <section id="features" style={{ maxWidth: 1140, margin: "0 auto", padding: "80px 28px" }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: C.accentDark, marginBottom: 8 }}>FEATURES</p>
        <h2 style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 12 }}>
          Everything you need to write your book
        </h2>
        <p style={{ fontSize: 16, color: C.textSoft, maxWidth: 520, margin: "0 auto" }}>
          From first outline to finished manuscript — Blocwrite is your complete AI writing studio.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        {features.map((f) => (
          <div key={f.title} style={{ padding: "28px 24px", borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, transition: "box-shadow 0.2s, border-color 0.2s" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(230,255,75,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              {f.icon}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: C.textSoft, margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Studio showcase ───────────────────────────────────── */
function StudioShowcase() {
  return (
    <section style={{ background: C.bgSoft, padding: "80px 28px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
          {/* Text */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: C.accentDark, marginBottom: 8 }}>THE STUDIO</p>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16 }}>
              A writing environment built for novelists
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: C.textSoft, marginBottom: 24 }}>
              Plan your book&apos;s structure, write chapter by chapter with AI assistance, and keep your entire story bible in one connected workspace.
            </p>

            <div style={{ display: "grid", gap: 16 }}>
              {[
                { label: "Chapter Planning", detail: "Outline every chapter with AI-generated synopses that keep your plot tight" },
                { label: "Bloc Editor", detail: "Write in focused scenes — each bloc gets dedicated AI context for consistent output" },
                { label: "Canon Linking", detail: "Reference characters, locations, and lore directly in your writing blocs" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.bgDark }}>&#10003;</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.5 }}>{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Screenshot mockup with person */}
          <div style={{ position: "relative" }}>
            <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.08)", border: `1px solid ${C.border}` }}>
              <div style={{ background: "#111116", padding: "24px 20px", minHeight: 320 }}>
                {/* Canon/Story Bible mockup */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  {["Characters", "Locations", "Lore"].map((tab, i) => (
                    <div key={tab} style={{ padding: "6px 14px", borderRadius: 6, background: i === 0 ? "rgba(230,255,75,0.12)" : "#1c1c22", fontSize: 11, color: i === 0 ? "#e6ff4b" : "#666", fontWeight: 600 }}>{tab}</div>
                  ))}
                </div>
                {/* Character cards */}
                {[
                  { name: "Eleanor Voss", role: "Protagonist", color: "#e6ff4b" },
                  { name: "Marcus Reid", role: "Antagonist", color: "#ff6b6b" },
                  { name: "Ivy Chen", role: "Mentor", color: "#6bc5ff" },
                ].map((char) => (
                  <div key={char.name} style={{ background: "#1c1c22", borderRadius: 8, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, borderLeft: `3px solid ${char.color}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${char.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <PersonSmallIcon color={char.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#eee" }}>{char.name}</div>
                      <div style={{ fontSize: 10, color: "#666" }}>{char.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Reader illustration */}
            <div style={{ position: "absolute", top: -20, right: -20 }}>
              <ReaderIllustration />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── How it works ──────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { num: "1", title: "Plan your novel", desc: "Start with a premise. AI helps you build a full chapter-by-chapter outline with synopses, characters, and world-building." },
    { num: "2", title: "Write bloc by bloc", desc: "Each chapter is broken into focused blocs. Write scene by scene with AI assistance that stays true to your voice and plot." },
    { num: "3", title: "Export & publish", desc: "When your manuscript is ready, export as EPUB or DOCX with one click. Ready for publishers or self-publishing." },
  ];

  return (
    <section style={{ maxWidth: 1140, margin: "0 auto", padding: "80px 28px" }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: C.accentDark, marginBottom: 8 }}>HOW IT WORKS</p>
        <h2 style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.025em" }}>
          From idea to manuscript in three steps
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
        {steps.map((s) => (
          <div key={s.num} style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 22, fontWeight: 800, color: C.bgDark }}>
              {s.num}
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: C.textSoft, margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Pricing ───────────────────────────────────────────── */
function Pricing() {
  const features = [
    "Unlimited novels and chapters",
    "AI-assisted planning and writing",
    "Story bible with canon linking",
    "Export to EPUB and DOCX",
    "Bolt-on writing plugins",
    "The Editor — AI proofreading",
  ];

  return (
    <section id="pricing" style={{ background: C.bgSoft, padding: "80px 28px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: C.accentDark, marginBottom: 8 }}>PRICING</p>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 12 }}>
            Simple pricing, no surprises
          </h2>
          <p style={{ fontSize: 15, color: C.textSoft }}>Start free for 7 days. Cancel anytime.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Monthly */}
          <div style={{ borderRadius: 16, border: `1px solid ${C.border}`, background: C.card, padding: "32px 28px", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>MONTHLY</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>&pound;12.99</span>
              <span style={{ fontSize: 14, color: C.textMuted }}>/month</span>
            </div>
            <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 8, background: "rgba(230,255,75,0.15)", color: "#6b7a10", fontSize: 12, fontWeight: 600, marginBottom: 20, alignSelf: "flex-start" }}>
              7-day free trial
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: 10 }}>
              {features.map((f) => (
                <li key={f} style={{ fontSize: 13, color: C.textSoft, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: C.accentDark, fontWeight: 700, fontSize: 14 }}>&#10003;</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/login?mode=register" style={{ marginTop: "auto", padding: "12px 0", textAlign: "center", fontSize: 14, fontWeight: 700, borderRadius: 10, border: `1px solid ${C.border}`, color: C.text, textDecoration: "none" }}>
              Start Free Trial
            </Link>
          </div>

          {/* Annual */}
          <div style={{ borderRadius: 16, border: `2px solid ${C.accentDark}`, background: C.card, padding: "32px 28px", display: "flex", flexDirection: "column", position: "relative", boxShadow: "0 4px 24px rgba(200,224,48,0.12)" }}>
            <div style={{ position: "absolute", top: -12, right: 20, padding: "4px 14px", borderRadius: 8, background: C.accent, color: C.bgDark, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
              SAVE 36%
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>ANNUAL</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>&pound;99</span>
              <span style={{ fontSize: 14, color: C.textMuted }}>/year</span>
            </div>
            <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 8, background: "rgba(230,255,75,0.15)", color: "#6b7a10", fontSize: 12, fontWeight: 600, marginBottom: 20, alignSelf: "flex-start" }}>
              7-day free trial
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: 10 }}>
              {features.map((f) => (
                <li key={f} style={{ fontSize: 13, color: C.textSoft, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: C.accentDark, fontWeight: 700, fontSize: 14 }}>&#10003;</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/login?mode=register" style={{ marginTop: "auto", padding: "12px 0", textAlign: "center", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none", background: C.accent, color: C.bgDark, textDecoration: "none" }}>
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ───────────────────────────────────────────────── */
function FAQ() {
  const faqs = [
    { q: "What is Blocwrite?", a: "Blocwrite is an AI-assisted novel writing studio. It helps you plan, write, and export full-length novels by breaking your story into manageable scenes called 'blocs'. You stay in control of the creative direction while AI handles the heavy lifting." },
    { q: "How does the 7-day free trial work?", a: "When you sign up, you get full access to every feature for 7 days — completely free. No credit card is required to create your account. You'll only be charged if you choose to continue after the trial ends." },
    { q: "Can I cancel my subscription?", a: "Absolutely. You can cancel at any time from your account settings. If you cancel during the trial, you won't be charged at all. If you cancel after, you'll keep access until the end of your billing period." },
    { q: "Does the AI write my book for me?", a: "No — and that's by design. Blocwrite's AI assists with planning, outlining, and drafting, but you direct every creative decision. The AI reads your canon, characters, and style preferences to generate prose that sounds like you, not a chatbot." },
    { q: "What formats can I export?", a: "You can export your finished manuscript as EPUB (for e-readers and self-publishing) or DOCX (for editors and traditional publishing). Exports include chapter formatting and title pages." },
    { q: "Is my writing data safe?", a: "Yes. Your novels are stored securely on our servers and are only accessible through your authenticated account. Each user's data is completely isolated. We never use your writing to train AI models." },
    { q: "What AI models does Blocwrite use?", a: "Blocwrite connects to leading AI models via OpenRouter, giving you access to the best available models for creative writing. You can choose your preferred model in the Studio settings." },
    { q: "Can I use Blocwrite on mobile?", a: "Blocwrite is optimised for desktop and laptop browsers where you have a full keyboard for writing. While the interface is responsive, novel writing is best experienced on a larger screen." },
  ];

  return (
    <section id="faq" style={{ maxWidth: 720, margin: "0 auto", padding: "80px 28px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: C.accentDark, marginBottom: 8 }}>FAQ</p>
        <h2 style={{ fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.025em" }}>
          Frequently asked questions
        </h2>
      </div>

      <div style={{ display: "grid", gap: 0 }}>
        {faqs.map((faq) => (
          <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
        ))}
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "20px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "left",
          fontSize: 15,
          fontWeight: 600,
          color: C.text,
        }}
      >
        {question}
        <span style={{ fontSize: 20, color: C.textMuted, transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0, marginLeft: 16 }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 20, fontSize: 14, lineHeight: 1.7, color: C.textSoft }}>
          {answer}
        </div>
      )}
    </div>
  );
}

/* ── CTA Banner ────────────────────────────────────────── */
function CTABanner() {
  return (
    <section style={{ background: C.bgDark, padding: "72px 28px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 16 }}>
          Ready to write your novel?
        </h2>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 32, lineHeight: 1.6 }}>
          Join writers who plan, write, and publish with Blocwrite. Your 7-day free trial is waiting.
        </p>
        <Link href="/login?mode=register" style={{ display: "inline-block", padding: "14px 36px", fontSize: 15, fontWeight: 700, borderRadius: 12, background: C.accent, color: C.bgDark, textDecoration: "none", boxShadow: "0 2px 16px rgba(230,255,75,0.25)" }}>
          Start Writing — It&apos;s Free
        </Link>
      </div>
    </section>
  );
}

/* ── Footer ────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: "40px 28px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>
            Bloc<span style={{ color: C.accentDark }}>write</span>
          </span>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
            &copy; {new Date().getFullYear()} Blocwrite. All rights reserved.
          </p>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <Link href="/terms" style={{ fontSize: 13, color: C.textSoft, textDecoration: "none" }}>Terms &amp; Conditions</Link>
          <Link href="/login" style={{ fontSize: 13, color: C.textSoft, textDecoration: "none" }}>Sign In</Link>
          <a href="#faq" style={{ fontSize: 13, color: C.textSoft, textDecoration: "none" }}>FAQ</a>
        </div>
      </div>
    </footer>
  );
}

/* ── SVG Icons ─────────────────────────────────────────── */
function PenIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7a10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7a10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M12 5v13" /><path d="M6.5 9h11" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7a10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7a10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
    </svg>
  );
}

function PluginIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7a10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7a10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/* ── Illustrations ─────────────────────────────────────── */
function WriterIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      {/* Body */}
      <circle cx="40" cy="22" r="12" fill="#f0e6d3" />
      {/* Hair */}
      <path d="M28 20c0-8 5-14 12-14s12 6 12 14" fill="#4a3728" />
      {/* Eyes */}
      <circle cx="36" cy="23" r="1.5" fill="#333" />
      <circle cx="44" cy="23" r="1.5" fill="#333" />
      {/* Smile */}
      <path d="M36 28c2 2 6 2 8 0" stroke="#333" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Body */}
      <path d="M28 34c-2 6-4 18-4 26h32c0-8-2-20-4-26-2-4-8-4-12-4s-10 0-12 4z" fill="#e6ff4b" />
      {/* Laptop */}
      <rect x="30" y="48" width="20" height="12" rx="2" fill="#333" />
      <rect x="32" y="50" width="16" height="8" rx="1" fill="#1c1c22" />
      {/* Typing lines */}
      <line x1="34" y1="53" x2="42" y2="53" stroke="#e6ff4b" strokeWidth="0.8" />
      <line x1="34" y1="55" x2="39" y2="55" stroke="#666" strokeWidth="0.8" />
    </svg>
  );
}

function ReaderIllustration() {
  return (
    <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
      <circle cx="35" cy="18" r="10" fill="#e8d5c0" />
      <path d="M25 16c0-7 4-12 10-12s10 5 10 12" fill="#8b4513" />
      <circle cx="32" cy="19" r="1.3" fill="#333" />
      <circle cx="38" cy="19" r="1.3" fill="#333" />
      {/* Glasses */}
      <circle cx="32" cy="19" r="3" stroke="#666" strokeWidth="0.8" fill="none" />
      <circle cx="38" cy="19" r="3" stroke="#666" strokeWidth="0.8" fill="none" />
      <line x1="35" y1="19" x2="35" y2="19" stroke="#666" strokeWidth="0.8" />
      <path d="M32 24c1.5 1.5 4.5 1.5 6 0" stroke="#333" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M25 28c-2 5-3 16-3 22h26c0-6-1-17-3-22-1.5-3-7-3-10-3s-8.5 0-10 3z" fill="#6bc5ff" />
      {/* Book */}
      <rect x="28" y="42" width="14" height="10" rx="1" fill="#fff" stroke="#ddd" strokeWidth="0.5" />
      <line x1="35" y1="42" x2="35" y2="52" stroke="#ddd" strokeWidth="0.5" />
    </svg>
  );
}

function PersonSmallIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" fill={color} opacity="0.6" />
      <path d="M3 14c0-3 2-5 5-5s5 2 5 5" fill={color} opacity="0.3" />
    </svg>
  );
}
