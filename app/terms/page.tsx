import Link from "next/link";

export default function TermsPage() {
  const C = {
    bg: "#ffffff",
    text: "#111116",
    textSoft: "#5a5e6b",
    textMuted: "#9ca0ab",
    accentDark: "#c8e030",
    border: "#e8e9ed",
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 32,
  };

  const headingStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
    color: C.text,
  };

  const paraStyle: React.CSSProperties = {
    fontSize: 14,
    lineHeight: 1.75,
    color: C.textSoft,
    marginBottom: 12,
  };

  return (
    <main style={{ background: C.bg, color: C.text, fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 28px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", fontSize: 20, fontWeight: 800, letterSpacing: "-0.04em", color: C.text }}>
            Bloc<span style={{ color: C.accentDark }}>write</span>
          </Link>
          <Link href="/" style={{ fontSize: 13, color: C.textSoft, textDecoration: "none" }}>&larr; Back to Home</Link>
        </div>
      </nav>

      {/* Content */}
      <article style={{ maxWidth: 800, margin: "0 auto", padding: "48px 28px 80px" }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 8 }}>
          Terms &amp; Conditions
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 40 }}>
          Last updated: February 2026
        </p>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>1. Agreement to Terms</h2>
          <p style={paraStyle}>
            By accessing or using Blocwrite (&ldquo;the Service&rdquo;), operated by Blocwrite (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not access or use the Service.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>2. Description of Service</h2>
          <p style={paraStyle}>
            Blocwrite is an AI-assisted novel writing platform that provides tools for planning, writing, and exporting manuscripts. The Service includes chapter planning, bloc-by-bloc prose writing, story bible management, AI-powered text generation, and manuscript export features.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>3. Account Registration</h2>
          <p style={paraStyle}>
            To use the Service, you must create an account by providing a valid email address and password. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 18 years old to create an account.
          </p>
          <p style={paraStyle}>
            You agree to provide accurate and complete information during registration and to keep your account information up to date. We reserve the right to suspend or terminate accounts that contain false or misleading information.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>4. Subscription &amp; Billing</h2>
          <p style={paraStyle}>
            Access to the Blocwrite Studio requires an active subscription. We offer monthly and annual subscription plans, each beginning with a 7-day free trial period. Payment is processed securely through Stripe.
          </p>
          <p style={paraStyle}>
            <strong>Free Trial:</strong> New subscribers receive a 7-day free trial. You will not be charged during the trial period. If you cancel before the trial ends, no payment will be taken.
          </p>
          <p style={paraStyle}>
            <strong>Recurring Billing:</strong> After the trial period, your subscription will automatically renew at the applicable rate (monthly or annual) unless you cancel before the renewal date.
          </p>
          <p style={paraStyle}>
            <strong>Cancellation:</strong> You may cancel your subscription at any time. Upon cancellation, you will retain access to the Service until the end of your current billing period. No partial refunds are provided for unused portions of a billing period.
          </p>
          <p style={paraStyle}>
            <strong>Refund Policy:</strong> For full details on our refund and cancellation policy, please see our <a href="/refunds" style={{ color: "inherit", fontWeight: 600, textDecoration: "underline" }}>Refund Policy</a>.
          </p>
          <p style={paraStyle}>
            <strong>Price Changes:</strong> We reserve the right to change subscription prices with 30 days&apos; advance notice. Existing subscribers will be notified by email before any price change takes effect.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>5. Intellectual Property &amp; Your Content</h2>
          <p style={paraStyle}>
            <strong>Your Content:</strong> You retain full ownership of all content you create using the Service, including novels, chapters, character profiles, and any other creative work. Blocwrite does not claim any ownership rights over your content.
          </p>
          <p style={paraStyle}>
            <strong>AI-Generated Content:</strong> Content generated by the AI features of the Service is provided as a creative aid. You are free to use, modify, and publish AI-assisted content as your own work. We do not claim ownership over AI-generated output.
          </p>
          <p style={paraStyle}>
            <strong>Our Service:</strong> The Blocwrite platform, including its design, code, features, and branding, is owned by us and is protected by intellectual property laws. You may not copy, modify, or reverse-engineer any part of the Service.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>6. Data Privacy &amp; Security</h2>
          <p style={paraStyle}>
            We take the security of your data seriously. Your writing data is stored securely on our servers and is only accessible through your authenticated account. Each user&apos;s data is completely isolated from other users.
          </p>
          <p style={paraStyle}>
            We do not sell, share, or use your creative content for any purpose other than providing the Service to you. Your writing is never used to train AI models.
          </p>
          <p style={paraStyle}>
            We collect only the minimum personal data necessary to provide the Service: your email address, name, and payment information (processed by Stripe — we do not store card details directly).
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>7. Acceptable Use</h2>
          <p style={paraStyle}>
            You agree not to use the Service to:
          </p>
          <ul style={{ ...paraStyle, paddingLeft: 24, display: "grid", gap: 6 }}>
            <li>Generate content that is illegal, harmful, or violates the rights of others</li>
            <li>Attempt to gain unauthorised access to other users&apos; accounts or data</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Use automated tools or scripts to access the Service without permission</li>
            <li>Resell or redistribute access to the Service</li>
          </ul>
          <p style={paraStyle}>
            We reserve the right to suspend or terminate your account if you violate these terms.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>8. AI Features &amp; Third-Party Services</h2>
          <p style={paraStyle}>
            The AI writing assistance features of Blocwrite are powered by third-party AI models accessed via API services. While we strive to provide high-quality AI output, we cannot guarantee the accuracy, originality, or suitability of AI-generated content for any particular purpose.
          </p>
          <p style={paraStyle}>
            You are responsible for reviewing and editing all AI-generated content before publication. AI-generated prose should be treated as a first draft that requires your creative judgement and editing.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>9. Service Availability</h2>
          <p style={paraStyle}>
            We aim to provide uninterrupted access to the Service but cannot guarantee 100% uptime. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We will endeavour to notify users of planned maintenance in advance.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>10. Limitation of Liability</h2>
          <p style={paraStyle}>
            To the maximum extent permitted by law, Blocwrite shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount you have paid for the Service in the 12 months preceding the claim.
          </p>
          <p style={paraStyle}>
            We are not responsible for any loss of data resulting from circumstances beyond our reasonable control. We recommend that you regularly export and back up your work.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>11. Changes to Terms</h2>
          <p style={paraStyle}>
            We reserve the right to update these Terms and Conditions at any time. Material changes will be communicated via email or a notice on the Service. Continued use of the Service after changes take effect constitutes acceptance of the revised terms.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>12. Governing Law</h2>
          <p style={paraStyle}>
            These Terms and Conditions are governed by and construed in accordance with the laws of England and Wales. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>13. Contact</h2>
          <p style={paraStyle}>
            If you have any questions about these Terms and Conditions, please contact us at:
          </p>
          <p style={{ ...paraStyle, fontWeight: 600 }}>
            customerservice@blocwrite.com
          </p>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, marginTop: 48 }}>
          <Link href="/" style={{ fontSize: 13, color: C.accentDark, textDecoration: "none", fontWeight: 600 }}>
            &larr; Back to Blocwrite
          </Link>
        </div>
      </article>
    </main>
  );
}
