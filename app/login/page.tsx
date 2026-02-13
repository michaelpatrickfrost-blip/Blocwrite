"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");

    try {
      if (mode === "signup") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Unable to sign up");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    background: "rgba(255, 255, 255, 0.04)",
    padding: "11px 16px",
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.85)",
    outline: "none",
    transition: "border-color 180ms",
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div
        className="w-full max-w-md rounded-2xl p-8 space-y-6"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Image
              src="/pilotwriter-logo.png"
              alt="PilotWriter"
              width={52}
              height={52}
              className="rounded-xl"
              style={{
                boxShadow: "0 6px 16px rgba(0, 0, 0, 0.15)",
              }}
            />
          </div>
          <p
            className="text-xs uppercase font-medium"
            style={{ letterSpacing: "0.3em", color: "rgba(255, 255, 255, 0.35)" }}
          >
            Pilotwriter
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ color: "rgba(255, 255, 255, 0.9)" }}
          >
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
            {mode === "login"
              ? "Sign in to continue writing"
              : "Get started with PilotWriter"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <label
                className="block text-xs font-medium"
                style={{ color: "rgba(255, 255, 255, 0.35)" }}
              >
                Name
              </label>
              <input
                name="name"
                type="text"
                placeholder="Your name"
                style={inputStyle}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label
              className="block text-xs font-medium"
              style={{ color: "rgba(255, 255, 255, 0.35)" }}
            >
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="block text-xs font-medium"
              style={{ color: "rgba(255, 255, 255, 0.35)" }}
            >
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              className="rounded-lg px-4 py-3 text-sm font-medium"
              style={{
                border: "1px solid rgba(220, 38, 38, 0.2)",
                background: "rgba(220, 38, 38, 0.08)",
                color: "#fca5a5",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full justify-center"
            style={{
              padding: "11px 16px",
              fontSize: "14px",
              borderRadius: "10px",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? "Working..."
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        <div className="text-center">
          <button
            className="text-sm"
            style={{
              color: "rgba(255, 255, 255, 0.35)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
          >
            {mode === "login"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
