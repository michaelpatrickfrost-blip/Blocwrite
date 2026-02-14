"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { redirectTo?: string } | null;
        router.push(data?.redirectTo || "/studio");
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || "Invalid email or password.");
      }
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#000000",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Branding */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Image
            src="/blocwrite-main-dark.png"
            alt="Blocwrite"
            width={320}
            height={96}
            priority
            style={{ marginBottom: 8 }}
          />
          <p
            style={{
              fontSize: 13,
              color: "var(--pw-text-dim, #555)",
              marginTop: 6,
              letterSpacing: "0.02em",
            }}
          >
            Sign in to your workspace
          </p>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--pw-text-muted, #888)",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                borderRadius: "var(--pw-radius-md, 10px)",
                border: "1px solid var(--pw-border, rgba(255,255,255,0.08))",
                background: "var(--pw-sidebar, #1a1919)",
                color: "var(--pw-text, #f0f0f0)",
                outline: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--pw-accent, #e6ff4b)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--pw-border, rgba(255,255,255,0.08))")}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--pw-text-muted, #888)",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                borderRadius: "var(--pw-radius-md, 10px)",
                border: "1px solid var(--pw-border, rgba(255,255,255,0.08))",
                background: "var(--pw-sidebar, #1a1919)",
                color: "var(--pw-text, #f0f0f0)",
                outline: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--pw-accent, #e6ff4b)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--pw-border, rgba(255,255,255,0.08))")}
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: 13,
                color: "var(--pw-coral, #ff6b6b)",
                margin: 0,
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              width: "100%",
              padding: "11px 0",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: "var(--pw-radius-md, 10px)",
              border: "none",
              background: "var(--pw-accent, #e6ff4b)",
              color: "var(--pw-btn-primary-text, #1e1c1c)",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "opacity 0.15s, background 0.15s",
              letterSpacing: "0.02em",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p
          style={{
            fontSize: 11,
            color: "var(--pw-text-dim, #555)",
            textAlign: "center",
            margin: 0,
          }}
        >
          Blocwrite Studio
        </p>
      </div>
    </main>
  );
}
