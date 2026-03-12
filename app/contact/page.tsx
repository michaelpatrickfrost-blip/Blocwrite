"use client";

import Link from "next/link";
import { PublicNav } from "../components/PublicNav";
import { PublicFooter } from "../components/PublicFooter";

const C = {
  bg: "#fdfcfa",
  bgSoft: "#f8f7f5",
  text: "#1c1917",
  textSoft: "#404040",
  textMuted: "#6b6b6b",
  border: "#e8e6e4",
};

export default function ContactPage() {
  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)", minHeight: "100vh" }}>
      <PublicNav showLinks />

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "80px 28px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, fontFamily: "var(--font-display, 'DM Sans'), system-ui, sans-serif", letterSpacing: "-0.03em", marginBottom: 12 }}>
          Contact us
        </h1>
        <div
          style={{
            padding: 36,
            borderRadius: 20,
            background: C.bgSoft,
            border: `1px solid ${C.border}`,
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
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

      <PublicFooter />
    </main>
  );
}
