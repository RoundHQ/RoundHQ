"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  normalizeCustomerAccountStatus,
  normalizeSupportPriority,
} from "@/lib/customer-account";
import {
  CUSTOMER_FEATURES,
  type CustomerFeatureAccess,
} from "@/lib/customer-features";
import {
  normalizePlanKey,
  normalizeStaffAddonQuantity,
} from "@/lib/billing/plans";
import { setStripeStaffAddonQuantity } from "@/lib/billing/staff-addons";
import { syncStripeSubscription } from "@/lib/billing/stripe-sync";
import {
  isMissingSubscriptionAddonColumn,
  isMissingSubscriptionPlanColumn,
} from "@/lib/billing/subscriptions";
import { requireAdminAccess } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

type AdminSubscriptionStaffAddonRow = {
  organization_id: string;
  plan: string | null;
  stripe_subscription_id: string | null;
  staff_addon_quantity: number | string | null;
};

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getPositiveInteger(formData: FormData, key: string) {
  const value = Number(getText(formData, key));

  if (!Number.isInteger(value) || value < 1) {
    return 0;
  }

  return value;
}

function getFeatureAccess(formData: FormData): CustomerFeatureAccess {
  return Object.fromEntries(
    CUSTOMER_FEATURES.map((feature) => [
      feature.key,
      formData.get(`feature_${feature.key}`) === "on",
    ])
  ) as CustomerFeatureAccess;
}

