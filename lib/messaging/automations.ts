import "server-only";

import {
  addCalendarDays,
  formatUkDate,
  getBusinessIsoDate,
  zonedLocalDateTimeToUtc,
} from "@/lib/dates";
import { getMessageIdempotencyKey, renderMessageTemplate } from "./core";
import { queueCustomerMessage } from "./server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type ReminderSettings = {
  organization_id: string;
  timezone: string;
  service_reminders_enabled: boolean;
  service_reminder_lead_days: number;
  service_reminder_send_time: string;
  service_reminder_template: string;
};

export async function syncServiceReminderMessages(now = new Date()) {
  const supabase = createServiceRoleClient();
  const { data: settingsRows, error } = await supabase
    .from("communication_settings")
    .select(
      "organization_id,timezone,service_reminders_enabled,service_reminder_lead_days,service_reminder_send_time,service_reminder_template"
    )
    .eq("service_reminders_enabled", true)
    .limit(500);
  if (error) throw error;

  let queued = 0;
  let cancelled = 0;
  let skipped = 0;

  for (const rawSettings of settingsRows ?? []) {
    const settings = rawSettings as ReminderSettings;
    const businessToday = getBusinessIsoDate(now, settings.timezone);
    const serviceDate = addCalendarDays(
      businessToday,
      Math.max(0, settings.service_reminder_lead_days)
    );
    const { data: jobs, error: jobsError } = await supabase
      .from("scheduled_jobs")
      .select(
        "id,date,start_time,finish_time,title,work_type,customer_id,customer_name,status"
      )
      .eq("organization_id", settings.organization_id)
      .eq("date", serviceDate)
      .in("status", ["Scheduled", "In Progress"])
      .limit(500);
    if (jobsError) throw jobsError;

    const activeJobIds = new Set((jobs ?? []).map((job) => String(job.id)));
    const { data: staleMessages, error: staleError } = await supabase
      .from("customer_messages")
      .select("id,related_id,occurrence_key")
      .eq("organization_id", settings.organization_id)
      .eq("message_kind", "service_reminder")
      .eq("status", "queued")
      .limit(500);

    if (staleError) throw staleError;
    for (const message of staleMessages ?? []) {
      if (
        !activeJobIds.has(String(message.related_id)) ||
        message.occurrence_key !==
          `service-reminder:${message.related_id}:${serviceDate}`
      ) {
        await supabase
          .from("customer_messages")
          .update({
            status: "cancelled",
            cancelled_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", message.id)
          .eq("status", "queued");
        cancelled += 1;
      }
    }

    const customerIds = Array.from(
      new Set(
        (jobs ?? [])
          .map((job) => Number(job.customer_id))
          .filter((customerId) => Number.isInteger(customerId) && customerId > 0)
      )
    );
    const [{ data: organization }, customersResult] = await Promise.all([
      supabase
        .from("organizations")
        .select("name")
        .eq("id", settings.organization_id)
        .maybeSingle(),
      customerIds.length > 0
        ? supabase
            .from("customers")
            .select("id,phone,name")
            .eq("organization_id", settings.organization_id)
            .in("id", customerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (customersResult.error) throw customersResult.error;
    const customersById = new Map(
      (customersResult.data ?? []).map((customer) => [Number(customer.id), customer])
    );

    for (const job of jobs ?? []) {
      if (job.customer_id == null) {
        skipped += 1;
        continue;
      }

      const customer = customersById.get(Number(job.customer_id));

      if (!customer?.phone) {
        skipped += 1;
        continue;
      }

      const occurrence = `service-reminder:${job.id}:${serviceDate}`;
      const scheduledFor = zonedLocalDateTimeToUtc(
        businessToday,
        settings.service_reminder_send_time,
        settings.timezone
      );
      const result = await queueCustomerMessage(supabase, {
        organizationId: settings.organization_id,
        customerId: customer.id,
        channel: "sms",
        kind: "service_reminder",
        recipient: customer.phone,
        body: renderMessageTemplate(settings.service_reminder_template, {
          customerName: customer.name,
          serviceDate: formatUkDate(serviceDate, {}, settings.timezone),
          arrivalWindow:
            [job.start_time, job.finish_time].filter(Boolean).join("–") ||
            "during the day",
          serviceType: job.work_type || job.title,
          businessName: organization?.name || "your service provider",
        }),
        relatedType: "job",
        relatedId: String(job.id),
        occurrence,
        idempotencyKey: getMessageIdempotencyKey({
          organizationId: settings.organization_id,
          customerId: customer.id,
          channel: "sms",
          kind: "service_reminder",
          relatedType: "job",
          relatedId: String(job.id),
          occurrence,
        }),
        scheduledFor: Number.isNaN(scheduledFor.getTime()) ? now : scheduledFor,
      });
      queued += result.duplicate ? 0 : 1;
    }
  }

  return { queued, cancelled, skipped };
}
