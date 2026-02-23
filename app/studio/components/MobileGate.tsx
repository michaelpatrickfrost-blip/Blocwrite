"use client";

import { useState, useEffect, useCallback } from "react";

const MIN_WIDTH = 900; // px – anything below this is unusable for the studio

/* ── Subscription info type (mirrors ProfilePopup) ── */
type SubInfo = {
  plan: string | null;
  status: string | null;
  isAdmin: boolean;
  email?: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  daysRemaining: number | null;
};

/* ════════════════════════════════════════════════════════
   Mobile Account Panel — shown when the screen is too narrow
   Gives mobile users access to:
     • Subscription details
     • Change password
     • Cancel subscription
     • Sign out
   ════════════════════════════════════════════════════════ */
function MobileAccountPanel() {
  /* ── Subscription state ── */
  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  /* ── Password state ── */
  const [pwExpanded, setPwExpanded] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  /* ── Fetch subscription on mount ── */
  useEffect(() => {
    fetch("/api/billing/subscription")
      .then((r) => r.json())
      .then((data: SubInfo) => setSubInfo(data))
      .catch(() => setSubInfo(null))
      .finally(() => setSubLoading(false));
  }, []);

  /* ── Logout ── */
  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    try {
      localStorage.clear();
    } catch { /* ignore */ }
    window.location.href = "/";
  }, []);

  /* ── Cancel subscription ── */
  const handleCancel = useCallback(async () => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/billing/cancel-subscription", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setCancelSuccess(true);
        setCancelConfirm(false);
        const r2 = await fetch("/api/billing/subscription");
        const updated = (await r2.json()) as SubInfo;
        setSubInfo(updated);
      } else {
        setCancelError(data.error || "Failed to cancel.");
      }
    } catch {
      setCancelError("Network error. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  }, []);

  /* ── Change password ── */
  const handleChangePassword = useCallback(async () => {
    setPwError(null);
    setPwSuccess(false);
    if (!pwCurrent || !pwNew || !pwConfirm) { setPwError("All fields are required."); return; }
    if (pwNew.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (pwNew !== pwConfirm) { setPwError("New passwords do not match."); return; }
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew, confirmPassword: pwConfirm }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setPwSuccess(true);
        setPwCurrent(""); setPwNew(""); setPwConfirm("");
        setTimeout(() => { setPwExpanded(false); setPwSuccess(false); }, 2000);
      } else {
        setPwError(data.error || "Failed to change password.");
      }
    } catch {
      setPwError("Network error. Please try again.");
    } finally {
      setPwLoading(false);
    }
  }, [pwCurrent, pwNew, pwConfirm]);

  /* ── Shared styles ── */
  const card: React.CSSProperties = {
    padding: "16px 18px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 16,
  };
  const label: React.CSSProperties = { display: "block", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 };
  const input: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 14px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#e4e4e7", fontSize: 14, outline: "none",
  };
  const btn: React.CSSProperties = {
    padding: "10px 20px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.06)",
    color: "#e4e4e7", fontSize: 14, fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      padding: "0 20px 40px",
      background: "#111114",
      color: "#e4e4e7",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      {/* ── Header ── */}
      <div style={{ textAlign: "center", padding: "36px 0 8px" }}>
        <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 36, marginBottom: 20 }} />

        {/* Monitor icon */}
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(124,92,252,0.6)"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ display: "block", margin: "0 auto 16px" }}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>

        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>
          Desktop only
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.45)", maxWidth: 320, margin: "0 auto 24px" }}>
          The writing studio requires a larger screen. You can manage your account below.
        </p>
      </div>

      {/* ── Account section ── */}
      <div style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}>

        {/* Subscription card */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Subscription
          </div>

          {subLoading ? (
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Loading...</p>
          ) : subInfo?.status || subInfo?.isAdmin ? (
            <>
              {/* Status pill */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: subInfo.cancelAtPeriodEnd ? "#f59e0b" : subInfo.status === "trialing" ? "#8b5cf6" : "#10b981",
                }} />
                <span style={{ fontSize: 15, fontWeight: 700 }}>
                  {subInfo.status === "trialing" ? "Free Trial"
                    : subInfo.cancelAtPeriodEnd ? "Cancelling" : "Active"}
                </span>
                {subInfo.plan && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                    textTransform: "uppercase", letterSpacing: "0.04em", marginLeft: "auto",
                  }}>
                    {subInfo.plan}
                  </span>
                )}
              </div>

              {/* Dates */}
              <div style={{ display: "grid", gap: 6, fontSize: 13, marginBottom: 12 }}>
                {subInfo.status === "trialing" && subInfo.trialEnd && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Trial ends</span>
                    <span style={{ fontWeight: 600 }}>
                      {new Date(subInfo.trialEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}
                {subInfo.currentPeriodEnd && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                      {subInfo.cancelAtPeriodEnd ? "Access until" : "Next billing"}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {new Date(subInfo.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}
                {subInfo.daysRemaining !== null && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Remaining</span>
                    <span style={{ fontWeight: 600 }}>
                      {subInfo.daysRemaining === 0 ? "Less than a day"
                        : subInfo.daysRemaining === 1 ? "1 day" : `${subInfo.daysRemaining} days`}
                    </span>
                  </div>
                )}
              </div>

              {/* Cancel subscription */}
              {!subInfo.cancelAtPeriodEnd && !cancelSuccess && (
                <>
                  {!cancelConfirm ? (
                    <button type="button" style={{ ...btn, fontSize: 13, color: "rgba(255,255,255,0.45)", background: "transparent", border: "none", padding: "6px 0" }}
                      onClick={() => setCancelConfirm(true)}>
                      Cancel subscription
                    </button>
                  ) : (
                    <div style={{ padding: 14, borderRadius: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", marginTop: 4 }}>
                      <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
                        Are you sure? Access continues until the end of your billing period.
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" disabled={cancelLoading} onClick={handleCancel}
                          style={{ ...btn, background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 13 }}>
                          {cancelLoading ? "Cancelling..." : "Yes, cancel"}
                        </button>
                        <button type="button" onClick={() => { setCancelConfirm(false); setCancelError(null); }}
                          style={{ ...btn, fontSize: 13 }}>
                          Keep
                        </button>
                      </div>
                      {cancelError && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8, marginBottom: 0 }}>{cancelError}</p>}
                    </div>
                  )}
                </>
              )}
              {subInfo.cancelAtPeriodEnd && !cancelSuccess && (
                <p style={{ fontSize: 13, color: "#f59e0b", marginTop: 4, marginBottom: 0 }}>
                  Set to cancel. Full access until the end of your billing period.
                </p>
              )}
              {cancelSuccess && (
                <p style={{ fontSize: 13, color: "#10b981", marginTop: 4, marginBottom: 0 }}>
                  Subscription cancelled. Access continues until the end of your billing period.
                </p>
              )}
            </>
          ) : (
            <div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>No active subscription.</p>
              <a href="/subscribe" style={{ ...btn, display: "inline-block", textDecoration: "none", background: "rgba(124,92,252,0.12)", color: "#b8a4ff", border: "1px solid rgba(124,92,252,0.2)" }}>
                Subscribe
              </a>
            </div>
          )}
        </div>

        {/* Email */}
        {subInfo?.email && (
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Account
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={label}>Email</span>
              <input type="email" value={subInfo.email} disabled readOnly
                style={{ ...input, opacity: 0.5, cursor: "not-allowed" }} />
            </div>
          </div>
        )}

        {/* Password */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Password
          </div>

          {!pwExpanded ? (
            <button type="button" style={{ ...btn, width: "100%" }} onClick={() => { setPwExpanded(true); setPwError(null); setPwSuccess(false); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: "-2px" }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Change Password
            </button>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <span style={label}>Current Password</span>
                <input type="password" placeholder="Enter current password" value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)} disabled={pwLoading} style={input} />
              </div>
              <div>
                <span style={label}>New Password</span>
                <input type="password" placeholder="At least 6 characters" value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)} disabled={pwLoading} style={input} />
              </div>
              <div>
                <span style={label}>Confirm New Password</span>
                <input type="password" placeholder="Type new password again" value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)} disabled={pwLoading} style={input} />
              </div>

              {pwError && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{pwError}</p>}
              {pwSuccess && <p style={{ fontSize: 12, color: "#10b981", margin: 0 }}>Password changed successfully.</p>}

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={pwLoading} onClick={handleChangePassword}
                  style={{ ...btn, flex: 1 }}>
                  {pwLoading ? "Saving..." : "Update Password"}
                </button>
                <button type="button" style={{ ...btn, flex: 1, color: "rgba(255,255,255,0.45)" }}
                  onClick={() => { setPwExpanded(false); setPwError(null); setPwSuccess(false); setPwCurrent(""); setPwNew(""); setPwConfirm(""); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button type="button" onClick={handleLogout}
          style={{
            ...btn, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", color: "#ef4444",
            marginTop: 8,
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>

        {/* Back to homepage link */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <a href="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>
            ← Back to homepage
          </a>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MobileGate — wraps studio pages.
   On mobile/small screens: shows MobileAccountPanel.
   On desktop: renders children normally.
   ════════════════════════════════════════════════════════ */
export default function MobileGate({ children }: { children: React.ReactNode }) {
  const [tooSmall, setTooSmall] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = () => setTooSmall(window.innerWidth < MIN_WIDTH);
    check();
    setChecked(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Don't flash anything until we've measured
  if (!checked) return null;

  if (tooSmall) return <MobileAccountPanel />;

  return <>{children}</>;
}
