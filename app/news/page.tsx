"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: string | null;
};

const C = {
  bg: "#ffffff",
  bgSoft: "#f8f8fa",
  bgDark: "#0e0e12",
  text: "#111114",
  textSoft: "#4a4d56",
  textMuted: "#8c8f98",
  border: "#e8e9ed",
  accent: "#c8e630",
  accentText: "#4d6a00",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function NewsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blog")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPosts(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)", minHeight: "100vh" }}>
      {/* ── Responsive styles ── */}
      <style>{`
        @media (max-width: 768px) {
          .news-nav-links { display: none !important; }
          .news-grid { grid-template-columns: 1fr !important; }
          .news-hero h1 { font-size: 36px !important; }
          .news-hero p { font-size: 16px !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        background: "rgba(14,14,18,0.92)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 30, width: "auto" }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <div style={{ display: "flex", gap: 32 }} className="news-nav-links">
              {[
                { label: "Home", href: "/" },
                { label: "News", href: "/news" },
                { label: "Pricing", href: "/#pricing" },
                { label: "Contact", href: "/contact" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{ fontSize: 14, fontWeight: 500, color: l.href === "/news" ? "#fff" : "rgba(255,255,255,0.6)", textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                  onMouseLeave={(e) => { if (l.href !== "/news") e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <Link href="/subscribe" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 24px", fontSize: 13, fontWeight: 600,
              color: C.text, background: C.accent, border: "none",
              borderRadius: 12, textDecoration: "none",
            }}>
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="news-hero" style={{
        background: C.bgDark, color: "#fff",
        padding: "80px 28px 70px", textAlign: "center",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 99,
            background: "rgba(200,230,48,0.1)", border: "1px solid rgba(200,230,48,0.2)",
            fontSize: 13, fontWeight: 600, color: C.accent, marginBottom: 20,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Blocwrite Blog
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 800, margin: "0 0 16px", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            News &amp; Updates
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>
            Product updates, writing tips, and insights from the Blocwrite team.
          </p>
        </div>
      </section>

      {/* ── Posts grid ── */}
      <section style={{ padding: "60px 28px 80px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          {loading && (
            <p style={{ textAlign: "center", color: C.textMuted, padding: "60px 0", fontSize: 15 }}>Loading posts...</p>
          )}

          {!loading && posts.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, margin: "0 auto 20px",
                background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 6px" }}>No posts yet</p>
              <p style={{ fontSize: 14, color: C.textMuted }}>Check back soon for news and updates.</p>
            </div>
          )}

          {!loading && posts.length > 0 && (
            <div className="news-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 28,
            }}>
              {posts.map((post, i) => (
                <Link
                  key={post.id}
                  href={`/news/${post.slug}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <article
                    style={{
                      borderRadius: 18,
                      border: `1px solid ${C.border}`,
                      background: C.bg,
                      overflow: "hidden",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Cover image */}
                    {post.coverImage ? (
                      <div style={{
                        width: "100%", height: 200,
                        background: `url(${post.coverImage}) center/cover no-repeat`,
                        borderBottom: `1px solid ${C.border}`,
                      }} />
                    ) : (
                      <div style={{
                        width: "100%", height: 200,
                        background: i % 2 === 0
                          ? "linear-gradient(135deg, #0e0e12, #1a1a24)"
                          : "linear-gradient(135deg, #1a1a24, #252530)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderBottom: `1px solid ${C.border}`,
                      }}>
                        <img src="/blocwrite-logo-white.png" alt="" style={{ height: 32, opacity: 0.2 }} />
                      </div>
                    )}

                    {/* Content */}
                    <div style={{ padding: "22px 24px 26px" }}>
                      {post.publishedAt && (
                        <p style={{ fontSize: 12, fontWeight: 600, color: C.accentText, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {formatDate(post.publishedAt)}
                        </p>
                      )}
                      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.6, margin: 0 }}>
                          {post.excerpt.length > 140 ? post.excerpt.slice(0, 140) + "..." : post.excerpt}
                        </p>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, fontSize: 13, fontWeight: 600, color: C.accentText }}>
                        Read more
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "52px 0 44px", background: C.bgDark, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
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
              { label: "News", href: "/news" },
              { label: "Terms", href: "/terms" },
              { label: "Refund Policy", href: "/refunds" },
              { label: "Contact", href: "/contact" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
