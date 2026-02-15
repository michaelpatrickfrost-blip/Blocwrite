/**
 * Instant skeleton shown by Next.js during navigation to /studio/[novelId].
 * Matches the novel editor layout so the transition feels seamless.
 */
export default function NovelLoading() {
  const ghostLine = (w: string, h = 12) => (
    <div style={{
      height: h, borderRadius: 4, width: w,
      background: "var(--pw-border, #333)",
      animation: "pw-pulse 1.5s ease-in-out infinite",
    }} />
  );

  return (
    <div className="pw-wallpaper">
      <div className="pw-window">
        {/* Sidebar skeleton */}
        <aside className="pw-sidebar">
          <div className="pw-logo">
            <img src="/blocwrite-logo-white.png" alt="Blocwrite" className="pw-logo-full" />
          </div>

          {/* Back link placeholder */}
          <div style={{ padding: "6px 12px", opacity: 0.3 }}>
            <span style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>← Back to novels</span>
          </div>

          <div className="pw-section-title" style={{ opacity: 0.3 }}>MANUSCRIPT</div>

          {/* Ghost chapter list */}
          <div className="pw-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="pw-item" style={{
                opacity: 0.25,
                animation: "pw-pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.12}s`,
              }}>
                <span style={{
                  display: "block", height: 14, width: `${60 + i * 10}%`, borderRadius: 4,
                  background: "var(--pw-border, #333)",
                }} />
              </div>
            ))}
          </div>

          <div className="pw-sidebar-foot" style={{ opacity: 0.2 }}>
            <span>Loading...</span>
          </div>
        </aside>

        {/* Top bar skeleton */}
        <div className="pw-topbar">
          <div className="pw-toolbar">
            <span className="pw-project-title" style={{ opacity: 0.3 }}>Loading...</span>
            <span className="pw-dot" />
          </div>
        </div>

        {/* Main content skeleton */}
        <section className="pw-workspace-main" style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          minHeight: 300,
        }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            opacity: 0.35,
          }}>
            {/* Spinner */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{
              animation: "spin 1s linear infinite",
            }}>
              <circle cx="12" cy="12" r="10" stroke="var(--pw-accent, #5C6EFF)" strokeWidth="2.5" strokeDasharray="40 60" strokeLinecap="round" />
            </svg>
            <div style={{
              display: "flex", flexDirection: "column", gap: 8, alignItems: "center",
            }}>
              {ghostLine("200px", 16)}
              {ghostLine("140px", 10)}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
