import { redirect } from "next/navigation";
import { checkSubscriptionGate } from "@/lib/subscription-gate";
import MobileGate from "./components/MobileGate";

/**
 * Server component layout that wraps all /studio/* pages.
 * Enforces subscription — only admin or users with active/trialing subscriptions get through.
 * Also enforces single-session — if the user logged in elsewhere, kick them out.
 * Users without a subscription are redirected to /subscribe.
 *
 * Basic auth (valid bw-session cookie) is already checked by middleware.ts.
 * This layout adds subscription + single-session authorization on top.
 */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await checkSubscriptionGate();

  if (gate.sessionStale) {
    // User logged in on another device/browser — kick this session out
    redirect("/login?reason=session-expired");
  }

  if (!gate.authorized) {
    redirect("/subscribe");
  }

  return <MobileGate>{children}</MobileGate>;
}
