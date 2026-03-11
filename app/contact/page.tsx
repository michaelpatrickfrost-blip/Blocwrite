"use client";

import Link from "next/link";

const C = {
  bg: "#fafaf9",
  bgSoft: "#f5f5f4",
  bgDark: "#1e3a5f",
  text: "#1c1917",
  textSoft: "#44403c",
  textMuted: "#57534e",
  border: "#e7e5e4",
  btnBg: "linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)",
  btnText: "#ffffff",
};

export default function ContactPage() {
  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "14px 28px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img src="/blocwrite-logo-black.png" alt="Blocwrite" style={{ height: 36, width: "auto", display: "block" }} />
          </Link>
          <Link href="/" style={{ fontSize: 14, fontWeight: 500, color: "#44403c", textDecoration: "none" }}>
            &larr; Back to Home
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 28px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12 }}>
          Contact us
        </h1>
        <div
          style={{
            padding: 32,
            borderRadius: 16,
            background: C.bgSoft,
            border: `1px solid ${C.border}`,
          }}
        >
          <p style={{ fontSize: 16, lineHeight: 1.7, color: C.textSoft, margin: 0 }}>
            For support, please email{" "}
            <a href="mailto:customerservice@blocwrite.com" style={{ color: C.text, fontWeight: 600 }}>
              customerservice@blocwrite.com
            </a>
            .
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ padding: "48px 0 40px", background: "#1e3a5f", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 80 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 32, width: "auto", opacity: 0.6 }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>
              © 2026 Blocwrite. All rights reserved.
            </span>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {[
              { label: "Home", href: "/" },
              { label: "Terms", href: "/terms" },
              { label: "Refund Policy", href: "/refunds" },
              { label: "Contact", href: "/contact" },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
