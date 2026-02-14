import Link from "next/link";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { StripeSetupCard } from "./components/StripeSetupCard";
import { CouponCard } from "./components/CouponCard";

export const dynamic = "force-dynamic";

/* ── helpers ────────────────────────────────────────────── */

async function countNovelsFromFile(): Promise<number> {
  try {
    const raw = await readFile(join(process.cwd(), "data", "novels.json"), "utf-8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

async function getNovelSummaries(): Promise<{ id: string; title: string; chapterCount: number; wordCount: number }[]> {
  try {
    const raw = await readFile(join(process.cwd(), "data", "novels.json"), "utf-8");
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
    const s = await stat(join(process.cwd(), "data", "novels.json"));
    const kb = s.size / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  } catch {
    return "\u2013";
  }
}

/* ── page ───────────────────────────────────────────────── */

export default async function AdminPage() {
  const adminEmail = await requireAdminPageAccess();

  // DB queries with fallback
  let userCount = 0;
  let subscriptionCounts: { status: string; count: number }[] = [];
  let recentEvents: { id: string; eventType: string; status: string; processedAt: Date }[] = [];

  try {
    const [uc, sc, re] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.stripeWebhookEvent.findMany({ orderBy: { processedAt: "desc" }, take: 10 }),
    ]);
    userCount = uc;
    subscriptionCounts = sc.map((r) => ({ status: r.status, count: r._count.status }));
    recentEvents = re;
  } catch {
    // DB not ready
  }

  const statusMap = new Map(subscriptionCounts.map((r) => [r.status, r.count]));
  const [novelCount, novelSummaries, dataFileSize] = await Promise.all([
    countNovelsFromFile(),
    getNovelSummaries(),
    getDataFileSize(),
  ]);

  return (
    <main className="pw-wallpaper" style={{ minHeight: "100vh" }}>
      <div
        className="pw-window"
        style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "75vh" }}
      >
        {/* ── sidebar ── */}
        <aside className="pw-sidebar">
          <div className="pw-logo">
            <img src="/blocwrite-logo-white.png" alt="Blocwrite" className="pw-logo-full" />
          </div>
          <div className="pw-section-title">Admin Hub</div>
          <div className="pw-list">
            <Link href="/admin" className="pw-item active">Dashboard</Link>
            <Link href="/studio" className="pw-item">Open Studio</Link>
          </div>
          <div className="pw-sidebar-foot">
            <span className="pw-sidebar-user" style={{ fontSize: 12, opacity: 0.7 }}>{adminEmail}</span>
          </div>
        </aside>

        {/* ── main ── */}
        <section style={{ padding: 28, overflow: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Admin Dashboard</h1>
              <p style={{ fontSize: 13, color: "var(--pw-text-dim)", margin: "4px 0 0" }}>
                Connect Stripe, manage discounts, and see your stats
              </p>
            </div>
            <Link href="/studio" className="btn btn-primary" style={{ fontSize: 13, padding: "8px 18px" }}>
              Go to Studio
            </Link>
          </div>

          {/* ── 1. Stripe Setup (interactive client component) ── */}
          <StripeSetupCard />

          {/* ── 2. Discount Codes (interactive client component) ── */}
          <CouponCard />

          {/* ── 3. Stats cards ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <StatCard value={novelCount} label="Novels" />
            <StatCard value={dataFileSize} label="Data size" />
            <StatCard value={userCount} label="Registered users" />
            <StatCard value={statusMap.get("active") ?? 0} label="Active subs" />
            <StatCard value={statusMap.get("trialing") ?? 0} label="Trialing" />
            <StatCard value={statusMap.get("past_due") ?? 0} label="Past due" />
          </div>

          {/* ── 4. Two-column: novels + webhooks ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Novels */}
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                Novels ({novelCount})
              </h3>
              {novelSummaries.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>No novels yet. Create one in the Studio.</p>
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
                          {n.wordCount > 0 ? ` \u00B7 ${n.wordCount.toLocaleString()} words` : ""}
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
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Webhook Log</h3>
              {recentEvents.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>
                  No webhook events received yet. They'll appear here once Stripe is connected and sending events.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {recentEvents.map((event) => (
                    <div
                      key={event.id}
                      style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--pw-border-light)", fontSize: 12 }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{event.eventType}</span>
                        <span style={{ fontWeight: 600, color: event.status === "processed" ? "#22c55e" : "#ef4444" }}>
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

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--pw-text-dim)", marginTop: 4 }}>{label}</div>
    </div>
  );
}
