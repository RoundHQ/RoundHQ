import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { syncStripeCheckoutSession, syncStripeSubscription } from "@/lib/billing/stripe-sync";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase service role credentials are required for Stripe webhooks."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
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

