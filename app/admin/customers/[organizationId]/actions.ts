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
import { normalizePlanKey } from "@/lib/billing/plans";
import { isMissingSubscriptionPlanColumn } from "@/lib/billing/subscriptions";
import { requireAdminAccess } from "@/lib/admin/guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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
  const supabase = createServiceRoleClient();

  const { error: settingsError } = await supabase.from("customer_account_settings").upsert(
    {
      organization_id: organizationId,
      account_status: accountStatus,
      disabled_reason: disabledReason,
      support_priority: supportPriority,
      internal_notes: internalNotes,
      feature_access: getFeatureAccess(formData),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "organization_id",
    }
  );

  if (settingsError) {
    throw new Error(settingsError.message);
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
  revalidatePath(`/admin/customers/${organizationId}`);
  redirect(`/admin/customers/${organizationId}?saved=1`);
}
