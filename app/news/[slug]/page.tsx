"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  publishedAt: string | null;
};

const C = {
  bg: "#ffffff",
  bgSoft: "#f8f8fa",
  bgDark: "#0c0c1d",
  text: "#111114",
  textSoft: "#4a4d56",
  textMuted: "#8c8f98",
  border: "#e8e9ed",
  accent: "#7c5cfc",
  accentText: "#5c46c9",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/blog/${slug}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => { if (d) setPost(d); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)", minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 768px) {
          .post-nav-links { display: none !important; }
          .post-title { font-size: 32px !important; }
          .post-body { padding: 0 16px !important; }
        }
        .post-body h1 { font-size: 28px; font-weight: 800; margin: 32px 0 14px; letter-spacing: -0.02em; line-height: 1.25; }
        .post-body h2 { font-size: 24px; font-weight: 700; margin: 28px 0 12px; letter-spacing: -0.01em; line-height: 1.3; }
        .post-body h3 { font-size: 20px; font-weight: 700; margin: 24px 0 10px; line-height: 1.35; }
        .post-body p { font-size: 17px; line-height: 1.8; margin: 0 0 18px; color: #333; }
        .post-body ul, .post-body ol { margin: 0 0 18px; padding-left: 24px; }
        .post-body li { font-size: 17px; line-height: 1.8; margin-bottom: 6px; color: #333; }
        .post-body blockquote {
          margin: 24px 0; padding: 18px 24px;
          border-left: 4px solid ${C.accent};
          background: ${C.bgSoft}; border-radius: 0 12px 12px 0;
          font-style: italic; color: ${C.textSoft};
        }
        .post-body blockquote p { margin: 0; }
        .post-body img {
          max-width: 100%; height: auto; border-radius: 14px;
          margin: 24px 0; border: 1px solid ${C.border};
        }
        .post-body a { color: ${C.accentText}; text-decoration: underline; text-underline-offset: 3px; }
        .post-body a:hover { color: #111; }
        .post-body strong { font-weight: 700; color: #111; }
      `}</style>

      {/* ── Nav (matches main site exactly) ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(12,12,29,0.97)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 34, width: "auto" }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <div style={{ display: "flex", gap: 32 }} className="post-nav-links">
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
                  style={{ fontSize: 14, fontWeight: 500, color: l.href === "/news" ? "#fff" : "rgba(255,255,255,0.55)", textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { if (l.href !== "/news") e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Link href="/login" className="post-nav-links" style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>Log in</Link>
              <Link href="/subscribe" style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px",
                fontSize: 13, fontWeight: 600, borderRadius: 10,
                background: "linear-gradient(135deg, #7c5cfc 0%, #6246ea 100%)", color: "#fff", textDecoration: "none",
                boxShadow: "0 2px 12px rgba(124,92,252,0.3)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}>
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {loading && (
        <div style={{ textAlign: "center", padding: "120px 28px", color: C.textMuted }}>Loading...</div>
      )}

      {!loading && notFound && (
        <div style={{ textAlign: "center", padding: "120px 28px" }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px" }}>Post not found</h1>
          <p style={{ fontSize: 15, color: C.textMuted, margin: "0 0 24px" }}>This post may have been removed or the URL is incorrect.</p>
          <Link href="/news" style={{ fontSize: 14, fontWeight: 600, color: C.accentText, textDecoration: "none" }}>
            &larr; Back to News
          </Link>
        </div>
      )}

      {!loading && post && (
        <>
          {/* ── Cover ── */}
          {post.coverImage && (
            <div style={{
              width: "100%", maxHeight: 420, overflow: "hidden",
              background: `url(${post.coverImage}) center/cover no-repeat`,
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ width: "100%", height: 420 }} />
            </div>
          )}

          {/* ── Article ── */}
          <article style={{ maxWidth: 740, margin: "0 auto", padding: "48px 28px 80px" }} className="post-body">
            {/* Back link */}
            <Link href="/news" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 600, color: C.textMuted,
              textDecoration: "none", marginBottom: 28,
              transition: "color 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to News
            </Link>

            {/* Meta */}
            {post.publishedAt && (
              <p style={{
                fontSize: 13, fontWeight: 600, color: C.accentText,
                textTransform: "uppercase", letterSpacing: "0.06em",
                margin: "0 0 12px",
              }}>
                {formatDate(post.publishedAt)}
              </p>
            )}

            {/* Title */}
            <h1 className="post-title" style={{
              fontSize: 42, fontWeight: 800, margin: "0 0 16px",
              letterSpacing: "-0.03em", lineHeight: 1.15,
            }}>
              {post.title}
            </h1>

            {post.excerpt && (
              <p style={{
                fontSize: 19, color: C.textSoft, lineHeight: 1.6,
                margin: "0 0 36px", fontWeight: 400,
              }}>
                {post.excerpt}
              </p>
            )}

            <div style={{ height: 1, background: C.border, margin: "0 0 36px" }} />

            {/* Content */}
            <div dangerouslySetInnerHTML={{ __html: post.content }} />

            {/* Bottom divider + back */}
            <div style={{ height: 1, background: C.border, margin: "48px 0 28px" }} />
            <Link href="/news" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 14, fontWeight: 600, color: C.accentText,
              textDecoration: "none",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              All posts
            </Link>
          </article>
        </>
      )}

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
