"use client";

import Link from "next/link";

const C = {
  wrap: { maxWidth: 1140, margin: "0 auto" as const, padding: "0 32px" },
};

export function PublicFooter() {
  return (
    <footer
      style={{
        padding: "48px 0 40px",
        background: "#fdfcfa",
        borderTop: "1px solid #e8e6e4",
        marginTop: 64,
      }}
    >
      <div
        style={{
          ...C.wrap,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/blocwrite-logo-black.png" alt="Blocwrite" style={{ height: 28, width: "auto", opacity: 0.85 }} />
          <span style={{ fontSize: 13, color: "#6b6b6b" }}>© 2026 Blocwrite</span>
        </div>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {[
            { label: "Home", href: "/" },
            { label: "Terms", href: "/terms" },
            { label: "Refund Policy", href: "/refunds" },
            { label: "Contact", href: "/contact" },
            { label: "Log in", href: "/login" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: 14,
                color: "#404040",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
