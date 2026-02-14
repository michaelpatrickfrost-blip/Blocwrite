import Link from "next/link";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/* ── helpers ────────────────────────────────────────────── */

function envCheck(name: string): { ok: boolean; label: string } {
  const val = process.env[name];
  return { ok: Boolean(val && val.length > 4), label: name };
}

async function countNovelsFromFile(): Promise<number> {
  try {
    const novelsPath = join(process.cwd(), "data", "novels.json");
    const raw = await readFile(novelsPath, "utf-8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

async function getNovelSummaries(): Promise<{ id: string; title: string; chapterCount: number; wordCount: number }[]> {
  try {
    const novelsPath = join(process.cwd(), "data", "novels.json");
    const raw = await readFile(novelsPath, "utf-8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 20).map((n: Record<string, unknown>) => ({
      id: String(n.id ?? ""),
      title: String(n.title ?? "Untitled"),
      chapterCount: Array.isArray(n.chapters) ? n.chapters.length : 0,
      wordCount: typeof n.wordCount === "number" ? n.wordCount : 0,
    }));
  } catch {
    return [];
  }
}

async function getDataFileSize(): Promise<string> {
  try {
    const novelsPath = join(process.cwd(), "data", "novels.json");
    const s = await stat(novelsPath);
    const kb = s.size / 1024;
    if (kb > 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${kb.toFixed(0)} KB`;
  } catch {
    return "–";
  }
}

/* ── page ───────────────────────────────────────────────── */

export default async function AdminPage() {
  const adminEmail = await requireAdminPageAccess();

  // Environment checks
  const envChecks = [
    envCheck("BW_SESSION_SECRET"),
    envCheck("DATABASE_URL"),
    envCheck("STRIPE_SECRET_KEY"),
    envCheck("STRIPE_WEBHOOK_SECRET"),
    envCheck("STRIPE_PRICE_ID"),
    envCheck("NEXT_PUBLIC_APP_URL"),
  ];
  const stripeReady = envChecks
    .filter((e) => e.label.startsWith("STRIPE"))
    .every((e) => e.ok);

  // Data queries (all wrapped in try/catch for resilience)
  let userCount = 0;
  let subscriptionCounts: { status: string; count: number }[] = [];
  let recentEvents: { id: string; stripeEventId: string; eventType: string; status: string; processedAt: Date }[] = [];

  try {
    const [uc, sc, re] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.stripeWebhookEvent.findMany({
        orderBy: { processedAt: "desc" },
        take: 10,
      }),
    ]);
    userCount = uc;
    subscriptionCounts = sc.map((r) => ({ status: r.status, count: r._count.status }));
    recentEvents = re;
  } catch {
    // DB might not have tables yet — that's fine
  }

  const statusMap = new Map(subscriptionCounts.map((r) => [r.status, r.count]));

  // Novel data (file-based)
  const [novelCount, novelSummaries, dataFileSize] = await Promise.all([
    countNovelsFromFile(),
    getNovelSummaries(),
    getDataFileSize(),
  ]);

  const allGreen = envChecks.every((e) => e.ok);

  return (
    <main className="pw-wallpaper" style={{ minHeight: "100vh" }}>
      <div
        className="pw-window"
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          minHeight: "75vh",
        }}
      >
        {/* ── sidebar ── */}
        <aside className="pw-sidebar">
          <div className="pw-logo">
            <img src="/blocwrite-main-dark.png" alt="Blocwrite" className="pw-logo-full" />
          </div>
          <div className="pw-section-title">Admin Hub</div>
          <div className="pw-list">
            <Link href="/admin" className="pw-item active">
              Dashboard
            </Link>
            <Link href="/studio" className="pw-item">
              Open Studio
            </Link>
          </div>
          <div className="pw-sidebar-foot">
            <span className="pw-sidebar-user" style={{ fontSize: 12, opacity: 0.7 }}>
              {adminEmail}
            </span>
          </div>
        </aside>

        {/* ── main content ── */}
        <section style={{ padding: 28, overflow: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Admin Dashboard</h1>
              <p style={{ fontSize: 13, color: "var(--pw-text-dim)", margin: "4px 0 0" }}>
                System status and billing overview
              </p>
            </div>
            <Link
              href="/studio"
              className="btn btn-primary"
              style={{ fontSize: 13, padding: "8px 18px" }}
            >
              Go to Studio
            </Link>
          </div>

          {/* ── system health ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              System Status
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: allGreen ? "#22c55e" : "#eab308",
                  marginLeft: 8,
                  verticalAlign: "middle",
                }}
              />
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {envChecks.map((check) => (
                <div
                  key={check.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--pw-border-light)",
                    background: check.ok ? "rgba(34,197,94,0.06)" : "rgba(234,179,8,0.06)",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{check.ok ? "\u2705" : "\u26A0\uFE0F"}</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 500 }}>{check.label}</span>
                  <span style={{ marginLeft: "auto", fontWeight: 600, color: check.ok ? "#22c55e" : "#eab308" }}>
                    {check.ok ? "Set" : "Missing"}
                  </span>
                </div>
              ))}
            </div>
            {!stripeReady && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(234,179,8,0.08)",
                  border: "1px solid rgba(234,179,8,0.2)",
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "var(--pw-text-dim)",
                }}
              >
                <strong>Stripe not configured.</strong> Add{" "}
                <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>, and{" "}
                <code>STRIPE_PRICE_ID</code> to your <code>.env</code> file and restart.
                Billing features will show placeholder data until then.
              </div>
            )}
          </div>

          {/* ── stat cards ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{novelCount}</div>
              <div style={{ fontSize: 12, color: "var(--pw-text-dim)", marginTop: 4 }}>Novels</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{dataFileSize}</div>
              <div style={{ fontSize: 12, color: "var(--pw-text-dim)", marginTop: 4 }}>Data size</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{userCount}</div>
              <div style={{ fontSize: 12, color: "var(--pw-text-dim)", marginTop: 4 }}>
                Registered users
              </div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{statusMap.get("active") ?? 0}</div>
              <div style={{ fontSize: 12, color: "var(--pw-text-dim)", marginTop: 4 }}>
                Active subs
              </div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{statusMap.get("trialing") ?? 0}</div>
              <div style={{ fontSize: 12, color: "var(--pw-text-dim)", marginTop: 4 }}>Trialing</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{statusMap.get("past_due") ?? 0}</div>
              <div style={{ fontSize: 12, color: "var(--pw-text-dim)", marginTop: 4 }}>Past due</div>
            </div>
          </div>

          {/* ── two-column: novels + webhooks ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Novels */}
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                Novels ({novelCount})
              </h3>
              {novelSummaries.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>
                  No novels yet. Create one in the Studio.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {novelSummaries.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--pw-border-light)",
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{n.title}</div>
                        <div style={{ color: "var(--pw-text-dim)", marginTop: 2 }}>
                          {n.chapterCount} chapter{n.chapterCount !== 1 ? "s" : ""}
                          {n.wordCount > 0 ? ` · ${n.wordCount.toLocaleString()} words` : ""}
                        </div>
                      </div>
                      <Link
                        href={`/studio/${n.id}`}
                        style={{
                          fontSize: 11,
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: "var(--pw-accent)",
                          color: "var(--pw-btn-primary-text)",
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Webhook log */}
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                Stripe Webhook Log
              </h3>
              {!stripeReady ? (
                <p style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>
                  Stripe is not configured. Webhooks will appear here once connected.
                </p>
              ) : recentEvents.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>
                  No webhook events received yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {recentEvents.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--pw-border-light)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 600, fontFamily: "monospace" }}>
                          {event.eventType}
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            color: event.status === "processed" ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {event.status}
                        </span>
                      </div>
                      <div style={{ color: "var(--pw-text-dim)", marginTop: 2 }}>
                        {new Date(event.processedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
