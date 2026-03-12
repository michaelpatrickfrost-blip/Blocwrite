"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        error?: string;
      } | null;

      if (res.ok && data?.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login?reason=password-reset"), 2000);
      } else {
        setError(data?.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token || !email) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "linear-gradient(165deg, #fdfcfa 0%, #f8f7f5 100%)",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <img src="/blocwrite-logo-black.png" alt="Blocwrite" style={{ height: 48, width: "auto", maxWidth: 200, objectFit: "contain" }} />
          </Link>
          <p style={{ color: "#ff6b6b", marginTop: 24, fontSize: 14 }}>
            Invalid reset link. Please request a new password reset from the login page.
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              marginTop: 16,
              padding: "10px 24px",
              background: "#0a0a0a",
              color: "#ffffff",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#fafaf9",
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
        <Link href="/" style={{ textDecoration: "none" }}>
          <img src="/blocwrite-logo-black.png" alt="Blocwrite" style={{ height: 48, width: "auto", maxWidth: 200, objectFit: "contain" }} />
        </Link>

        <div
          style={{
            width: "100%",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "#ffffff",
            padding: "32px 28px",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>
            Set new password
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#57534e",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {email}
          </p>

          {success ? (
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: 14,
                  color: "#69db7c",
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "rgba(105,219,124,0.08)",
                  border: "1px solid rgba(105,219,124,0.15)",
                }}
              >
                Password reset! Redirecting to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label
                  htmlFor="new-password"
                  style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#57534e", marginBottom: 6 }}
                >
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  autoFocus
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#1e3a5f")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)")}
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#57534e", marginBottom: 6 }}
                >
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#1e3a5f")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)")}
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
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>

        <Link
          href="/login"
          style={{ fontSize: 12, color: "#57534e", textDecoration: "none" }}
        >
          &larr; Back to sign in
        </Link>
        <p style={{ fontSize: 10, color: "#57534e", marginTop: 16, textAlign: "center" }}>© 2026 Blocwrite. All rights reserved.</p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
