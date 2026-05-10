import { NextResponse } from "next/server";
import Stripe from "stripe";
import { syncStripeCheckoutSession, syncStripeSubscription } from "@/lib/billing/stripe-sync";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = await getStripe();
  const webhookSecret = await getStripeWebhookSecret();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!webhookSecret || !signature) {
    return NextResponse.json(
      { error: "Stripe webhook signing is not configured." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Invalid Stripe webhook signature.",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceRoleClient();

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await syncStripeCheckoutSession(
          supabase,
          stripe,
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        await syncStripeSubscription(
          supabase,
          event.data.object as Stripe.Subscription
        );
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to process Stripe webhook.",
      },
      { status: 500 }
    );
  }
}
