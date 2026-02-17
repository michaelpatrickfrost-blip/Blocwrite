"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const C = {
  bg: "#f8f9fb",
  surface: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  text: "#1a1a2e",
  dim: "rgba(0,0,0,0.45)",
  accent: "#16a34a",
  accentDim: "rgba(22,163,74,0.08)",
  danger: "#dc2626",
  dangerDim: "rgba(220,38,38,0.06)",
  warn: "#d97706",
  blue: "#2563eb",
  blueDim: "rgba(37,99,235,0.06)",
};

type AdminAlert = {
  id: string;
  message: string;
  active: boolean;
  scheduledFor: string;
  createdAt: string;
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function toLocalDatetimeStr(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  fontSize: 13,
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.surface,
  color: C.text,
  outline: "none",
};

const cardStyle: React.CSSProperties = {
  background: C.surface,
  borderRadius: 14,
  border: `1px solid ${C.border}`,
  padding: "20px 22px",
};

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertSchedule, setAlertSchedule] = useState("");
  const [alertSending, setAlertSending] = useState(false);
  const [alertStatusMsg, setAlertStatusMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadAlerts() {
    try {
      const res = await fetch("/api/admin/alerts");
      if (res.ok) setAlerts(await res.json());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadAlerts();
  }, []);

  async function sendAlert() {
    if (!alertMsg.trim()) return;
    if (alertSchedule && new Date(alertSchedule) <= new Date()) {
      setAlertStatusMsg("Scheduled time must be in the future.");
      return;
    }
    setAlertSending(true);
    setAlertStatusMsg("");
    try {
      const scheduledFor = alertSchedule ? new Date(alertSchedule).toISOString() : undefined;
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: alertMsg.trim(), scheduledFor }),
      });
      if (res.ok) {
        setAlertStatusMsg(
          alertSchedule ? "Alert scheduled!" : "Alert sent to all users!"
        );
        setAlertMsg("");
        setAlertSchedule("");
        void loadAlerts();
      } else {
        setAlertStatusMsg("Failed to send alert.");
      }
    } catch {
      setAlertStatusMsg("Connection error.");
    }
    setAlertSending(false);
  }

  async function dismissAlert(id: string) {
    try {
      await fetch("/api/admin/alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      void loadAlerts();
    } catch {
      /* ignore */
    }
  }

  function reUseAlert(a: AdminAlert) {
    setAlertMsg(a.message);
    setAlertSchedule("");
    setAlertStatusMsg("Alert message loaded — adjust and send when ready.");
  }

  const now = new Date();
  const liveAlerts = alerts.filter(
    (a) => a.active && new Date(a.scheduledFor) <= now
  );
  const scheduledAlerts = alerts.filter(
    (a) => a.active && new Date(a.scheduledFor) > now
  );
  const pastAlerts = alerts.filter((a) => !a.active);

  const navLinks = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/blog", label: "Blog" },
    { href: "/studio", label: "Studio" },
    { href: "/admin/alerts", label: "Alerts", active: true },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          borderBottom: `1px solid ${C.border}`,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/admin" style={{ display: "flex", alignItems: "center" }}>
            <img
              src="/blocwrite-logo-black.png"
              alt="Blocwrite"
              style={{ height: 28 }}
            />
          </Link>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Push Alerts</span>
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {navLinks.map((link) =>
              link.active ? (
                <span
                  key={link.label}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    background: C.accentDim,
                    color: C.accent,
                    border: `1px solid rgba(22,163,74,0.25)`,
                  }}
                >
                  {link.label}
                </span>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.dim,
                    textDecoration: "none",
                    transition: "color 0.15s",
                  }}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        {loading && (
          <p
            style={{
              textAlign: "center",
              color: C.dim,
              padding: "60px 0",
            }}
          >
            Loading...
          </p>
        )}

        {!loading && (
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: C.dangerDim,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.danger}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </div>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                Push Alerts
              </h1>
            </div>
            <p
              style={{
                fontSize: 13,
                color: C.dim,
                margin: "0 0 20px",
                lineHeight: 1.5,
              }}
            >
              Send a notification to all users. Shows for 15 seconds then
              auto-dismisses. Scheduled alerts go live automatically at the set
              time, even when you&apos;re not logged in.
            </p>

            {/* Create alert form */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "flex-end",
                marginBottom: 18,
              }}
            >
              <div style={{ flex: "1 1 280px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: C.dim,
                    marginBottom: 4,
                    fontWeight: 600,
                  }}
                >
                  Message
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled maintenance at 2am UTC tonight..."
                  value={alertMsg}
                  onChange={(e) => setAlertMsg(e.target.value)}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                  maxLength={500}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: C.dim,
                    marginTop: 2,
                    display: "block",
                  }}
                >
                  {alertMsg.length}/500
                </span>
              </div>
              <div style={{ flex: "0 0 200px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: C.dim,
                    marginBottom: 4,
                    fontWeight: 600,
                  }}
                >
                  Show at (leave blank = now)
                </label>
                <input
                  type="datetime-local"
                  value={alertSchedule}
                  onChange={(e) => setAlertSchedule(e.target.value)}
                  min={toLocalDatetimeStr(new Date().toISOString())}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => void sendAlert()}
                disabled={alertSending || !alertMsg.trim()}
                style={{
                  padding: "10px 22px",
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  background: alertSchedule ? C.blue : C.danger,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  opacity: alertSending ? 0.6 : 1,
                }}
              >
                {alertSending
                  ? "Sending..."
                  : alertSchedule
                    ? "Schedule Alert"
                    : "Send Now"}
              </button>
            </div>

            {alertStatusMsg && (
              <p
                style={{
                  fontSize: 12,
                  color:
                    alertStatusMsg.includes("sent") ||
                    alertStatusMsg.includes("scheduled") ||
                    alertStatusMsg.includes("loaded")
                      ? C.accent
                      : C.danger,
                  margin: "0 0 16px",
                }}
              >
                {alertStatusMsg}
              </p>
            )}

            {/* Alert list sections */}
            {(liveAlerts.length > 0 ||
              scheduledAlerts.length > 0 ||
              pastAlerts.length > 0) && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                <style>{`@keyframes alertPulse { 0%,100% { opacity:1; box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { opacity:0.6; box-shadow: 0 0 0 4px rgba(239,68,68,0); } }`}</style>

                {/* Live Now */}
                {liveAlerts.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: C.danger,
                          animation: "alertPulse 2s ease-in-out infinite",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: C.danger,
                        }}
                      >
                        Live Now ({liveAlerts.length})
                      </span>
                    </div>
                    {liveAlerts.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          borderRadius: 8,
                          marginBottom: 8,
                          background: C.dangerDim,
                          border: `1px solid rgba(239,68,68,0.2)`,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              fontSize: 13,
                              margin: 0,
                              fontWeight: 600,
                            }}
                          >
                            {a.message}
                          </p>
                          <p
                            style={{
                              fontSize: 10,
                              color: C.dim,
                              margin: "4px 0 0",
                            }}
                          >
                            Sent {formatDateTime(a.scheduledFor)} — auto-expires
                            after 15s per user
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void dismissAlert(a.id)}
                          style={{
                            padding: "6px 16px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: "rgba(239,68,68,0.15)",
                            color: C.danger,
                            border: `1px solid rgba(239,68,68,0.25)`,
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          Deactivate
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Scheduled */}
                {scheduledAlerts.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={C.blue}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: C.blue,
                        }}
                      >
                        Scheduled ({scheduledAlerts.length})
                      </span>
                    </div>
                    {scheduledAlerts.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          borderRadius: 8,
                          marginBottom: 8,
                          background: C.blueDim,
                          border: `1px solid rgba(37,99,235,0.15)`,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              fontSize: 13,
                              margin: 0,
                              fontWeight: 600,
                            }}
                          >
                            {a.message}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              marginTop: 6,
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "3px 10px",
                                borderRadius: 6,
                                fontSize: 10,
                                fontWeight: 700,
                                background: "rgba(37,99,235,0.15)",
                                color: C.blue,
                              }}
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              in {timeUntil(a.scheduledFor)}
                            </span>
                            <span style={{ fontSize: 10, color: C.dim }}>
                              {formatDateTime(a.scheduledFor)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void dismissAlert(a.id)}
                          style={{
                            padding: "6px 16px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: "rgba(0,0,0,0.04)",
                            color: C.dim,
                            border: `1px solid ${C.border}`,
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Past */}
                {pastAlerts.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: C.dim,
                          opacity: 0.4,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: C.dim,
                        }}
                      >
                        Past ({pastAlerts.length})
                      </span>
                    </div>
                    {pastAlerts.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          borderRadius: 8,
                          marginBottom: 6,
                          background: C.surface,
                          border: `1px solid ${C.border}`,
                          opacity: 0.65,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              fontSize: 12,
                              margin: 0,
                              fontWeight: 500,
                            }}
                          >
                            {a.message}
                          </p>
                          <p
                            style={{
                              fontSize: 10,
                              color: C.dim,
                              margin: "2px 0 0",
                            }}
                          >
                            {formatDateTime(a.scheduledFor)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => reUseAlert(a)}
                          style={{
                            padding: "5px 14px",
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            background: "rgba(0,0,0,0.04)",
                            color: C.dim,
                            border: `1px solid ${C.border}`,
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                          title="Load this message into the form"
                        >
                          Re-use
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!loading &&
              liveAlerts.length === 0 &&
              scheduledAlerts.length === 0 &&
              pastAlerts.length === 0 && (
                <p
                  style={{
                    fontSize: 13,
                    color: C.dim,
                    textAlign: "center",
                    padding: "32px 0",
                  }}
                >
                  No alerts yet. Create one above.
                </p>
              )}
          </div>
        )}
      </div>

      <p
        style={{
          fontSize: 10,
          color: "rgba(0,0,0,0.2)",
          textAlign: "center",
          padding: "24px 0 12px",
        }}
      >
        &copy; {new Date().getFullYear()} Blocwrite. All rights reserved.
      </p>
    </div>
  );
}
