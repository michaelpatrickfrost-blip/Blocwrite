"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

type Mode = "login" | "register";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [forgotMsg, setForgotMsg] = useState("");
  const [activeSessionWarning, setActiveSessionWarning] = useState(false);
  const reason = searchParams.get("reason");

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setForgotStatus("sending");
    setForgotMsg("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string } | null;
      if (res.ok && data?.ok) {
        setForgotStatus("sent");
        setForgotMsg(data?.message || "If an account exists with this email, a reset link has been sent.");
      } else {
        setForgotStatus("error");
        setForgotMsg(data?.error || "Something went wrong. Please try again.");
      }
    } catch {
      setForgotStatus("error");
      setForgotMsg("Connection failed. Please try again.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        // Register first, then the register endpoint sets the cookie
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || undefined,
            email: email.trim(),
            password,
          }),
        });

        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          redirectTo?: string;
          error?: string;
        } | null;

        if (res.ok && data?.ok) {
          router.push(data.redirectTo || "/subscribe");
        } else {
          setError(data?.error || "Registration failed.");
        }
      } else {
        // Login
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          redirectTo?: string;
          error?: string;
          activeSession?: boolean;
        } | null;

        if (data?.activeSession) {
          // User is already logged in elsewhere — show the warning prompt
          setActiveSessionWarning(true);
        } else if (res.ok && data?.ok) {
          router.push(data.redirectTo || "/studio");
        } else {
          setError(data?.error || "Invalid email or password.");
        }
      }
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForceLogin() {
    setError("");
    setLoading(true);
    setActiveSessionWarning(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, force: true }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        redirectTo?: string;
        error?: string;
      } | null;
      if (res.ok && data?.ok) {
        router.push(data.redirectTo || "/studio");
      } else {
        setError(data?.error || "Login failed.");
      }
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    fontSize: 14,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#f0f0f0",
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#000",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <Image
            src="/blocwrite-logo-white.png"
            alt="Blocwrite"
            width={200}
            height={60}
            priority
          />
        </Link>

        {/* Card */}
        <div
          style={{
            width: "100%",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: "32px 28px",
          }}
        >
          {/* Session-expired / password-reset banners */}
          {reason === "session-expired" && !error && (
            <p style={{ fontSize: 13, color: "#ffa94d", margin: "0 0 16px", textAlign: "center", padding: "10px 14px", borderRadius: 8, background: "rgba(255,169,77,0.08)", border: "1px solid rgba(255,169,77,0.18)" }}>
              You were signed out because your account was logged in elsewhere. Only one session is allowed at a time.
            </p>
          )}
          {reason === "password-reset" && !error && (
            <p style={{ fontSize: 13, color: "#69db7c", margin: "0 0 16px", textAlign: "center", padding: "10px 14px", borderRadius: 8, background: "rgba(105,219,124,0.08)", border: "1px solid rgba(105,219,124,0.18)" }}>
              Password reset successful. Sign in with your new password.
            </p>
          )}

          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            {forgotMode ? "Reset password" : mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {forgotMode
              ? "Enter your email and we\u2019ll send a reset link"
              : mode === "login"
                ? "Sign in to continue writing"
                : "Start your 7-day free trial"}
          </p>

          {/* ── Forgot password form ── */}
          {forgotMode ? (
            <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label htmlFor="forgot-email" style={{ display: "block", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoFocus
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@email.com"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#e6ff4b")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                />
              </div>

              {forgotMsg && (
                <p style={{
                  fontSize: 13,
                  color: forgotStatus === "sent" ? "#69db7c" : "#ff6b6b",
                  margin: 0,
                  textAlign: "center",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: forgotStatus === "sent" ? "rgba(105,219,124,0.08)" : "rgba(255,107,107,0.08)",
                  border: `1px solid ${forgotStatus === "sent" ? "rgba(105,219,124,0.15)" : "rgba(255,107,107,0.15)"}`,
                }}>
                  {forgotMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={forgotStatus === "sending"}
                style={{
                  marginTop: 4, width: "100%", padding: "12px 0", fontSize: 14, fontWeight: 700,
                  borderRadius: 10, border: "none", background: "#e6ff4b", color: "#1e1c1c",
                  cursor: forgotStatus === "sending" ? "wait" : "pointer",
                  opacity: forgotStatus === "sending" ? 0.6 : 1, transition: "opacity 0.15s", letterSpacing: "0.02em",
                }}
              >
                {forgotStatus === "sending" ? "Sending..." : "Send Reset Link"}
              </button>

              <div style={{ textAlign: "center", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setForgotMsg(""); setForgotStatus("idle"); }}
                  style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : (
          /* ── Normal login / register form ── */
          <>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {mode === "register" && (
              <div>
                <label
                  htmlFor="name"
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.4)",
                    marginBottom: 6,
                  }}
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  style={inputStyle}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#e6ff4b")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.08)")
                  }
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.4)",
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
                style={inputStyle}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "#e6ff4b")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor =
                    "rgba(255,255,255,0.08)")
                }
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.4)",
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "login" ? "Enter password" : "Min 6 characters"
                }
                style={inputStyle}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "#e6ff4b")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor =
                    "rgba(255,255,255,0.08)")
                }
              />
            </div>

            {error && (
              <p
                style={{
                  fontSize: 13,
                  color: "#ff6b6b",
                  margin: 0,
                  textAlign: "center",
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(255,107,107,0.08)",
                  border: "1px solid rgba(255,107,107,0.15)",
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
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                border: "none",
                background: "#e6ff4b",
                color: "#1e1c1c",
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "opacity 0.15s",
                letterSpacing: "0.02em",
              }}
            >
              {loading
                ? "Working..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 18 }}>
            {mode === "login" && (
              <button
                type="button"
                onClick={() => { setForgotMode(true); setForgotEmail(email); setError(""); }}
                style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                Forgot your password?
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.4)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
          </>
          )}
        </div>

        <Link
          href="/"
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.25)",
            textDecoration: "none",
          }}
        >
          &larr; Back to Blocwrite
        </Link>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 16, textAlign: "center" }}>&copy; {new Date().getFullYear()} Blocwrite. All rights reserved.</p>
      </div>

      {/* ── Active session warning overlay ── */}
      {activeSessionWarning && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%", maxWidth: 400, borderRadius: 20,
              background: "#18181b", border: "1px solid rgba(255,255,255,0.08)",
              padding: "32px 28px", textAlign: "center",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
            }}
          >
            {/* Icon */}
            <div style={{
              width: 56, height: 56, borderRadius: 14, margin: "0 auto 20px",
              background: "rgba(255,169,77,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffa94d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>
              Already logged in elsewhere
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.5)", margin: "0 0 24px" }}>
              Your account is currently active on another device or browser.
              Continuing here will log you out of that session.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                onClick={handleForceLogin}
                disabled={loading}
                style={{
                  width: "100%", padding: "12px 0", fontSize: 14, fontWeight: 700,
                  borderRadius: 10, border: "none", background: "#e6ff4b", color: "#1e1c1c",
                  cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
                  transition: "opacity 0.15s", letterSpacing: "0.02em",
                }}
              >
                {loading ? "Logging in..." : "Log out other session & continue"}
              </button>
              <button
                type="button"
                onClick={() => setActiveSessionWarning(false)}
                disabled={loading}
                style={{
                  width: "100%", padding: "12px 0", fontSize: 14, fontWeight: 600,
                  borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)",
                  cursor: "pointer", transition: "background 0.15s",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
