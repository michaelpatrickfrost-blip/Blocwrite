import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the Blocwrite team. Questions about the writing studio, your subscription, or feedback — we'd love to hear from you.",
  alternates: { canonical: "https://blocwrite.com/contact" },
  openGraph: {
    title: "Contact Blocwrite",
    description: "Questions, feedback, or support — reach out to the Blocwrite team.",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
