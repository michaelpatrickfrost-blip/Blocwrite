import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Blocwrite terms and conditions. Read our terms governing the use of the novel writing studio, subscriptions, and data handling.",
  alternates: { canonical: "https://blocwrite.com/terms" },
  robots: { index: true, follow: true },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
