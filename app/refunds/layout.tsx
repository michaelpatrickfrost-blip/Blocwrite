import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Blocwrite refund policy. Understand our approach to refunds, cancellations, and billing for the writing studio subscription.",
  alternates: { canonical: "https://blocwrite.com/refunds" },
  robots: { index: true, follow: true },
};

export default function RefundsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
