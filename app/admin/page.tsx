import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const adminEmail = await requireAdminPageAccess();

  const [userCount, subscriptionCounts, recentUsers, recentEvents] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        subscriptions: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            status: true,
            stripePriceId: true,
            currentPeriodEnd: true,
          },
        },
      },
    }),
    prisma.stripeWebhookEvent.findMany({
      orderBy: { processedAt: "desc" },
      take: 8,
    }),
  ]);

  const statusMap = new Map(subscriptionCounts.map((row) => [row.status, row._count.status]));

  return (
    <main className="pw-wallpaper" style={{ minHeight: "100vh" }}>
      <div className="pw-window" style={{ gridTemplateColumns: "260px 1fr", minHeight: "75vh" }}>
        <aside className="pw-sidebar">
          <div className="pw-logo">
            <img src="/blocwrite-main-dark.png" alt="Blocwrite" className="pw-logo-full" />
          </div>
          <div className="pw-section-title">Admin</div>
          <div className="pw-list">
            <Link href="/admin" className="pw-item active">Overview</Link>
            <a href="/api/admin/users" className="pw-item">Users API</a>
            <a href="/api/admin/overview" className="pw-item">Overview API</a>
          </div>
          <div className="pw-sidebar-foot">
            <span className="pw-sidebar-user">{adminEmail}</span>
          </div>
        </aside>
        <section className="pw-home-main" style={{ padding: 24, overflow: "auto" }}>
          <h1 className="pw-home-title">Admin Hub</h1>
          <p className="pw-home-subtitle">Stripe-backed billing control center.</p>
          <div className="pw-dashboard-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))", marginBottom: 20 }}>
            <div className="card"><strong>Total users</strong><div>{userCount}</div></div>
            <div className="card"><strong>Active</strong><div>{statusMap.get("active") ?? 0}</div></div>
            <div className="card"><strong>Trialing</strong><div>{statusMap.get("trialing") ?? 0}</div></div>
            <div className="card"><strong>Past due</strong><div>{statusMap.get("past_due") ?? 0}</div></div>
          </div>
          <div className="pw-dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Recent users</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {recentUsers.map((user) => (
                  <div key={user.id} style={{ border: "1px solid var(--pw-border-light)", borderRadius: 8, padding: 10 }}>
                    <div style={{ fontWeight: 600 }}>{user.name || user.email || "Unnamed user"}</div>
                    <div style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>{user.email}</div>
                    <div style={{ fontSize: 12, color: "var(--pw-text-muted)" }}>
                      {user.subscriptions[0]?.status ?? "no subscription"}{user.subscriptions[0]?.stripePriceId ? ` · ${user.subscriptions[0].stripePriceId}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Webhook log</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {recentEvents.map((event) => (
                  <div key={event.id} style={{ border: "1px solid var(--pw-border-light)", borderRadius: 8, padding: 10 }}>
                    <div style={{ fontWeight: 600 }}>{event.eventType}</div>
                    <div style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>{event.status}</div>
                    <div style={{ fontSize: 12, color: "var(--pw-text-muted)" }}>{new Date(event.processedAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
