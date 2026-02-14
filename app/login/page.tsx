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
        } | null;

        if (res.ok && data?.ok) {
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
            src="/blocwrite-main-dark.png"
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
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {mode === "login"
              ? "Sign in to continue writing"
              : "Start your 7-day free trial"}
          </p>

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

          <div style={{ textAlign: "center", marginTop: 18 }}>
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
