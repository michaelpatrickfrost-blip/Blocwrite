"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const C = {
  bg: "#ffffff",
  bgSoft: "#f8f8fa",
  bgDark: "#1a1a1f",
  text: "#1a1a1f",
  textSoft: "#64666d",
  textMuted: "#9ea0a8",
  border: "#e5e6ea",
  btnBg: "linear-gradient(135deg, #2a2a30, #1a1a1f)",
  btnText: "#ffffff",
};

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (res.ok) {
        setStatus("sent");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg((data as { error?: string }).error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Unable to send message. Please try again later.");
      setStatus("error");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    fontSize: 15,
    fontFamily: "inherit",
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    background: C.bg,
    color: C.text,
    outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 28px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.04em", lineHeight: 1 }}>
              <span style={{ color: "#4d6a00", fontWeight: 900 }}>/</span>Blocwrite
            </span>
          </Link>
          <Link href="/" style={{ fontSize: 14, fontWeight: 500, color: C.textSoft, textDecoration: "none" }}>
            &larr; Back to Home
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 28px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12 }}>
          Contact us
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: C.textSoft, marginBottom: 40 }}>
          Have a question, suggestion, or need help? Send us a message and we will get back to you.
          You can also email us directly at{" "}
          <a href="mailto:customerservice@blocwrite.com" style={{ color: C.text, fontWeight: 600 }}>
            customerservice@blocwrite.com
          </a>.
        </p>

        {status === "sent" ? (
          <div
            style={{
              padding: 32,
              borderRadius: 16,
              background: C.bgSoft,
              border: `1px solid ${C.border}`,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Message sent</p>
            <p style={{ fontSize: 15, color: C.textSoft }}>
              Thank you for reaching out. We will reply to your email as soon as we can.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              style={{
                marginTop: 20,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 600,
                border: `1.5px solid ${C.border}`,
                borderRadius: 10,
                background: "transparent",
                color: C.text,
                cursor: "pointer",
              }}
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.textSoft, marginBottom: 6 }}>
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.text; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.textSoft, marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.text; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.textSoft, marginBottom: 6 }}>
                Message
              </label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.text; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>

            {status === "error" && errorMsg && (
              <p style={{ fontSize: 14, color: "#dc2626", margin: 0 }}>{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              style={{
                padding: "14px 0",
                fontSize: 15,
                fontWeight: 600,
                color: C.btnText,
                background: C.btnBg,
                border: "none",
                borderRadius: 12,
                cursor: status === "sending" ? "not-allowed" : "pointer",
                opacity: status === "sending" ? 0.7 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {status === "sending" ? "Sending..." : "Send message"}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <footer style={{ padding: "48px 0 40px", background: "#0e0e12", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 80 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 32, width: "auto", opacity: 0.6 }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>
              &copy; {new Date().getFullYear()} Blocwrite
            </span>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {[
              { label: "Home", href: "/" },
              { label: "Terms", href: "/terms" },
              { label: "Refund Policy", href: "/refunds" },
              { label: "Contact", href: "/contact" },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
