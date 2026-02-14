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
 *
 * Note: Cookie clearing for stale sessions is handled by middleware.ts when the
 * user arrives at /login?reason=session-expired, since Server Components cannot
 * modify cookies.
 */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await checkSubscriptionGate();

  if (gate.sessionStale) {
    // Middleware will clear the stale cookie when user hits /login?reason=...
    redirect("/login?reason=session-expired");
  }

  if (!gate.authorized) {
    redirect("/subscribe");
  }

  return <MobileGate>{children}</MobileGate>;
}
