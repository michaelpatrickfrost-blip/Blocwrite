"use client";

import Link from "next/link";

const C = {
  wrap: { maxWidth: 1140, margin: "0 auto" as const, padding: "0 32px" },
};

export function PublicNav({ showLinks = false }: { showLinks?: boolean }) {
  return (
    <nav
      style={{
        position: "sticky" as const,
        top: 0,
        zIndex: 50,
        background: "#0a0a0a",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          ...C.wrap,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 32px",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <img
            src="/blocwrite-logo-white.png"
            alt="Blocwrite"
            style={{ height: 56, width: "auto", maxWidth: 200, opacity: 0.95, objectFit: "contain" }}
          />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {showLinks && (
            <>
              <Link href="/#features" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>
                Features
              </Link>
              <Link href="/#pricing" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>
                Pricing
              </Link>
              <Link href="/news" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>
                News
              </Link>
            </>
          )}
          <Link href="/login" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>
            Log in
          </Link>
          <Link
            href="/subscribe"
            style={{
              padding: "10px 22px",
              fontSize: 14,
              fontWeight: 600,
              background: "#fff",
              color: "#0a0a0a",
              textDecoration: "none",
              borderRadius: 12,
              transition: "transform 0.15s, box-shadow 0.2s",
              boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            }}
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </nav>
  );
}
