import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";
import {
  ensureSubscriptionRow,
  hasDashboardAccess,
  isMissingSubscriptionAddonColumn,
} from "@/lib/billing/subscriptions";
import {
  getStaffAddonSubscriptionItem,
  setStripeStaffAddonQuantity,
} from "@/lib/billing/staff-addons";
import { syncStripeSubscription } from "@/lib/billing/stripe-sync";
import { getBaseUrl, getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

const MIN_STAFF_ADDONS_PER_PURCHASE = 1;
const MAX_STAFF_ADDONS_PER_PURCHASE = 50;

function parseStaffAddonQuantity(value: unknown) {
  const quantity = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(quantity)) {
    return null;
  }

  if (
    quantity < MIN_STAFF_ADDONS_PER_PURCHASE ||
    quantity > MAX_STAFF_ADDONS_PER_PURCHASE
  ) {
    return null;
  }

  return quantity;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      quantity?: unknown;
    } | null;
    const quantityToAdd = parseStaffAddonQuantity(body?.quantity);

    if (!quantityToAdd) {
      return NextResponse.json(
        {
          error: `Choose between ${MIN_STAFF_ADDONS_PER_PURCHASE} and ${MAX_STAFF_ADDONS_PER_PURCHASE} staff accounts.`,
        },
        { status: 400 }
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

    if (!hasDashboardAccess(subscription)) {
      return NextResponse.json(
        { error: "An active subscription is required before adding staff accounts." },
        { status: 402 }
      );
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No Stripe subscription is linked to this workspace yet." },
        { status: 400 }
      );
    }

    const schemaCheck = await supabase
      .from("subscriptions")
      .select("stripe_staff_addon_item_id, staff_addon_quantity")
      .eq("organization_id", organizationId)
      .limit(1);

    if (isMissingSubscriptionAddonColumn(schemaCheck.error)) {
      return NextResponse.json(
        {
          error:
            "Run the latest tenant schema before selling additional staff accounts.",
        },
        { status: 500 }
      );
    }

    if (schemaCheck.error) {
      throw schemaCheck.error;
    }

    const stripe = await getStripe();
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id,
      {
        expand: ["items.data.price"],
      }
    );
    const staffAddonItem = getStaffAddonSubscriptionItem(stripeSubscription);
    const currentStaffAddonQuantity = Math.max(
      subscription.staff_addon_quantity,
      staffAddonItem?.quantity ?? 0
    );
    const nextStaffAddonQuantity = currentStaffAddonQuantity + quantityToAdd;
    const updatedSubscription = await setStripeStaffAddonQuantity({
      stripe,
      subscription: stripeSubscription,
      organizationId,
      quantity: nextStaffAddonQuantity,
      prorationBehavior: "always_invoice",
    });

    await syncStripeSubscription(
      supabase,
      updatedSubscription,
      organizationId,
      subscription.plan
    );

    return NextResponse.json({
      url: `${getBaseUrl(request.url)}/billing?staff_addon=success`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to add staff accounts.",
      },
      { status: 500 }
    );
  }
}
