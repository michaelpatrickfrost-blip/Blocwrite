import { redirect } from "next/navigation";
import { checkSubscriptionGate } from "@/lib/subscription-gate";

/**
 * Server component layout that wraps all /studio/* pages.
 * Enforces subscription — only admin or users with active/trialing subscriptions get through.
 * Users without a subscription are redirected to /subscribe.
 *
 * Basic auth (valid bw-session cookie) is already checked by middleware.ts.
 * This layout adds the subscription authorization layer on top.
 */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await checkSubscriptionGate();

  if (!gate.authorized) {
    // No active subscription — send them to the subscribe page
    redirect("/subscribe");
  }

  return <>{children}</>;
}
