import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your Blocwrite writing studio. Access your novels, story bible, and manuscript editor.",
  alternates: { canonical: "https://blocwrite.com/login" },
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