export async function updateCustomerAccountAction(
  organizationId: string,
  formData: FormData
) {
  await requireAdminAccess(`/admin/customers/${organizationId}`);

  if (!isUuid(organizationId)) {
    throw new Error("Unknown customer workspace.");
  }

  const accountStatus = normalizeCustomerAccountStatus(
    getText(formData, "account_status")
  );
  const supportPriority = normalizeSupportPriority(
    getText(formData, "support_priority")
  );
  const disabledReason = getText(formData, "disabled_reason");
  const internalNotes = getText(formData, "internal_notes");
  const subscriptionPlan = normalizePlanKey(getText(formData, "subscription_plan"));
  const smsBillingEnabled = formData.get("sms_billing_enabled") === "on";
  const smsFeeWaived = formData.get("sms_fee_waived") === "on";
  const supabase = createServiceRoleClient();
  const { data: existingSettings, error: existingSettingsError } = await supabase
    .from("customer_account_settings")
    .select("sms_billing_enabled,sms_fee_waived,sms_price_per_message_pence")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existingSettingsError) throw new Error(existingSettingsError.message);

  const { error: settingsError } = await supabase.from("customer_account_settings").upsert(
    {
      organization_id: organizationId,
      account_status: accountStatus,
      disabled_reason: disabledReason,
      support_priority: supportPriority,
      internal_notes: internalNotes,
      feature_access: getFeatureAccess(formData),
      sms_billing_enabled: smsBillingEnabled,
      sms_fee_waived: smsFeeWaived,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "organization_id",
    }
  );

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  if (existingSettings?.sms_billing_enabled !== smsBillingEnabled) {
    const { error: auditError } = await supabase.from("sms_billing_events").insert({
      organization_id: organizationId,
      event_type: smsBillingEnabled ? "billing_enabled" : "billing_disabled",
      price_per_message_pence: Number(existingSettings?.sms_price_per_message_pence ?? 10),
    });
    if (auditError) throw new Error(auditError.message);
  }

  if (existingSettings?.sms_fee_waived !== smsFeeWaived) {
    const { error: auditError } = await supabase.from("sms_billing_events").insert({
      organization_id: organizationId,
      event_type: smsFeeWaived ? "fee_waived" : "fee_reinstated",
      price_per_message_pence: smsFeeWaived
        ? 0
        : Number(existingSettings?.sms_price_per_message_pence ?? 10),
    });
    if (auditError) throw new Error(auditError.message);
  }

  let { error: subscriptionError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        organization_id: organizationId,
        plan: subscriptionPlan,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "organization_id",
      }
    );

  if (isMissingSubscriptionPlanColumn(subscriptionError)) {
    const legacySubscriptionResult = await supabase
      .from("subscriptions")
      .upsert(
        {
          organization_id: organizationId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "organization_id",
        }
      );

    subscriptionError = legacySubscriptionResult.error;
  }

  if (subscriptionError) {
    throw new Error(subscriptionError.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${organizationId}`);
  redirect(`/admin/customers/${organizationId}?saved=1`);
}

export async function updateCustomerStaffAllowanceAction(
  organizationId: string,
  formData: FormData
) {
  await requireAdminAccess(`/admin/customers/${organizationId}`);

  if (!isUuid(organizationId)) {
    throw new Error("Unknown customer workspace.");
  }

  const operation = getText(formData, "operation");
  const quantity = getPositiveInteger(formData, "quantity");

  if (operation !== "add" && operation !== "remove") {
    throw new Error("Choose whether to add or remove paid staff allowance.");
  }

  if (!quantity) {
    throw new Error("Enter at least 1 staff member.");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "organization_id, plan, stripe_subscription_id, staff_addon_quantity"
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (isMissingSubscriptionAddonColumn(error)) {
    throw new Error(
      "Run supabase/staff_addons_schema.sql before changing staff allowance."
    );
  }

  if (error) {
    throw new Error(error.message);
  }

  const subscription = data as AdminSubscriptionStaffAddonRow | null;
  const currentQuantity = normalizeStaffAddonQuantity(
    subscription?.staff_addon_quantity
  );
  const nextQuantity =
    operation === "add"
      ? currentQuantity + quantity
      : Math.max(0, currentQuantity - quantity);

  if (subscription?.stripe_subscription_id) {
    const stripe = await getStripe();
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id,
      {
        expand: ["items.data.price"],
      }
    );
    const updatedSubscription = await setStripeStaffAddonQuantity({
      stripe,
      subscription: stripeSubscription,
      organizationId,
      quantity: nextQuantity,
      prorationBehavior: operation === "add" ? "always_invoice" : "none",
    });

    await syncStripeSubscription(
      supabase,
      updatedSubscription,
      organizationId,
      normalizePlanKey(subscription.plan)
    );
  } else {
    const { error: updateError } = await supabase.from("subscriptions").upsert(
      {
        organization_id: organizationId,
        staff_addon_quantity: nextQuantity,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "organization_id",
      }
    );

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${organizationId}`);
  revalidatePath("/dashboard");
  redirect(`/admin/customers/${organizationId}?saved=staff`);
}

export async function deleteCustomerWorkspaceAction(
  organizationId: string,
  formData: FormData
) {
  await requireAdminAccess(`/admin/customers/${organizationId}`);

  if (!isUuid(organizationId)) {
    throw new Error("Unknown customer workspace.");
  }

  const supabase = createServiceRoleClient();
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  if (!organization) {
    throw new Error("Customer workspace not found.");
  }

  const organizationName =
    typeof organization.name === "string" ? organization.name : "";
  const confirmation = getText(formData, "confirm_name");

  if (confirmation !== organizationName) {
    throw new Error("Type the customer workspace name exactly before deleting.");
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (subscriptionError && subscriptionError.code !== "PGRST116") {
    throw new Error(subscriptionError.message);
  }

  const stripeSubscriptionId =
    typeof subscription?.stripe_subscription_id === "string"
      ? subscription.stripe_subscription_id
      : "";

  if (stripeSubscriptionId) {
    const stripe = await getStripe();
    await stripe.subscriptions.cancel(stripeSubscriptionId);
  }

  const { error: deleteError } = await supabase
    .from("organizations")
    .delete()
    .eq("id", organizationId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  redirect("/admin/customers?deleted=1");
}
