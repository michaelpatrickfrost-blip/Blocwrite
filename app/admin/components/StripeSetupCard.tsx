"use client";

import { useCallback, useEffect, useState } from "react";

type ConfigStatus = {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePriceId: string;
  appUrl: string;
  ready: boolean;
  source: Record<string, string>;
};

export function StripeSetupCard() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Form fields
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [priceId, setPriceId] = useState("");
  const [appUrl, setAppUrl] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        // Pre-fill price ID and app URL if already set
        if (data.stripePriceId) setPriceId(data.stripePriceId);
        if (data.appUrl) setAppUrl(data.appUrl);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, string> = {};
      if (secretKey.trim()) body.stripeSecretKey = secretKey.trim();
      if (webhookSecret.trim()) body.stripeWebhookSecret = webhookSecret.trim();
      if (priceId.trim()) body.stripePriceId = priceId.trim();
      if (appUrl.trim()) body.appUrl = appUrl.trim();

      if (Object.keys(body).length === 0) {
        setMessage({ text: "Nothing to save. Fill in at least one field.", ok: false });
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "Saved! Stripe config updated.", ok: true });
        setStatus(data);
        // Clear sensitive fields after save
        setSecretKey("");
        setWebhookSecret("");
      } else {
        setMessage({ text: data.error || "Failed to save", ok: false });
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Save failed", ok: false });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700 }}>Stripe Connection</h3>
        <p style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>Loading...</p>
      </div>
    );
  }

  const isConnected = status?.ready;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Stripe Connection</h3>
        <span
          style={{
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            background: isConnected ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.12)",
            color: isConnected ? "#22c55e" : "#eab308",
            border: `1px solid ${isConnected ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
          }}
        >
          {isConnected ? "Connected" : "Not connected"}
        </span>
      </div>

      {/* Current status */}
      {status && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <StatusRow label="Secret Key" value={status.stripeSecretKey} source={status.source.stripeSecretKey} />
          <StatusRow label="Webhook Secret" value={status.stripeWebhookSecret} source={status.source.stripeWebhookSecret} />
          <StatusRow label="Price ID" value={status.stripePriceId} source={status.source.stripePriceId} />
          <StatusRow label="App URL" value={status.appUrl} source="set" />
        </div>
      )}

      {/* Setup form */}
      <div
        style={{
          padding: 16,
          borderRadius: 10,
          border: "1px solid var(--pw-border-light)",
          background: "var(--pw-surface-alt, var(--pw-surface))",
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: "var(--pw-text-dim)" }}>
          {isConnected ? "Update Stripe keys" : "Paste your Stripe keys to connect"}
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          <FormField
            label="Secret Key"
            placeholder="sk_live_... or sk_test_..."
            value={secretKey}
            onChange={setSecretKey}
            type="password"
            hint="Stripe Dashboard → Developers → API keys"
          />
          <FormField
            label="Webhook Secret"
            placeholder="whsec_..."
            value={webhookSecret}
            onChange={setWebhookSecret}
            type="password"
            hint={`Stripe Dashboard → Developers → Webhooks → Add endpoint → URL: ${appUrl || "https://blocwrite.com"}/api/stripe/webhook`}
          />
          <FormField
            label="Price ID"
            placeholder="price_..."
            value={priceId}
            onChange={setPriceId}
            hint="The subscription price ID from your Stripe product"
          />
          <FormField
            label="App URL"
            placeholder="https://blocwrite.com"
            value={appUrl}
            onChange={setAppUrl}
            hint="Your live site URL (for checkout redirects)"
          />
        </div>

        {message && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              background: message.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              color: message.ok ? "#22c55e" : "#ef4444",
              border: `1px solid ${message.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}
          >
            {message.text}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="btn btn-primary"
          style={{ marginTop: 14, fontSize: 13, padding: "8px 24px" }}
        >
          {saving ? "Saving..." : "Save Stripe Config"}
        </button>
      </div>
    </div>
  );
}

function StatusRow({ label, value, source }: { label: string; value: string; source: string }) {
  const isSet = value && value !== "" && source !== "missing";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid var(--pw-border-light)",
        background: isSet ? "rgba(34,197,94,0.04)" : "rgba(234,179,8,0.04)",
      }}
    >
      <span style={{ fontSize: 13 }}>{isSet ? "\u2705" : "\u26A0\uFE0F"}</span>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span
        style={{
          marginLeft: "auto",
          fontFamily: "monospace",
          fontSize: 11,
          color: "var(--pw-text-dim)",
          maxWidth: 160,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {isSet ? value : "Not set"}
      </span>
    </div>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 12px",
          fontSize: 13,
          borderRadius: 8,
          border: "1px solid var(--pw-border-light)",
          background: "var(--pw-surface)",
          color: "var(--pw-text)",
          outline: "none",
          fontFamily: "monospace",
        }}
      />
      {hint && (
        <p style={{ fontSize: 11, color: "var(--pw-text-muted, #888)", margin: "3px 0 0", lineHeight: 1.4 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
