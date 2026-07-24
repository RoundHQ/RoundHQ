# AI Receptionist Telnyx Setup

RoundHQ AI Receptionist launches in **Voicemail-to-Lead** mode.

Live realtime AI conversations are not part of the production launch. They must remain hidden or disabled until the later realtime upgrade is reviewed separately.

## Product Model

RoundHQ owns one secure Telnyx integration. Customers never enter Telnyx API keys, public keys, connection IDs, messaging profiles, or webhook details.

A workspace administrator can choose either:

- **Keep my existing number**: enter the existing business number, let RoundHQ allocate a UK receptionist number, then forward unanswered calls to it.
- **Choose a new number**: search by town, area code, or preferred digits and activate an available UK number.

An arbitrary existing number cannot be taken over automatically. Full number porting remains an assisted process because the carrier may require ownership and regulatory documents.

## Required Platform Environment Variables

Add these to local, staging, and production server environments:

```env
AI_RECEPTIONIST_PUBLIC_BASE_URL=https://app.roundhq.co.uk
AI_RECEPTIONIST_TELNYX_API_KEY=
AI_RECEPTIONIST_TELNYX_PUBLIC_KEY=
AI_RECEPTIONIST_TELNYX_CONNECTION_ID=
AI_RECEPTIONIST_TELNYX_MESSAGING_PROFILE_ID=
AI_RECEPTIONIST_TELNYX_BILLING_GROUP_ID=
```

The API key, public webhook key, and connection ID are required. The messaging profile and billing group are optional.

These variables are server-only. Do not prefix them with `NEXT_PUBLIC_` and do not send them to browser components.

`AI_RECEPTIONIST_SECRET_ENCRYPTION_KEY` is retained only for decrypting legacy per-workspace Telnyx keys or Twilio auth tokens during migration. New Telnyx provisioning does not store the platform API key in Supabase.

`AI_RECEPTIONIST_INTAKE_TOKEN` is only required when another trusted internal service posts directly to `/api/ai-receptionist/leads`; signed Telnyx webhooks do not use it.

## One-Time Telnyx Platform Setup

The RoundHQ platform owner must:

1. Create or sign in to the RoundHQ Telnyx account.
2. Create a Call Control application/connection.
3. Configure its primary webhook URL as:

   ```text
   https://YOUR_PUBLIC_ROUNDHQ_DOMAIN/api/ai-receptionist/telnyx/webhook
   ```

4. Copy the API key, webhook public key, and connection ID into the server environment.
5. Optionally configure a shared messaging profile and billing group.
6. Ensure the account can search and order UK local voice numbers.

RoundHQ’s number-order request assigns the shared connection and an organisation-specific customer reference at purchase time.

## Database Setup

For a fresh database, use only:

```text
supabase/roundhq_tenant_schema.sql
```

For an existing database, apply once:

```text
supabase/ai_receptionist_managed_numbers.sql
```

The migration adds allocation mode, existing-number forwarding details, Telnyx order identifiers, provisioning status, an idempotency reference, and a safe customer-facing error field.

Do not apply every legacy SQL file to a fresh database.

## Customer Setup

The platform owner must first enable the `AI Receptionist pilot` customer feature for the organisation. It remains disabled by default in production.

A workspace administrator then opens `Settings -> AI Receptionist`.

### Existing business number

1. Select **Keep my existing number**.
2. Enter the business number.
3. Select **Set up call forwarding**.
4. RoundHQ allocates a UK receptionist number.
5. The customer asks their current provider to forward unanswered calls to that number.

### New business number

1. Select **Choose a new number**.
2. Search using a town, area code, or preferred digits.
3. Choose one of the available results.
4. RoundHQ orders and attaches it to the shared Call Control application.

The ordering flow stores an idempotency reference before contacting Telnyx. A retry first looks up the existing order by that reference, preventing an interrupted request from purchasing a second number.

If Telnyx reports unmet regulatory requirements, the customer sees a review status rather than a false success message.

## Webhook Flow

Telnyx sends all call events to the application's primary webhook. RoundHQ dispatches `call.initiated`, `call.speak.ended`, `call.recording.saved`, `call.recording.transcription.saved`, recording errors, and call-status events internally.

The inbound flow is:

```text
Incoming call
-> shared Telnyx Call Control webhook
-> RoundHQ resolves organisation from the called number
-> Telnyx plays greeting and recording-consent prompt
-> after the greeting, Telnyx records caller audio only
-> recording callback is stored while transcription is pending
-> asynchronous transcription callback creates exactly one lead
```

There is no fallback organisation. Unknown called numbers are rejected.

Webhook requests must include valid Telnyx signature headers:

- `telnyx-timestamp`
- `telnyx-signature-ed25519`

RoundHQ verifies them using the platform public key.

## Recording Privacy

New Telnyx-created lead activity stores a recording ID, not a raw provider recording URL.

Playback uses:

```text
GET /api/ai-receptionist/recordings/:id
```

This endpoint requires an authenticated RoundHQ user, checks workspace access, and fetches the recording server-side using the platform API key.

## Local Testing

1. Set the managed Telnyx environment variables.
2. Apply `supabase/ai_receptionist_managed_numbers.sql` to an existing local database.
3. Run RoundHQ locally.
4. Expose it through a secure tunnel.
5. Set `AI_RECEPTIONIST_PUBLIC_BASE_URL` to the tunnel HTTPS origin.
6. Point the Telnyx Call Control webhook to the tunnel URL.
7. Open `Settings -> AI Receptionist` and allocate a test number.
8. Place a test call and leave a message after the beep.

Run the focused suites:

```bash
npm run test:ai-receptionist-number-provisioning
npm run test:ai-receptionist-settings
npm run test:ai-receptionist-telnyx
```

## Staging Checklist

1. Apply the canonical schema to a fresh database, or the managed-number migration to an existing database.
2. Enable the `AI Receptionist pilot` feature for the staging organisation.
3. Set all required platform Telnyx environment variables.
4. Set `AI_RECEPTIONIST_PUBLIC_BASE_URL` to the public HTTPS origin.
5. Confirm Supabase service-role credentials are configured for webhooks.
6. Confirm the Telnyx application uses API v2 and the unified webhook URL.
7. Allocate a number through the customer-facing settings flow.
8. Confirm the allocated number is attached to the shared connection in Telnyx.
9. Save the greeting and enable voicemail-to-lead.
10. Place an inbound test call and leave a message.
11. Confirm no lead is created before the transcript arrives.
12. Confirm exactly one lead appears after transcription.
13. Redeliver callbacks and confirm no duplicate lead is created.
14. Confirm unknown numbers and invalid or stale signatures are rejected.
15. Test a failed transcription and confirm the fallback lead is created.

## Current Launch Limitation

RoundHQ AI Receptionist is **voicemail-to-lead only** for launch.

Do not market or expose live realtime AI conversations until the realtime media bridge, latency, monitoring, safety controls, and production support model have been reviewed separately.