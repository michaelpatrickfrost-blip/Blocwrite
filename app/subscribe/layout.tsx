import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscribe — Start Your Free Trial",
  description: "Create your Blocwrite account and start a 7-day free trial. Full access to the structured novel writing studio — plan, write, and export your book.",
  alternates: { canonical: "https://blocwrite.com/subscribe" },
  openGraph: {
    title: "Subscribe to Blocwrite — 7-Day Free Trial",
    description: "Start writing your novel today. Full access to the structured writing studio for 7 days, free.",
  },
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
