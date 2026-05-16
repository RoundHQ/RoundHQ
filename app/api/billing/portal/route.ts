import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import { ensureSubscriptionRow } from "@/lib/billing/subscriptions";
import { getBaseUrl, getStripe, isStripeConfigured } from "@/lib/stripe/server";

export const runtime = "nodejs";

function normalizeReturnPath(value: unknown) {
  if (typeof value !== "string") {
    return "/billing";
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/billing";
  }

  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isStripeConfigured())) {
      return NextResponse.json(
        { error: "Stripe is not configured yet." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const organizationId = await ensureWorkspace(supabase, user);
    const subscription = await ensureSubscriptionRow(supabase, organizationId);

    if (!subscription.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer exists for this workspace yet." },
        { status: 400 }
      );
    }

    const stripe = await getStripe();
    const requestBody = (await request.json().catch(() => null)) as
      | { returnPath?: unknown }
      | null;
    const returnPath = normalizeReturnPath(requestBody?.returnPath);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${getBaseUrl(request.url)}${returnPath}`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to open billing portal.",
      },
      { status: 500 }
    );
  }
}
