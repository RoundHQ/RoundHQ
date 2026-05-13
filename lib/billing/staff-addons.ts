import type Stripe from "stripe";
import {
  STAFF_ADDON_PRICE_MONTHLY,
  STAFF_ADDON_PRICE_PENCE,
} from "@/lib/billing/plans";

export const STAFF_ADDON_METADATA_KEY = "roundhq_item";
export const STAFF_ADDON_METADATA_VALUE = "staff_addon";
export const STAFF_ADDON_NAME = "RoundHQ additional staff member";

export { STAFF_ADDON_PRICE_MONTHLY, STAFF_ADDON_PRICE_PENCE };

export function isStaffAddonSubscriptionItem(item: Stripe.SubscriptionItem) {
  return (
    item.metadata?.[STAFF_ADDON_METADATA_KEY] === STAFF_ADDON_METADATA_VALUE ||
    item.price?.metadata?.[STAFF_ADDON_METADATA_KEY] === STAFF_ADDON_METADATA_VALUE
  );
}

export function getStaffAddonSubscriptionItem(subscription: Stripe.Subscription) {
  return subscription.items.data.find(isStaffAddonSubscriptionItem) ?? null;
}

export async function setStripeStaffAddonQuantity({
  stripe,
  subscription,
  organizationId,
  quantity,
  prorationBehavior = "always_invoice",
}: {
  stripe: Stripe;
  subscription: Stripe.Subscription;
  organizationId: string;
  quantity: number;
  prorationBehavior?: "always_invoice" | "create_prorations" | "none";
}) {
  const nextQuantity = Math.max(0, Math.floor(quantity));
  const staffAddonItem = getStaffAddonSubscriptionItem(subscription);
  const itemMetadata = {
    [STAFF_ADDON_METADATA_KEY]: STAFF_ADDON_METADATA_VALUE,
    organization_id: organizationId,
  };

  if (nextQuantity <= 0) {
    if (staffAddonItem) {
      await stripe.subscriptionItems.del(staffAddonItem.id, {
        payment_behavior: "error_if_incomplete",
        proration_behavior: prorationBehavior,
      });
    }
  } else if (staffAddonItem) {
    await stripe.subscriptionItems.update(staffAddonItem.id, {
      quantity: nextQuantity,
      payment_behavior: "error_if_incomplete",
      proration_behavior: prorationBehavior,
      metadata: itemMetadata,
    });
  } else {
    const staffAddonProduct = await stripe.products.create({
      name: STAFF_ADDON_NAME,
      metadata: itemMetadata,
    });

    await stripe.subscriptionItems.create({
      subscription: subscription.id,
      quantity: nextQuantity,
      payment_behavior: "error_if_incomplete",
      proration_behavior: prorationBehavior,
      metadata: itemMetadata,
      price_data: {
        currency: "gbp",
        product: staffAddonProduct.id,
        unit_amount: STAFF_ADDON_PRICE_PENCE,
        recurring: {
          interval: "month",
        },
      },
    });
  }

  return stripe.subscriptions.retrieve(subscription.id, {
    expand: ["items.data.price"],
  });
}
