import Link from "next/link";
import Image from "next/image";

const features = [
  { title: "Live Word Counts", desc: "Real-time stats and reading time as you write" },
  { title: "Focus Editor", desc: "Rich text editing with autosave built in" },
  { title: "Canon", desc: "Characters, locations, lore — your story's source of truth" },
  { title: "Grammar Check", desc: "Proofreading powered by LanguageTool" },
  { title: "AI Assistant", desc: "Generate ideas and expand scenes with AI" },
  { title: "EPUB Export", desc: "One-click export to EPUB and DOCX" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      {/* Hero */}
      <div className="max-w-3xl w-full text-center space-y-6 mb-16">
        <div className="flex justify-center mb-4">
          <Image
            src="/pilotwriter-logo.png"
            alt="PilotWriter"
            width={64}
            height={64}
            className="rounded-2xl"
            style={{
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
            }}
          />
        </div>
        <p
          className="text-sm uppercase font-medium"
          style={{
            letterSpacing: "0.3em",
            color: "rgba(255, 255, 255, 0.4)",
          }}
        >
          Pilotwriter
        </p>
        <h1
          className="text-5xl lg:text-6xl font-bold leading-tight"
          style={{
            letterSpacing: "-0.03em",
            color: "rgba(255, 255, 255, 0.92)",
          }}
        >
          A modern cockpit for
          <br />
          <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>
            writing novels.
          </span>
        </h1>
        <p
          className="text-lg max-w-lg mx-auto"
          style={{ color: "rgba(255, 255, 255, 0.4)", lineHeight: 1.65 }}
        >
          Plan projects, draft chapters with live stats, get grammar suggestions,
          and export polished EPUBs — all in one place.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="btn btn-primary"
            style={{
              padding: "11px 24px",
              fontSize: "14px",
              borderRadius: "10px",
            }}
          >
            Open PilotWriter
          </Link>
          <Link
            href="/login"
            className="btn"
            style={{
              padding: "11px 24px",
              fontSize: "14px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.06)",
              color: "rgba(255, 255, 255, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Preview window */}
      <div className="w-full max-w-3xl mb-20">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between text-sm"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <span style={{ color: "rgba(255, 255, 255, 0.35)", fontWeight: 500 }}>
              Chapter: Takeoff
            </span>
            <span style={{ color: "rgba(255, 255, 255, 0.5)", fontWeight: 600 }}>
              1,247 words
            </span>
          </div>
          <div className="p-8 space-y-4">
            <p
              className="text-base leading-relaxed"
              style={{ color: "rgba(255, 255, 255, 0.6)" }}
            >
              The runway lights blurred as Mara pushed the throttle. PilotWriter counted
              each word, but she stopped thinking about numbers the moment the nose lifted.
            </p>
            <p
              className="text-base leading-relaxed"
              style={{ color: "rgba(255, 255, 255, 0.3)" }}
            >
              Above the clouds, she typed freely — grammar nudges glowed in the margin,
              and an export badge waited for when the story was ready for readers.
            </p>
            <div className="flex gap-2 pt-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "rgba(255, 255, 255, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                Grammar clean
              </span>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "rgba(255, 255, 255, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                Export ready
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="w-full max-w-3xl">
        <p
          className="text-center text-sm uppercase mb-8 font-semibold"
          style={{
            letterSpacing: "0.2em",
            color: "rgba(255, 255, 255, 0.25)",
          }}
        >
          Everything you need
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <div
                className="text-sm font-semibold mb-1"
                style={{ color: "rgba(255, 255, 255, 0.7)" }}
              >
                {f.title}
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255, 255, 255, 0.3)" }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-20 text-center">
        <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.2)" }}>
          Built for writers who want to ship novels faster.
        </p>
      </footer>
    </main>
  );
}
