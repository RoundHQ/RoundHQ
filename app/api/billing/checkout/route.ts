import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import {
  ensureSubscriptionRow,
  hasDashboardAccess,
} from "@/lib/billing/subscriptions";
import {
  getBaseUrl,
  getStripe,
  getStripePriceId,
  isStripeConfigured,
} from "@/lib/stripe/server";

export const runtime = "nodejs";

async function getOrganizationName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string
) {
  const { data } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .limit(1);

  return typeof data?.[0]?.name === "string" && data[0].name.trim()
    ? data[0].name.trim()
    : "RoundHQ Workspace";
}

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
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

    if (hasDashboardAccess(subscription)) {
      return NextResponse.json({ url: `${getBaseUrl(request.url)}/dashboard` });
    }

    const stripe = getStripe();
    const priceId = getStripePriceId();
    const organizationName = await getOrganizationName(supabase, organizationId);
    let customerId = subscription.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: organizationName,
        metadata: {
          organization_id: organizationId,
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organizationId);

      if (updateError) {
        throw updateError;
      }
    }

    const baseUrl = getBaseUrl(request.url);
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/api/billing/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard?billing=cancelled`,
      client_reference_id: organizationId,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_update: {
        address: "auto",
        name: "auto",
      },
      metadata: {
        organization_id: organizationId,
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          organization_id: organizationId,
          supabase_user_id: user.id,
        },
      },
    });

    if (!checkoutSession.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to start checkout.",
      },
      { status: 500 }
    );
  }
}

