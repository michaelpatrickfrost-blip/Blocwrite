import Link from "next/link";

const C = {
  bg: "#ffffff",
  bgSoft: "#f8f8fa",
  text: "#1a1a1f",
  textSoft: "#5a5d66",
  textMuted: "#9ea0a8",
  border: "#e5e6ea",
};

export default function RefundPolicyPage() {
  const h2: React.CSSProperties = { fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 48, marginBottom: 12 };
  const p: React.CSSProperties = { fontSize: 15, lineHeight: 1.7, color: C.textSoft, marginBottom: 16 };

  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 28px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.04em", lineHeight: 1 }}>
              <span style={{ color: "#4d6a00", fontWeight: 900 }}>/</span>Blocwrite
            </span>
          </Link>
          <Link href="/" style={{ fontSize: 14, fontWeight: 500, color: C.textSoft, textDecoration: "none" }}>
            &larr; Back to Home
          </Link>
        </div>
      </nav>

      <article style={{ maxWidth: 680, margin: "0 auto", padding: "64px 28px 100px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 12 }}>
          LEGAL
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 8 }}>
          Refund Policy
        </h1>
        <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 40 }}>
          Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <h2 style={h2}>1. Free Trial</h2>
        <p style={p}>
          All new Blocwrite subscriptions include a <strong>7-day free trial</strong>. During the trial period you have full access to every feature at no cost. You may cancel at any time during the trial and you will not be charged. No credit card charge is made until the trial period ends.
        </p>

        <h2 style={h2}>2. Subscription Charges</h2>
        <p style={p}>
          After the free trial ends, your chosen plan (monthly or annual) will be charged automatically through Stripe. <strong>All subscription payments are non-refundable.</strong> This applies to both monthly and annual billing cycles.
        </p>

        <h2 style={h2}>3. Accidental Purchases &amp; Renewals</h2>
        <p style={p}>
          You are responsible for managing your subscription. If you do not wish to be charged after your trial or at the next renewal date, you must cancel your subscription before the billing date. <strong>Refunds will not be issued for accidental purchases, forgotten cancellations, or unwanted renewals.</strong>
        </p>
        <p style={p}>
          We strongly recommend setting a reminder before your trial ends or your next billing date if you are considering cancellation.
        </p>

        <h2 style={h2}>4. How to Cancel</h2>
        <p style={p}>
          You can cancel your subscription at any time through the Stripe customer portal. After cancellation, your access to Blocwrite continues until the end of the current billing period. No further charges will be made.
        </p>

        <h2 style={h2}>5. UK Consumer Rights</h2>
        <p style={p}>
          Under the UK Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, you have a 14-day cooling-off period for online purchases. However, by subscribing to Blocwrite and using the service during the 7-day free trial, you acknowledge that the digital service has been provided to you and you consent to the loss of the right of withdrawal once the trial period begins.
        </p>
        <p style={p}>
          If you cancel within the 7-day trial, no payment is taken and no refund is necessary. If you continue past the trial and are charged, the subscription fee is non-refundable as the service has been actively delivered.
        </p>

        <h2 style={h2}>6. Exceptions</h2>
        <p style={p}>
          In exceptional circumstances — such as extended service outages caused by Blocwrite (not by third-party AI providers) — we may, at our sole discretion, offer a partial credit or refund. This is assessed on a case-by-case basis and is not guaranteed.
        </p>

        <h2 style={h2}>7. Contact Us</h2>
        <p style={p}>
          If you have a billing question or believe there has been an error with your charge, please contact us at{" "}
          <a href="mailto:customerservice@blocwrite.com" style={{ color: C.text, fontWeight: 600 }}>
            customerservice@blocwrite.com
          </a>{" "}
          or through our{" "}
          <Link href="/contact" style={{ color: C.text, fontWeight: 600 }}>
            contact form
          </Link>
          . We aim to respond within 48 hours.
        </p>

        <div style={{ marginTop: 48, padding: 24, borderRadius: 14, background: C.bgSoft, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: C.textSoft, margin: 0 }}>
            <strong style={{ color: C.text }}>Summary:</strong> Try Blocwrite free for 7 days. Cancel during the trial and pay nothing. After the trial, all charges are final. Cancel anytime to stop future billing.
          </p>
        </div>
      </article>

      {/* Footer */}
      <footer style={{ padding: "48px 0 40px", background: "#0e0e12", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
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
              { label: "Terms", href: "/terms" },
              { label: "Refund Policy", href: "/refunds" },
              { label: "Contact", href: "/contact" },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
