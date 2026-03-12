"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  publishedAt: string | null;
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
    <main style={{ background: "#fdfcfa", color: "#111114", fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)", minHeight: "100vh" }}>
      <style>{`
        /* ── Responsive ── */
        @media (max-width: 768px) {
          .news-nav-links { display: none !important; }
          .news-hero h1 { font-size: 32px !important; }
          .news-hero p { font-size: 15px !important; }
          .news-article { padding: 0 20px !important; }
          .news-article-cover { height: 240px !important; border-radius: 16px !important; }
          .news-article-title { font-size: 26px !important; }
        }
        @media (max-width: 480px) {
          .news-article-cover { height: 180px !important; border-radius: 12px !important; }
          .news-article-title { font-size: 22px !important; }
        }

        /* ── Post body typography ── */
        .news-post-body h1 { font-size: 26px; font-weight: 800; margin: 28px 0 12px; letter-spacing: -0.02em; line-height: 1.25; color: #111114; }
        .news-post-body h2 { font-size: 22px; font-weight: 700; margin: 24px 0 10px; letter-spacing: -0.01em; line-height: 1.3; color: #111114; }
        .news-post-body h3 { font-size: 18px; font-weight: 700; margin: 20px 0 8px; line-height: 1.35; color: #111114; }
        .news-post-body p { font-size: 16.5px; line-height: 1.85; margin: 0 0 16px; color: #3a3a42; }
        .news-post-body ul, .news-post-body ol { margin: 0 0 16px; padding-left: 22px; }
        .news-post-body li { font-size: 16.5px; line-height: 1.85; margin-bottom: 4px; color: #3a3a42; }
        .news-post-body blockquote {
          margin: 20px 0; padding: 16px 22px;
          border-left: 4px solid #8b6914;
          background: rgba(139,105,20,0.06); border-radius: 0 12px 12px 0;
          font-style: italic; color: #404040;
        }
        .news-post-body blockquote p { margin: 0; }
        .news-post-body img {
          max-width: 100%; height: auto; border-radius: 12px;
          margin: 20px 0; border: 1px solid #e8e9ed;
        }
        .news-post-body a { color: #8b6914; text-decoration: underline; text-underline-offset: 3px; }
        .news-post-body a:hover { color: #111; }
        .news-post-body strong { font-weight: 700; color: #111114; }

        /* ── Fade-in animation ── */
        @keyframes newsFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .news-article-animated {
          animation: newsFadeUp 0.6s cubic-bezier(0.2,0,0.2,1) both;
        }
      `}</style>

      {/* ── Nav (matches main site exactly) ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(253,252,250,0.78)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
      }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img src="/blocwrite-logo-black.png" alt="Blocwrite" style={{ height: 44, width: "auto" }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <div style={{ display: "flex", gap: 32 }} className="news-nav-links">
              {[
                { label: "Features", href: "/#features" },
                { label: "Non-Fiction", href: "/#nonfiction" },
                { label: "Pricing", href: "/#pricing" },
                { label: "News", href: "/news" },
                { label: "FAQ", href: "/#faq" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{ fontSize: 14, fontWeight: 500, color: l.href === "/news" ? "#1c1917" : "#44403c", textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#1c1917"; }}
                  onMouseLeave={(e) => { if (l.href !== "/news") e.currentTarget.style.color = "#44403c"; }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Link href="/login" className="news-nav-links" style={{ fontSize: 14, fontWeight: 500, color: "#44403c", textDecoration: "none" }}>Log in</Link>
              <Link href="/subscribe" style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px",
                fontSize: 13, fontWeight: 600, borderRadius: 12,
                background: "#0a0a0a", color: "#fff", textDecoration: "none",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}>
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="news-hero" style={{
        background: "#fafaf9", color: "#1c1917",
        padding: "72px 28px 64px", textAlign: "center",
      }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 99,
            background: "rgba(139,105,20,0.08)", border: "1px solid rgba(139,105,20,0.2)",
            fontSize: 13, fontWeight: 600, color: "#8b6914", marginBottom: 20,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Blocwrite Blog
          </div>
          <h1 style={{ fontSize: 46, fontWeight: 800, margin: "0 0 14px", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            News &amp; Updates
          </h1>
          <p style={{ fontSize: 17, color: "#57534e", lineHeight: 1.6, margin: 0 }}>
            Product updates, writing tips, and insights from the Blocwrite team.
          </p>
        </div>
      </section>

      {/* ── Seamless post feed ── */}
      <section style={{ padding: "0 0 40px" }}>
        <div style={{ maxWidth: 740, margin: "0 auto" }}>
          {loading && (
            <p style={{ textAlign: "center", color: "#8c8f98", padding: "80px 28px", fontSize: 15 }}>Loading posts...</p>
          )}

          {!loading && posts.length === 0 && (
            <div style={{ textAlign: "center", padding: "100px 28px" }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, margin: "0 auto 20px",
                background: "#f8f8fa", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8c8f98" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 6px" }}>No posts yet</p>
              <p style={{ fontSize: 14, color: "#8c8f98" }}>Check back soon for news and updates.</p>
            </div>
          )}

          {!loading && posts.map((post, idx) => (
            <article
              key={post.id}
              id={post.slug}
              className="news-article news-article-animated"
              style={{
                padding: "56px 28px 48px",
                animationDelay: `${idx * 0.1}s`,
                borderBottom: idx < posts.length - 1 ? "1px solid #e8e9ed" : "none",
              }}
            >
              {/* Cover image */}
              {post.coverImage && (
                <div
                  className="news-article-cover"
                  style={{
                    width: "100%",
                    height: 360,
                    borderRadius: 18,
                    overflow: "hidden",
                    marginBottom: 32,
                    background: `url(${post.coverImage}) center/cover no-repeat`,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                  }}
                />
              )}

              {/* Date badge */}
              {post.publishedAt && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 99,
                  background: "rgba(139,105,20,0.08)",
                  fontSize: 12, fontWeight: 600, color: "#8b6914",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  marginBottom: 16,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {formatDate(post.publishedAt)}
                </div>
              )}

              {/* Title */}
              <h2
                className="news-article-title"
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  margin: "0 0 12px",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.2,
                  color: "#111114",
                }}
              >
                {post.title}
              </h2>

              {/* Excerpt */}
              {post.excerpt && (
                <p style={{
                  fontSize: 17,
                  color: "#4a4d56",
                  lineHeight: 1.65,
                  margin: "0 0 24px",
                  fontWeight: 400,
                }}>
                  {post.excerpt}
                </p>
              )}

              {/* Full content */}
              <div
                className="news-post-body"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </article>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "52px 0 44px", background: "#0a0a0a" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 44, width: "auto", opacity: 0.7 }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              © 2026 Blocwrite. All rights reserved.
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
                style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
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
