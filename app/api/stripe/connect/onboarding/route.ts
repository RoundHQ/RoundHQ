import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import { getBaseUrl, getStripe } from "@/lib/stripe/server";
import {
  buildStripeConnectResponse,
  getStripeConnectStatus,
  getWorkspaceStripeSettings,
  updateWorkspaceStripeSettings,
} from "@/lib/stripe/connect";

export const runtime = "nodejs";

const STRIPE_CONNECT_SETUP_URL = "https://dashboard.stripe.com/connect";

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

function getStripeConnectSetupMessage(error: unknown) {
  const message =
    error instanceof Error && error.message.trim() ? error.message : "";

  if (
    message.toLowerCase().includes("signed up for connect") ||
    message.toLowerCase().includes("dashboard.stripe.com/connect")
  ) {
    return `Stripe Connect is not enabled on the RoundHQ Stripe account yet. Open ${STRIPE_CONNECT_SETUP_URL}, complete Connect setup, then try again.`;
  }

  return "";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const organizationId = await ensureWorkspace(supabase, user);
    const stripe = await getStripe();
    const existingSettings = await getWorkspaceStripeSettings(
      supabase,
      organizationId
    );
    const organizationName = await getOrganizationName(supabase, organizationId);
    let accountId = existingSettings.stripeConnectedAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "GB",
        email: user.email ?? undefined,
        business_profile: {
          name: organizationName,
          product_description: "Garden and property maintenance services",
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          organization_id: organizationId,
          roundhq_workspace: organizationName,
        },
      });

      accountId = account.id;
    }

    const account = await stripe.accounts.retrieve(accountId);
    const status = getStripeConnectStatus(account);
    const settings = await updateWorkspaceStripeSettings(supabase, organizationId, {
      stripeConnectedAccountId: accountId,
      stripeConnectStatus: status,
      stripeConnectChargesEnabled: account.charges_enabled,
      stripeConnectPayoutsEnabled: account.payouts_enabled,
      stripeConnectDetailsSubmitted: account.details_submitted,
      stripePaymentLinksEnabled:
        existingSettings.stripePaymentLinksEnabled && account.charges_enabled,
    });
    const baseUrl = getBaseUrl(request.url);
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard?page=settings&stripe_connect=refresh`,
      return_url: `${baseUrl}/dashboard?page=settings&stripe_connect=return`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      url: accountLink.url,
      ...buildStripeConnectResponse(settings),
    });
  } catch (error) {
    const connectSetupMessage = getStripeConnectSetupMessage(error);

    return NextResponse.json(
      {
        error:
          connectSetupMessage ||
          (error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to start Stripe setup."),
        connectSetupRequired: Boolean(connectSetupMessage),
        setupUrl: connectSetupMessage ? STRIPE_CONNECT_SETUP_URL : undefined,
      },
      { status: connectSetupMessage ? 400 : 500 }
    );
  }
}
