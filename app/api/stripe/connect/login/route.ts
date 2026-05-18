import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import { getStripe } from "@/lib/stripe/server";
import { getWorkspaceStripeSettings } from "@/lib/stripe/connect";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const organizationId = await ensureWorkspace(supabase, user);
    const settings = await getWorkspaceStripeSettings(supabase, organizationId);

    if (!settings.stripeConnectedAccountId) {
      return NextResponse.json(
        { error: "Connect Stripe before opening the Stripe dashboard." },
        { status: 400 }
      );
    }

    const stripe = await getStripe();
    const loginLink = await stripe.accounts.createLoginLink(
      settings.stripeConnectedAccountId
    );

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to open Stripe dashboard.",
      },
      { status: 500 }
    );
  }
}
