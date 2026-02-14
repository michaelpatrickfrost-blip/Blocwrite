"use client";

import { useCallback, useEffect, useState } from "react";

type PromoCode = {
  id: string;
  code: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  coupon: {
    id: string;
    name: string | null;
    percentOff: number | null;
    amountOff: number | null;
    currency: string | null;
    duration: string;
    durationInMonths: number | null;
    valid: boolean;
  };
};

export function CouponCard() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"percent" | "fixed">("percent");
  const [formAmount, setFormAmount] = useState("");
  const [formDuration, setFormDuration] = useState<"once" | "repeating" | "forever">("once");
  const [formMonths, setFormMonths] = useState("3");
  const [formMaxUses, setFormMaxUses] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (res.ok) {
        setCodes(data.codes || []);
      } else {
        setError(data.error || "Failed to load promo codes");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCodes();
  }, [fetchCodes]);

  const handleCreate = async () => {
    setCreating(true);
    setFormError(null);
    setFormSuccess(null);

    const amount = parseFloat(formAmount);
    if (!formCode.trim()) {
      setFormError("Enter a promo code (e.g., LAUNCH20)");
      setCreating(false);
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setFormError("Enter a valid discount amount");
      setCreating(false);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        code: formCode.trim(),
        name: formName.trim() || undefined,
        duration: formDuration,
      };

      if (formType === "percent") {
        body.percentOff = Math.min(100, amount);
      } else {
        // Stripe expects amount in smallest currency unit (pence for GBP)
        body.amountOff = Math.round(amount * 100);
        body.currency = "gbp";
      }

      if (formDuration === "repeating" && formMonths) {
        body.durationInMonths = parseInt(formMonths, 10);
      }

      if (formMaxUses) {
        body.maxRedemptions = parseInt(formMaxUses, 10);
      }

      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess(`Promo code "${data.promoCode.code}" created!`);
        setFormCode("");
        setFormName("");
        setFormAmount("");
        setFormMaxUses("");
        void fetchCodes();
      } else {
        setFormError(data.error || "Failed to create promo code");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create promo code");
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDiscount = (coupon: PromoCode["coupon"]) => {
    if (coupon.percentOff) return `${coupon.percentOff}% off`;
    if (coupon.amountOff && coupon.currency) {
      const symbol = coupon.currency.toUpperCase() === "GBP" ? "\u00A3" : coupon.currency.toUpperCase() === "USD" ? "$" : coupon.currency.toUpperCase();
      return `${symbol}${(coupon.amountOff / 100).toFixed(2)} off`;
    }
    return "Discount";
  };

  const formatDuration = (coupon: PromoCode["coupon"]) => {
    if (coupon.duration === "once") return "one-time";
    if (coupon.duration === "forever") return "forever";
    if (coupon.duration === "repeating" && coupon.durationInMonths) return `${coupon.durationInMonths} months`;
    return coupon.duration;
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
          Discount Codes ({codes.length})
        </h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          style={{ fontSize: 12, padding: "6px 16px" }}
        >
          {showForm ? "Cancel" : "+ New Code"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            border: "1px solid var(--pw-border-light)",
            background: "var(--pw-surface-alt, var(--pw-surface))",
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--pw-text-dim)", marginBottom: 12 }}>
            Create a discount code your customers can use at checkout
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* Promo code */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Promo Code
              </label>
              <input
                type="text"
                placeholder="e.g. LAUNCH20"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                maxLength={20}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid var(--pw-border-light)",
                  background: "var(--pw-surface)",
                  color: "var(--pw-text)",
                  fontFamily: "monospace",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              />
            </div>

            {/* Name (optional) */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Name <span style={{ fontWeight: 400, color: "var(--pw-text-dim)" }}>(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Launch Discount"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid var(--pw-border-light)",
                  background: "var(--pw-surface)",
                  color: "var(--pw-text)",
                }}
              />
            </div>

            {/* Discount type */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Discount Type
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as "percent" | "fixed")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid var(--pw-border-light)",
                  background: "var(--pw-surface)",
                  color: "var(--pw-text)",
                }}
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed amount (\u00A3)</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                {formType === "percent" ? "Percentage" : "Amount (\u00A3)"}
              </label>
              <input
                type="number"
                placeholder={formType === "percent" ? "e.g. 20" : "e.g. 5.00"}
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                min="1"
                max={formType === "percent" ? "100" : undefined}
                step={formType === "percent" ? "1" : "0.01"}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid var(--pw-border-light)",
                  background: "var(--pw-surface)",
                  color: "var(--pw-text)",
                }}
              />
            </div>

            {/* Duration */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Duration
              </label>
              <select
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value as "once" | "repeating" | "forever")}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid var(--pw-border-light)",
                  background: "var(--pw-surface)",
                  color: "var(--pw-text)",
                }}
              >
                <option value="once">One-time (first payment only)</option>
                <option value="repeating">Multiple months</option>
                <option value="forever">Forever</option>
              </select>
            </div>

            {/* Months (if repeating) */}
            {formDuration === "repeating" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Number of months
                </label>
                <input
                  type="number"
                  placeholder="3"
                  value={formMonths}
                  onChange={(e) => setFormMonths(e.target.value)}
                  min="1"
                  max="36"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    borderRadius: 8,
                    border: "1px solid var(--pw-border-light)",
                    background: "var(--pw-surface)",
                    color: "var(--pw-text)",
                  }}
                />
              </div>
            )}

            {/* Max uses */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Max uses <span style={{ fontWeight: 400, color: "var(--pw-text-dim)" }}>(blank = unlimited)</span>
              </label>
              <input
                type="number"
                placeholder="Unlimited"
                value={formMaxUses}
                onChange={(e) => setFormMaxUses(e.target.value)}
                min="1"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid var(--pw-border-light)",
                  background: "var(--pw-surface)",
                  color: "var(--pw-text)",
                }}
              />
            </div>
          </div>

          {formError && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                background: "rgba(239,68,68,0.08)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {formError}
            </div>
          )}
          {formSuccess && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                background: "rgba(34,197,94,0.08)",
                color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              {formSuccess}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="btn btn-primary"
            style={{ marginTop: 14, fontSize: 13, padding: "8px 24px" }}
          >
            {creating ? "Creating..." : "Create Promo Code"}
          </button>
        </div>
      )}

      {/* Existing codes list */}
      {loading ? (
        <p style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>Loading promo codes...</p>
      ) : error ? (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(234,179,8,0.08)",
            border: "1px solid rgba(234,179,8,0.2)",
            fontSize: 12,
            color: "var(--pw-text-dim)",
          }}
        >
          {error}
        </div>
      ) : codes.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>
          No promo codes yet. Click &ldquo;+ New Code&rdquo; to create your first discount.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {codes.map((pc) => (
            <div
              key={pc.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--pw-border-light)",
                opacity: pc.active ? 1 : 0.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: "0.05em",
                    color: "var(--pw-accent)",
                  }}
                >
                  {pc.code}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "rgba(var(--pw-accent-rgb, 124,131,250), 0.1)",
                    color: "var(--pw-accent)",
                  }}
                >
                  {formatDiscount(pc.coupon)}
                </span>
                <span style={{ fontSize: 11, color: "var(--pw-text-dim)" }}>
                  {formatDuration(pc.coupon)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "var(--pw-text-dim)" }}>
                  {pc.timesRedeemed} used
                  {pc.maxRedemptions ? ` / ${pc.maxRedemptions}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => copyCode(pc.code)}
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--pw-border-light)",
                    background: copied === pc.code ? "rgba(34,197,94,0.1)" : "transparent",
                    color: copied === pc.code ? "#22c55e" : "var(--pw-text-dim)",
                    cursor: "pointer",
                    fontWeight: 600,
                    transition: "all 0.15s",
                  }}
                >
                  {copied === pc.code ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
