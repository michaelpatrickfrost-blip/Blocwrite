import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Blocwrite terms of service. Read our terms governing the use of the novel writing studio, subscriptions, and data handling.",
  alternates: { canonical: "https://blocwrite.com/terms" },
  robots: { index: true, follow: true },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
