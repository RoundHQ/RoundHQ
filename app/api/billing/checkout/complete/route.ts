import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncStripeCheckoutSession } from "@/lib/billing/stripe-sync";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

async function userCanAccessOrganization(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  organizationId: string
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);

  if (error) {
    throw error;
  }

  return data && data.length > 0;
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    redirect("/dashboard?billing=missing-session");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const stripe = getStripe();
  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "subscription.items.data.price"],
  });
  const organizationId =
    checkoutSession.client_reference_id ||
    checkoutSession.metadata?.organization_id ||
    "";

  if (
    !organizationId ||
    !(await userCanAccessOrganization(supabase, user.id, organizationId))
  ) {
    redirect("/dashboard?billing=unauthorized");
  }

  await syncStripeCheckoutSession(supabase, stripe, checkoutSession);

  redirect("/dashboard?billing=success");
}

