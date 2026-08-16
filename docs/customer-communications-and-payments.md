# Customer communications and invoice payments

This document covers the tenant-scoped communication queue, secure document links,
service reminders, follow-up messages, and invoice-payment audit records added in
`supabase/20260811_customer_communications.sql`.

## Safe rollout order

1. Back up the database and apply `supabase/20260811_customer_communications.sql`.
   Fresh installations should use `supabase/roundhq_tenant_schema.sql` instead.
2. Set `NEXT_PUBLIC_SITE_URL` to RoundHQ's public HTTPS origin. Customer links are
   refused in production when the configured origin is localhost or otherwise unsafe.
3. Start with `CUSTOMER_MESSAGING_MODE=disabled`. Use `test` to exercise the queue
   without contacting Telnyx or an SMTP server. Change to `live` only after the
   provider webhooks, opt-outs, quiet hours, and sender identity have been checked.
4. Save each business's templates, timezone, quiet hours, and reminder settings in
   Settings. Existing businesses default to reminders and completion messages off.
5. Configure the scheduled worker only after the test-mode queue has been reviewed.

## SMS (Telnyx)

Required for live SMS:

- `CUSTOMER_SMS_TELNYX_API_KEY`
- `CUSTOMER_SMS_TELNYX_PUBLIC_KEY`
- `CUSTOMER_SMS_FROM_NUMBER`

In Telnyx, create or select a Messaging Profile, assign the sending number, and set
its delivery-status webhook to:

`https://YOUR-ROUNDHQ-DOMAIN/api/customer-messages/telnyx-webhook`

RoundHQ validates Telnyx's Ed25519 signature before changing delivery state. Do not
put API keys, private provider payloads, or message bodies in browser code or logs.

## Email (SMTP)

The shared queue uses these server-only variables:

- `CUSTOMER_EMAIL_SMTP_HOST`
- `CUSTOMER_EMAIL_SMTP_PORT` (normally `587` or `465`)
- `CUSTOMER_EMAIL_SMTP_SECURE` (`true` for implicit TLS such as port 465)
- `CUSTOMER_EMAIL_SMTP_USERNAME`
- `CUSTOMER_EMAIL_SMTP_PASSWORD`
- `CUSTOMER_EMAIL_FROM_NAME`
- `CUSTOMER_EMAIL_FROM_ADDRESS`
- `CUSTOMER_EMAIL_REPLY_TO` (optional)

The older `SMTP_*` settings remain supported by existing transactional email flows.
Use an app-specific password where the mail provider requires one.

## Queue worker and reminders

`GET` and `POST /api/cron/customer-messages` both require
`Authorization: Bearer <CRON_SECRET>`. They synchronise eligible service reminders
and process a bounded queue batch. The GET handler is compatible with Vercel Cron;
the POST handler is available to other trusted schedulers. No production schedule is
installed by this change. Add one only after reviewing the test-mode queue because
live mode can send customer communications.

Changing or cancelling a job cancels its stale queued reminder on the next sync.
Idempotency keys, a one-minute processing lease, retry backoff, quiet hours, and
customer communication preferences protect against duplicate or unwanted sends.
When completion texts are enabled, RoundHQ queues one message only when a job first
transitions into Completed. Editing an already-completed job does not resend it.
Failed completion messages can be retried from the completed job; a successful prior
message is returned as a duplicate rather than sent twice. Quote and invoice menus
also expose a text-only preview dialog. The server appends the secure, expiring
document link and records the resulting send in both communication and document
history.

## Stripe invoice payments

RoundHQ continues to use Stripe Connect direct charges and takes no application fee.
The existing server-side Connect flow and invoice payment-link endpoint now also
write provider-neutral `payment_requests` and deduplicated
`payment_webhook_events` audit records. Stripe Checkout creation uses an idempotency
key derived from the tenant, invoice, amount, and invoice version.

Required variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL`

Configure the Connect webhook endpoint as:

`https://YOUR-ROUNDHQ-DOMAIN/api/stripe/webhook`

Subscribe to `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, and `checkout.session.expired` in
addition to the existing subscription events. Only a verified webhook can mark an
invoice payment paid. Provider secrets remain in environment variables; the
`payment_provider_connections.configuration` column is for non-secret display
metadata only.

## GoCardless status

The provider-neutral schema, status model, and GoCardless status mapping are ready,
but GoCardless payment creation is intentionally not enabled. RoundHQ still needs a
GoCardless sandbox account, partner/creditor onboarding decision, access token,
signed-webhook secret, and a decision between Instant Bank Pay and Direct Debit.
Once those are supplied, use GoCardless Billing Requests and hosted Billing Request
Flows; do not collect bank details in RoundHQ. Until then, Settings clearly reports
GoCardless as unavailable and Stripe is the configured invoice-payment provider.

## Voicemail-to-lead

Customer-facing live AI calling is retired. The Telnyx call-control webhook remains:

`https://YOUR-ROUNDHQ-DOMAIN/api/ai-receptionist/telnyx/webhook`

Normalised settings always select voicemail mode. Live OpenAI and realtime media
routes return `410 Gone`; existing realtime columns are retained only for a safe
migration and historical compatibility. Recording access remains authenticated and
tenant-scoped.

## Manual verification without real delivery

- Use `CUSTOMER_MESSAGING_MODE=test` and confirm queued messages move to `sent` with
  a `test_` provider ID.
- Verify secure links contain random tokens, expire, and return not-found after
  revocation.
- Confirm an opted-out customer cannot be queued for that channel.
- Move a scheduled job and run the reminder synchroniser in a mocked test; the old
  reminder should be cancelled and only the new occurrence retained.
- Use Stripe test mode and signed fixture events for payment tests. Never use a live
  card or live connected account during local verification.

No real SMS, email, call, payment, deployment, or production scheduler is performed
by the repository checks.
