import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import { ensureSubscriptionRow } from "@/lib/billing/subscriptions";
import { getBaseUrl, getStripe, isStripeConfigured } from "@/lib/stripe/server";

export const runtime = "nodejs";

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
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${getBaseUrl(request.url)}/billing`,
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
