import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blocwrite — Shared Chapter",
  description: "Read and leave feedback on shared chapters from Blocwrite.",
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {children}
    </>
  );
}
