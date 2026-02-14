import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#f0f0f0",
        fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
      }}
    >
      {/* ── Nav ───────────────────────────────────────── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <Image
          src="/blocwrite-main-dark.png"
          alt="Blocwrite"
          width={160}
          height={48}
          priority
        />
        <div style={{ display: "flex", gap: 12 }}>
          <Link
            href="/login"
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f0f0f0",
              textDecoration: "none",
              transition: "border-color 0.2s",
            }}
          >
            Sign In
          </Link>
          <Link
            href="/login?mode=register"
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: "none",
              background: "#e6ff4b",
              color: "#1e1c1c",
              textDecoration: "none",
              transition: "opacity 0.2s",
            }}
          >
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "80px 40px 60px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: 20,
            background: "rgba(230,255,75,0.08)",
            border: "1px solid rgba(230,255,75,0.2)",
            fontSize: 12,
            fontWeight: 600,
            color: "#e6ff4b",
            marginBottom: 28,
            letterSpacing: "0.04em",
          }}
        >
          AI-POWERED NOVEL WRITING
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            margin: "0 0 24px",
          }}
        >
          Write your novel,
          <br />
          <span style={{ color: "#e6ff4b" }}>scene by scene.</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.55)",
            maxWidth: 600,
            margin: "0 auto 40px",
          }}
        >
          Blocwrite breaks your story into manageable blocs. Plan your chapters,
          build your canon, and let AI assist your writing — without losing your
          voice.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/login?mode=register"
            style={{
              padding: "14px 36px",
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 12,
              background: "#e6ff4b",
              color: "#1e1c1c",
              textDecoration: "none",
              transition: "opacity 0.2s",
            }}
          >
            Start 7-Day Free Trial
          </Link>
          <a
            href="#features"
            style={{
              padding: "14px 36px",
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f0f0f0",
              textDecoration: "none",
              transition: "border-color 0.2s",
            }}
          >
            See How It Works
          </a>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────── */}
      <section
        id="features"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "60px 40px 80px",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#e6ff4b",
            marginBottom: 12,
          }}
        >
          FEATURES
        </h2>
        <p
          style={{
            textAlign: "center",
            fontSize: "clamp(24px, 3vw, 36px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 48,
          }}
        >
          Everything you need to write your book
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          <FeatureCard
            icon="&#9998;"
            title="Bloc-by-Bloc Writing"
            description="Break chapters into focused blocs. Write scene by scene so the AI stays on track and your prose flows naturally."
          />
          <FeatureCard
            icon="&#9881;"
            title="AI-Powered Planning"
            description="Generate chapter outlines, bloc synopses, and full prose with quality gates that keep the AI consistent."
          />
          <FeatureCard
            icon="&#128214;"
            title="Story Bible &amp; Canon"
            description="Characters, locations, lore — your entire world in one place. AI reads your canon to maintain continuity."
          />
          <FeatureCard
            icon="&#128196;"
            title="Export Anywhere"
            description="One click to export your finished novel as EPUB or DOCX. Ready for publishing or sharing."
          />
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────── */}
      <section
        id="pricing"
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "60px 40px 80px",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#e6ff4b",
            marginBottom: 12,
          }}
        >
          PRICING
        </h2>
        <p
          style={{
            textAlign: "center",
            fontSize: "clamp(24px, 3vw, 36px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 48,
          }}
        >
          Simple pricing, no surprises
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
            maxWidth: 700,
            margin: "0 auto",
          }}
        >
          {/* Monthly */}
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
              MONTHLY
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em" }}>
                &pound;12.99
              </span>
              <span style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}>/month</span>
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 8,
                background: "rgba(230,255,75,0.1)",
                color: "#e6ff4b",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 20,
                alignSelf: "flex-start",
              }}
            >
              7-day free trial
            </div>
            <PricingFeatureList />
            <Link
              href="/login?mode=register"
              style={{
                marginTop: "auto",
                padding: "12px 0",
                textAlign: "center",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#f0f0f0",
                textDecoration: "none",
                transition: "border-color 0.2s",
              }}
            >
              Start Free Trial
            </Link>
          </div>

          {/* Annual */}
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(230,255,75,0.3)",
              background: "rgba(230,255,75,0.04)",
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -12,
                right: 20,
                padding: "4px 14px",
                borderRadius: 8,
                background: "#e6ff4b",
                color: "#1e1c1c",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              SAVE 36%
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
              ANNUAL
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em" }}>
                &pound;99
              </span>
              <span style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}>/year</span>
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 8,
                background: "rgba(230,255,75,0.1)",
                color: "#e6ff4b",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 20,
                alignSelf: "flex-start",
              }}
            >
              7-day free trial
            </div>
            <PricingFeatureList />
            <Link
              href="/login?mode=register"
              style={{
                marginTop: "auto",
                padding: "12px 0",
                textAlign: "center",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                border: "none",
                background: "#e6ff4b",
                color: "#1e1c1c",
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "32px 40px",
          textAlign: "center",
        }}
      >
        <Image
          src="/blocwrite-main-dark.png"
          alt="Blocwrite"
          width={120}
          height={36}
          style={{ opacity: 0.4, marginBottom: 12 }}
        />
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
          &copy; {new Date().getFullYear()} Blocwrite. All rights reserved.
        </p>
      </footer>
    </main>
  );
}

/* ── Components ──────────────────────────────────────── */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        padding: "28px 24px",
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.5)", margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

function PricingFeatureList() {
  const features = [
    "Unlimited novels and chapters",
    "AI-assisted planning and writing",
    "Story bible with canon linking",
    "Export to EPUB and DOCX",
    "Bolt-on writing plugins",
    "The Editor — AI proofreading",
  ];
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: 10 }}>
      {features.map((f) => (
        <li
          key={f}
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.65)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ color: "#e6ff4b", fontSize: 14, fontWeight: 700 }}>&#10003;</span>
          {f}
        </li>
      ))}
    </ul>
  );
}
