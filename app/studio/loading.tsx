/**
 * Instant skeleton shown by Next.js during navigation to /studio.
 * Matches the studio overview layout so the transition feels seamless.
 */
export default function StudioLoading() {
  return (
    <div className="pw-wallpaper">
      <div className="pw-window">
        {/* Sidebar skeleton */}
        <aside className="pw-sidebar">
          <div className="pw-logo">
            <img src="/blocwrite-logo-white.png" alt="Blocwrite" className="pw-logo-full" />
          </div>
          <div className="pw-section-title" style={{ opacity: 0.3 }}>Create Novel</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{
              flex: 1, height: 36, borderRadius: 8,
              background: "var(--pw-surface-alt, #161616)",
            }} />
            <div style={{
              width: 64, height: 36, borderRadius: 8,
              background: "var(--pw-surface-alt, #161616)",
            }} />
          </div>
          <div className="pw-sidebar-foot" style={{ opacity: 0.2 }}>
            <span>Loading...</span>
          </div>
        </aside>

        {/* Top bar skeleton */}
        <div className="pw-topbar">
          <div className="pw-toolbar">
            <span className="pw-project-title" style={{ opacity: 0.3 }}>Your Novels</span>
          </div>
        </div>

        {/* Main content — skeleton novel cards */}
        <section className="pw-home-main">
          <div className="pw-novel-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="pw-novel-card" style={{
                pointerEvents: "none", opacity: 0.25,
                animation: "pw-pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
              }}>
                <div className="pw-novel-cover" style={{
                  background: "var(--pw-surface-alt, #161616)", minHeight: 160,
                }} />
                <div style={{ padding: "10px 12px" }}>
                  <div style={{
                    height: 14, borderRadius: 4,
                    background: "var(--pw-border, #333)", marginBottom: 6, width: "70%",
                  }} />
                  <div style={{
                    height: 10, borderRadius: 3,
                    background: "var(--pw-border, #333)", width: "40%",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
