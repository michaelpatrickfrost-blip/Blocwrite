"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

type Mode = "login" | "register";

function LoginForm() {
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
  const [trialMode, setTrialMode] = useState(false);
  const [trialCode, setTrialCode] = useState("");
  const [trialPassword, setTrialPassword] = useState("");
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState("");
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

  async function handleRedeemTrial(e: FormEvent) {
    e.preventDefault();
    setTrialError("");
    setTrialLoading(true);
    try {
      const res = await fetch("/api/auth/redeem-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trialCode.trim(), password: trialPassword.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; redirectTo?: string; error?: string } | null;
      if (res.ok && data?.ok) {
        window.location.assign(data.redirectTo || "/studio");
      } else {
        setTrialError(data?.error || "Invalid code or password.");
      }
    } catch {
      setTrialError("Connection failed. Please try again.");
    } finally {
      setTrialLoading(false);
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
          window.location.assign(data.redirectTo || "/subscribe");
        } else {
          setError(data?.error || "Registration failed.");
        }
      } else {
        // Login
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
          credentials: "same-origin",
        });

        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          redirectTo?: string;
          error?: string;
        } | null;

        if (res.ok && data?.ok) {
          window.location.assign(data.redirectTo || "/studio");
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


  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    fontSize: 14,
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.1)",
    background: "#ffffff",
    color: "#1c1917",
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
        background: "linear-gradient(165deg, #fdfcfa 0%, #f8f7f5 50%, #f2f0ee 100%)",
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
            src="/blocwrite-logo-black.png"
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
            borderRadius: 20,
            border: "1px solid rgba(0,0,0,0.06)",
            background: "#ffffff",
            padding: "36px 32px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
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
              fontSize: 24,
              fontWeight: 700,
              fontFamily: "var(--font-display, 'DM Sans'), system-ui, sans-serif",
              letterSpacing: "-0.02em",
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            {forgotMode ? "Reset password" : mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#57534e",
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
                <label htmlFor="forgot-email" style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#57534e", marginBottom: 6 }}>Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoFocus
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@email.com"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#0a5f7a")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)")}
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
                  borderRadius: 10, border: "none", background: "#0a0a0a", color: "#ffffff",
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
                  style={{ fontSize: 13, color: "#57534e", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
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
                    color: "#57534e",
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
                    (e.currentTarget.style.borderColor = "#0a5f7a")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)")
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
                  color: "#57534e",
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
                  (e.currentTarget.style.borderColor = "#0a5f7a")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor =
                    "rgba(0,0,0,0.1)")
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
                  color: "#57534e",
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
                  (e.currentTarget.style.borderColor = "#0a5f7a")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor =
                    "rgba(0,0,0,0.1)")
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
                background: "#0a0a0a",
                color: "#ffffff",
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
                style={{ fontSize: 13, color: "#57534e", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
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
                color: "#57534e",
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

          {/* ── Trial code section ── */}
          <div style={{ marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
            {!trialMode ? (
              <button
                type="button"
                onClick={() => { setTrialMode(true); setTrialError(""); }}
                style={{
                  width: "100%", textAlign: "center",
                  fontSize: 13, color: "#57534e", background: "none",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                  padding: "10px 0", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                Have a trial code?
              </button>
            ) : (
              <form onSubmit={handleRedeemTrial} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", textAlign: "center", margin: "0 0 4px" }}>
                  Enter your trial credentials
                </p>
                <div>
                  <label htmlFor="trial-code" style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#57534e", marginBottom: 6 }}>Code</label>
                  <input
                    id="trial-code"
                    type="text"
                    required
                    autoFocus
                    value={trialCode}
                    onChange={(e) => setTrialCode(e.target.value.toUpperCase())}
                    placeholder="BW-XXXXXX"
                    style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.08em", fontSize: 16, textAlign: "center" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#0a5f7a")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)")}
                  />
                </div>
                <div>
                  <label htmlFor="trial-password" style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#57534e", marginBottom: 6 }}>Password</label>
                  <input
                    id="trial-password"
                    type="text"
                    required
                    value={trialPassword}
                    onChange={(e) => setTrialPassword(e.target.value)}
                    placeholder="Enter trial password"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#0a5f7a")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)")}
                  />
                </div>
                {trialError && (
                  <p style={{
                    fontSize: 13, color: "#ff6b6b", margin: 0, textAlign: "center",
                    padding: "8px 12px", borderRadius: 8,
                    background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.15)",
                  }}>{trialError}</p>
                )}
                <button
                  type="submit"
                  disabled={trialLoading || !trialCode.trim() || !trialPassword.trim()}
                  style={{
                    width: "100%", padding: "12px 0", fontSize: 14, fontWeight: 700,
                    borderRadius: 10, border: "none", background: "#0a0a0a", color: "#ffffff",
                    cursor: trialLoading ? "wait" : "pointer",
                    opacity: trialLoading ? 0.6 : 1, transition: "opacity 0.15s",
                  }}
                >{trialLoading ? "Activating..." : "Activate Trial"}</button>
                <button
                  type="button"
                  onClick={() => { setTrialMode(false); setTrialError(""); }}
                  style={{ fontSize: 12, color: "#57534e", background: "none", border: "none", cursor: "pointer", textAlign: "center" }}
                >
                  Back to login
                </button>
              </form>
            )}
          </div>
          </>
          )}
        </div>

        <Link
          href="/"
          style={{
            fontSize: 12,
            color: "#57534e",
            textDecoration: "none",
          }}
        >
          &larr; Back to Blocwrite
        </Link>
        <p style={{ fontSize: 10, color: "#44403c", marginTop: 16, textAlign: "center" }}>© 2026 Blocwrite. All rights reserved.</p>
      </div>

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
