"use client";

import { useState, useEffect } from "react";

const MIN_WIDTH = 900; // px – anything below this is unusable for the studio

export default function MobileGate({ children }: { children: React.ReactNode }) {
  const [tooSmall, setTooSmall] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = () => setTooSmall(window.innerWidth < MIN_WIDTH);
    check();
    setChecked(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Don't flash anything until we've measured
  if (!checked) return null;

  if (tooSmall) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          background: "#111114",
          color: "#e4e4e7",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          textAlign: "center",
        }}
      >
        <img
          src="/blocwrite-main-dark.png"
          alt="Blocwrite"
          style={{ height: 40, marginBottom: 32 }}
        />

        {/* Monitor icon */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(163,230,53,0.7)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 24 }}
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: "0 0 12px",
            color: "#ffffff",
          }}
        >
          Desktop experience only
        </h1>

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.55)",
            maxWidth: 340,
            margin: "0 0 28px",
          }}
        >
          Blocwrite&apos;s writing studio needs a larger screen to work
          properly. Please switch to a laptop or desktop for the best
          experience.
        </p>

        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            borderRadius: 8,
            background: "rgba(163,230,53,0.15)",
            color: "#a3e635",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            border: "1px solid rgba(163,230,53,0.25)",
          }}
        >
          Back to homepage
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
