"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function SubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<"monthly" | "annual" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(plan: "monthly" | "annual") {
    setLoading(plan);
    setError(null);

    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = (await res.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (res.ok && data?.url) {
        window.location.href = data.url;
      } else {
        setError(data?.error || "Failed to start checkout. Please try again.");
      }
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const features = [
    "Unlimited novels and chapters",
    "AI-assisted planning and writing",
    "Story bible with canon linking",
    "Export to EPUB and DOCX",
    "Bolt-on writing plugins",
    "The Editor — AI proofreading",
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(165deg, #fdfcfa 0%, #f8f7f5 50%, #f2f0ee 100%)",
        color: "#1c1917",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <Image
            src="/blocwrite-logo-black.png"
            alt="Blocwrite"
            width={180}
            height={54}
            priority
          />
        </Link>

        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-display, 'DM Sans'), system-ui, sans-serif", letterSpacing: "-0.02em", marginBottom: 8 }}>
            Choose your plan
          </h1>
          <p style={{ fontSize: 15, color: "#57534e" }}>
            Start with a 7-day free trial. Cancel anytime.
          </p>
        </div>

        {/* Plans */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
            width: "100%",
          }}
        >
          {/* Monthly */}
          <div
            style={{
              borderRadius: 20,
              border: "1px solid rgba(0,0,0,0.06)",
              background: "#ffffff",
              padding: "36px 32px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#57534e",
                marginBottom: 8,
              }}
            >
              MONTHLY
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 4,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                &pound;12.99
              </span>
              <span style={{ fontSize: 15, color: "#57534e" }}>
                /month
              </span>
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 8,
                background: "rgba(10,95,122,0.1)",
                color: "#0a5f7a",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 20,
                alignSelf: "flex-start",
              }}
            >
              7-day free trial
            </div>

            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 24px",
                display: "grid",
                gap: 10,
              }}
            >
              {features.map((f) => (
                <li
                  key={f}
                  style={{
                    fontSize: 13,
                    color: "#44403c",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      color: "#0a5f7a",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    &#10003;
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => void handleSubscribe("monthly")}
              disabled={loading !== null}
              style={{
                marginTop: "auto",
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "transparent",
                color: "#1c1917",
                cursor: loading ? "wait" : "pointer",
                opacity: loading === "annual" ? 0.4 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {loading === "monthly" ? "Redirecting..." : "Start Free Trial"}
            </button>
          </div>

          {/* Annual */}
          <div
            style={{
              borderRadius: 20,
              border: "2px solid #0a5f7a",
              background: "linear-gradient(180deg, rgba(10,95,122,0.04) 0%, rgba(10,95,122,0.02) 100%)",
              padding: "36px 32px",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              boxShadow: "0 8px 32px rgba(10,95,122,0.08)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -12,
                right: 20,
                padding: "4px 14px",
                borderRadius: 8,
                background: "#0a5f7a",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              SAVE 36%
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#57534e",
                marginBottom: 8,
              }}
            >
              ANNUAL
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 4,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                &pound;99
              </span>
              <span style={{ fontSize: 15, color: "#57534e" }}>
                /year
              </span>
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 8,
                background: "rgba(10,95,122,0.1)",
                color: "#0a5f7a",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 20,
                alignSelf: "flex-start",
              }}
            >
              7-day free trial
            </div>

            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 24px",
                display: "grid",
                gap: 10,
              }}
            >
              {features.map((f) => (
                <li
                  key={f}
                  style={{
                    fontSize: 13,
                    color: "#44403c",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      color: "#0a5f7a",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    &#10003;
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => void handleSubscribe("annual")}
              disabled={loading !== null}
              style={{
                marginTop: "auto",
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                border: "none",
                background: "#0a5f7a",
                color: "#ffffff",
                cursor: loading ? "wait" : "pointer",
                opacity: loading === "monthly" ? 0.4 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {loading === "annual" ? "Redirecting..." : "Start Free Trial"}
            </button>
          </div>
        </div>

        {error && (
          <p
            style={{
              fontSize: 13,
              color: "#ff6b6b",
              textAlign: "center",
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(255,107,107,0.08)",
              border: "1px solid rgba(255,107,107,0.15)",
            }}
          >
            {error}
          </p>
        )}

        <p style={{ fontSize: 12, color: "#57534e", textAlign: "center" }}>
          Secure payment via Stripe. Cancel anytime during your trial — no charge.
        </p>
        <p style={{ fontSize: 10, color: "#57534e", textAlign: "center", marginTop: 20 }}>© 2026 Blocwrite. All rights reserved.</p>
      </div>
    </main>
  );
}
