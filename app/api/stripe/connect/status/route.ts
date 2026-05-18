import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import { getStripe } from "@/lib/stripe/server";
import {
  buildStripeConnectResponse,
  getStripeConnectStatus,
  getWorkspaceStripeSettings,
  updateWorkspaceStripeSettings,
} from "@/lib/stripe/connect";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const organizationId = await ensureWorkspace(supabase, user);
    const existingSettings = await getWorkspaceStripeSettings(
      supabase,
      organizationId
    );

    if (!existingSettings.stripeConnectedAccountId) {
      return NextResponse.json(buildStripeConnectResponse(existingSettings));
    }

    const stripe = await getStripe();
    const account = await stripe.accounts.retrieve(
      existingSettings.stripeConnectedAccountId
    );
    const status = getStripeConnectStatus(account);
    const settings = await updateWorkspaceStripeSettings(supabase, organizationId, {
      stripeConnectedAccountId: account.id,
      stripeConnectStatus: status,
      stripeConnectChargesEnabled: account.charges_enabled,
      stripeConnectPayoutsEnabled: account.payouts_enabled,
      stripeConnectDetailsSubmitted: account.details_submitted,
      stripePaymentLinksEnabled:
        existingSettings.stripePaymentLinksEnabled && account.charges_enabled,
    });

    return NextResponse.json(buildStripeConnectResponse(settings));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to refresh Stripe status.",
      },
      { status: 500 }
    );
  }
}
