"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { activateLicense, isActivated } from "@/lib/license";

const TERMS_AND_CONDITIONS = `
PILOTWRITER SOFTWARE LICENSE AGREEMENT

Last updated: February 2026

By activating this software, you agree to the following terms and conditions. Please read them carefully before proceeding.

1. LICENSE GRANT
PilotWriter grants you a non-exclusive, non-transferable, revocable license to use this software on a single device for personal or commercial creative writing purposes. This license is tied to the serial code entered during activation.

2. PERMITTED USE
You may use PilotWriter to create, edit, plan, and export written works including but not limited to novels, screenplays, short stories, and other literary works. All content you create using PilotWriter remains your sole intellectual property.

3. RESTRICTIONS
You may not:
  (a) Redistribute, sublicense, rent, lease, or lend this software to any third party.
  (b) Reverse-engineer, decompile, or disassemble the software.
  (c) Remove, alter, or obscure any proprietary notices or labels on the software.
  (d) Share, publish, or distribute your serial code to others.
  (e) Use the software for any unlawful purpose.

4. INTELLECTUAL PROPERTY
PilotWriter and all associated trademarks, logos, and visual assets are the property of PilotWriter. This agreement does not transfer any ownership rights to you. Your written content created within the software is entirely yours.

5. AI-ASSISTED FEATURES
PilotWriter includes optional AI-assisted writing features powered by third-party language model providers. By using these features, you acknowledge that:
  (a) Text may be sent to external API services for processing.
  (b) You are responsible for configuring your own API keys.
  (c) PilotWriter does not store, retain, or transmit your content to its own servers.

6. DATA STORAGE
All your novel data, canon, and manuscripts are stored locally on your device. PilotWriter does not collect, transmit, or store your creative content on remote servers. You are responsible for maintaining backups of your work.

7. DISCLAIMER OF WARRANTIES
This software is provided "as is" without warranty of any kind, express or implied. PilotWriter does not warrant that the software will be error-free or uninterrupted.

8. LIMITATION OF LIABILITY
In no event shall PilotWriter be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with the use of this software, including but not limited to loss of data, loss of profits, or interruption of creative work.

9. TERMINATION
This license is effective until terminated. PilotWriter may terminate this license at any time if you fail to comply with any term of this agreement. Upon termination, you must cease all use of the software and destroy all copies.

10. UPDATES
PilotWriter may release updates, patches, or new versions of the software. This license applies to updates provided to you, unless a separate license accompanies the update.

11. GOVERNING LAW
This agreement shall be governed by and construed in accordance with applicable law, without regard to conflict of law principles.

12. ENTIRE AGREEMENT
This agreement constitutes the entire agreement between you and PilotWriter regarding the use of this software and supersedes all prior agreements and understandings.

By entering a valid serial code and clicking "Activate", you confirm that you have read, understood, and agree to be bound by these terms and conditions.

© 2026 PilotWriter. All rights reserved.
`.trim();

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
    // Auto-format as user types: PW26-XXXX-XXXX-XXXX
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
          <img src="/pilotwriter-logo.png" alt="PilotWriter" className="pw-activate-logo-img" />
        </div>

        <h1 className="pw-activate-title">Activate PilotWriter</h1>
        <p className="pw-activate-subtitle">
          Enter your serial code to unlock the full application.
        </p>

        {/* Terms & Conditions */}
        <div className="pw-activate-terms-box">
          <div className="pw-activate-terms-label">Terms &amp; Conditions</div>
          <div className="pw-activate-terms-scroll">
            <pre className="pw-activate-terms-text">{TERMS_AND_CONDITIONS}</pre>
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
            <span>I have read and agree to the Terms &amp; Conditions</span>
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
          &copy; {new Date().getFullYear()} Blocwrite. All rights reserved.
        </p>
      </div>
    </div>
  );
}
