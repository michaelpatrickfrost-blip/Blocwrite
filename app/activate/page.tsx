"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { activateLicense, isActivated } from "@/lib/license";

const TERMS_NOTICE = `By activating Blocwrite, you agree to our Terms & Conditions and Refund Policy. These documents govern your use of the service, subscriptions, billing, and data handling.

Read the full documents at blocwrite.com/terms and blocwrite.com/refunds before proceeding.`;

export default function ActivatePage() {
  const router = useRouter();
  const [serial, setSerial] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    if (isActivated()) {
      router.replace("/studio");
    }
  }, [router]);

  function handleActivate() {
    setError(null);
    if (!accepted) {
      setError("You must accept the Terms & Conditions to continue.");
      setShakeKey((k) => k + 1);
      return;
    }
    const trimmed = serial.trim();
    if (!trimmed) {
      setError("Please enter your serial code.");
      setShakeKey((k) => k + 1);
      return;
    }
    const success = activateLicense(trimmed);
    if (success) {
      router.replace("/studio");
    } else {
      setError("Invalid serial code. Please check and try again.");
      setShakeKey((k) => k + 1);
    }
  }

  function formatSerialInput(value: string) {
    // Auto-format as user types: PW26-XXXX-XXXX-XXXX (validator expects PW prefix)
    const clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 16);
    const parts: string[] = [];
    if (clean.length > 0) parts.push(clean.slice(0, 4));
    if (clean.length > 4) parts.push(clean.slice(4, 8));
    if (clean.length > 8) parts.push(clean.slice(8, 12));
    if (clean.length > 12) parts.push(clean.slice(12, 16));
    return parts.join("-");
  }

  return (
    <div className="pw-activate-page">
      <div className="pw-activate-glow" aria-hidden />

      <div className="pw-activate-card">
        <div className="pw-activate-logo">
          <img src="/blocwrite-logo-black.png" alt="Blocwrite" className="pw-activate-logo-img" />
        </div>

        <h1 className="pw-activate-title">Activate Blocwrite</h1>
        <p className="pw-activate-subtitle">
          Enter your serial code to unlock the full application.
        </p>

        {/* Terms & Conditions */}
        <div className="pw-activate-terms-box">
          <div className="pw-activate-terms-label">Legal</div>
          <div className="pw-activate-terms-scroll">
            <p className="pw-activate-terms-text" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {TERMS_NOTICE}
            </p>
          </div>
          <label className="pw-activate-checkbox-row">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => {
                setAccepted(e.target.checked);
                if (e.target.checked) setError(null);
              }}
            />
            <span>
              I have read and agree to the{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/refunds" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
                Refund Policy
              </Link>
            </span>
          </label>
        </div>

        {/* Serial Code */}
        <div className="pw-activate-serial-section">
          <label className="pw-activate-serial-label" htmlFor="serial-input">
            Serial Code
          </label>
          <input
            id="serial-input"
            type="text"
            className={`pw-activate-serial-input${error ? " pw-activate-error-input" : ""}`}
            value={serial}
            onChange={(e) => {
              setSerial(formatSerialInput(e.target.value));
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleActivate();
            }}
            placeholder="PW26-XXXX-XXXX-XXXX"
            spellCheck={false}
            autoComplete="off"
            autoFocus
          />
        </div>

        {error && (
          <p key={shakeKey} className="pw-activate-error">
            {error}
          </p>
        )}

        <button
          type="button"
          className="pw-activate-btn"
          onClick={handleActivate}
        >
          Activate
        </button>

        <p className="pw-activate-footer">
          © 2026 Blocwrite. All rights reserved.
        </p>
      </div>
    </div>
  );
}
