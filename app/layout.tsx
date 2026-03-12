import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://blocwrite.com";
const SITE_NAME = "Blocwrite";
const SITE_DESC =
  "The structured writing studio for novelists. Plan chapters, build a living story bible, draft scene-by-scene with optional AI, and export publication-ready manuscripts. Bring your own AI key — or write entirely by hand.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — The Novel Writing Studio`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: [
    "novel writing software",
    "book writing app",
    "fiction writing tool",
    "story planner",
    "chapter planner",
    "manuscript editor",
    "story bible",
    "novel outline tool",
    "creative writing software",
    "AI writing assistant",
    "book writing studio",
    "writing workspace",
    "BYOAI writing",
    "novel export EPUB DOCX",
    "scene writing tool",
    "fiction writing app",
    "novel writing app",
    "Blocwrite",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  category: "Productivity",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — The Novel Writing Studio`,
    description: SITE_DESC,
    images: [
      {
        url: "/blocwrite-full-dark.png",
        width: 1200,
        height: 630,
        alt: "Blocwrite — The Novel Writing Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — The Novel Writing Studio`,
    description: SITE_DESC,
    images: ["/blocwrite-full-dark.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/blocwrite-icon-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/blocwrite-icon-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: "/blocwrite-icon-dark.png",
    apple: "/blocwrite-icon-dark.png",
  },
};

/* JSON-LD structured data — injected once at the root level */
const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/blocwrite-full-dark.png`,
  description: SITE_DESC,
  sameAs: [],
};

const jsonLdSoftware = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  operatingSystem: "Web",
  applicationCategory: "ProductivityApplication",
  description: SITE_DESC,
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
    description: "7-day free trial, then subscription",
  },
  featureList: [
    "Chapter-by-chapter novel planner",
    "Living story bible (Canon) with characters, locations, lore",
    "Scene-by-scene bloc writing system",
    "Bring Your Own AI — OpenRouter",
    "AI-optional — every feature works without AI",
    "Professional manuscript export to EPUB and DOCX",
    "Style and voice controls",
    "Bolt-on writing directives",
    "Dark and light mode",
  ],
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What exactly is Blocwrite?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Blocwrite is a structured writing studio for long-form fiction. It gives you a story bible (Canon), a chapter planner, scene-by-scene drafting in focused blocs, and clean manuscript export. Think of it as the workspace between your outline and your finished book.",
      },
    },
    {
      "@type": "Question",
      name: "Is AI included in the subscription?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Blocwrite does not include AI credits or charge for AI usage. You bring your own API key from OpenRouter. Free models are available on OpenRouter. The subscription covers only the studio workspace.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use Blocwrite without AI at all?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Every feature works without AI. You can plan chapters, write prose, manage your Canon, and export manuscripts entirely by hand. AI generation buttons are completely optional — you can toggle them off whenever you like.",
      },
    },
    {
      "@type": "Question",
      name: "What is the Canon?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Canon is your story bible — characters with personalities and speech patterns, locations with sensory details, lore rules, and voice guidelines. When you ask the AI to generate prose, it reads your entire Canon first to stay consistent.",
      },
    },
    {
      "@type": "Question",
      name: "How does the 7-day free trial work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You get full access to every feature for 7 days. No charge until the trial ends. Cancel anytime during the trial and you will not be billed.",
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Cancel from your Settings panel inside the app. Your access continues until the end of the current billing period.",
      },
    },
    {
      "@type": "Question",
      name: "Is my writing private?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Your novels are stored in your own isolated data space. We do not read, train on, or share your content.",
      },
    },
    {
      "@type": "Question",
      name: "What AI models can I use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Any model available through OpenRouter (including free ones like Llama, Mistral, and Gemma). You choose the model and control the costs.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `:root{--font-sans:'Inter',system-ui,sans-serif;--font-display:'Figtree',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace}` }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bw-theme');if(!t)t='light';document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
