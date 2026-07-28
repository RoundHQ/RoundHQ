# AI Receptionist Telnyx Setup

RoundHQ AI Receptionist supports two per-workspace answering modes:

- **Voicemail to lead** plays a fixed greeting, records the caller, and creates a lead from the Telnyx transcript.
- **Live AI conversation** transfers the answered call directly from Telnyx to the OpenAI Realtime SIP service. The AI speaks with the caller and the full call is recorded and transcribed by Telnyx so RoundHQ can create the lead.

Live AI is a controlled testing feature. Customer feature access is off by default, and Live AI is also off by default inside an enabled workspace.

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
OPENAI_API_KEY=
OPENAI_PROJECT_ID=proj_...
OPENAI_WEBHOOK_SECRET=whsec_...
OPENAI_REALTIME_MODEL=gpt-realtime-2.1
OPENAI_REALTIME_VOICE=marin
AI_RECEPTIONIST_TELNYX_BILLING_GROUP_ID=
```

The Telnyx API key, public webhook key, and connection ID are required. The messaging profile and billing group are optional. The three OpenAI credentials are required only for Live AI; without them, RoundHQ keeps using the working voicemail flow.

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

## One-Time OpenAI Setup

After this version is deployed, the RoundHQ platform owner must:

1. Open the OpenAI API project identified by `OPENAI_PROJECT_ID`.
2. Create a webhook for:

   ```text
   https://YOUR_PUBLIC_ROUNDHQ_DOMAIN/api/ai-receptionist/openai/webhook
   ```

3. Subscribe it to `realtime.call.incoming`.
4. Copy the webhook signing secret shown at creation time into `OPENAI_WEBHOOK_SECRET`.
5. Redeploy RoundHQ so the signing secret is active.

The webhook verifies the raw request with the OpenAI SDK before accepting a call. An incoming SIP call is rejected unless its RoundHQ call reference resolves to an enabled testing workspace.

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

Under **Status**, select the answering mode and then enable AI Receptionist. Start with a test number and place an end-to-end call before forwarding the customer's public business number.

## Webhook Flow

Telnyx sends all call events to the application's primary webhook. RoundHQ dispatches `call.initiated`, `call.speak.ended`, `call.recording.saved`, `call.recording.transcription.saved`, recording errors, and call-status events internally.

The inbound flow is:

```text
Incoming call
-> shared Telnyx Call Control webhook
-> RoundHQ resolves organisation from the called number
-> RoundHQ checks feature access, enabled state, and answering mode
```

Voicemail mode then plays the greeting, records caller audio, and creates exactly one lead when the asynchronous Telnyx transcript arrives.

Live AI mode continues as follows:

```text
RoundHQ answers and starts a dual-channel recording
-> Telnyx transfers the call to sip:PROJECT_ID@sip.api.openai.com over TLS/SRTP
-> OpenAI sends the signed realtime.call.incoming webhook
-> RoundHQ verifies the signature and the RoundHQ SIP call reference
-> RoundHQ accepts the Realtime session and triggers the opening greeting
-> OpenAI and the caller speak directly over SIP
-> Telnyx recording/transcription callbacks create exactly one RoundHQ lead
```

Audio does not pass through a permanent Vercel WebSocket. If the initial Telnyx live transfer cannot be started, RoundHQ automatically falls back to voicemail mode.

There is no fallback organisation. Unknown called numbers are rejected.

Webhook requests must include valid Telnyx signature headers:

- `telnyx-timestamp`
- `telnyx-signature-ed25519`

RoundHQ verifies them using the platform public key.

## Recording Privacy

Telnyx-created lead activity stores a recording ID, not a raw provider recording URL. Voicemail recordings use the inbound track. Live AI recordings use both tracks in dual-channel mode and include post-call transcription.

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
npm run test:ai-receptionist-realtime
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
9. Save the greeting, select **Voicemail to lead**, and enable AI Receptionist.
10. Place an inbound test call and leave a message.
11. Confirm no lead is created before the transcript arrives.
12. Confirm exactly one lead appears after transcription.
13. Complete the OpenAI project webhook setup and redeploy with `OPENAI_WEBHOOK_SECRET`.
14. Select **Live AI conversation** for the testing workspace.
15. Place a call and confirm the AI identifies itself, gives the recording notice, and asks the configured questions.
16. Confirm both sides of the call can be played back and one lead is created from the transcript.
17. Redeliver callbacks and confirm no duplicate lead is created.
18. Confirm unknown numbers and invalid or stale Telnyx/OpenAI signatures are rejected.
19. Temporarily remove one OpenAI setting in staging and confirm calls use voicemail mode.

## Pilot Safeguards

Keep customer feature access disabled except for named testing accounts. Live AI must identify itself as an AI virtual receptionist, announce recording/transcription, avoid prices and appointment promises, and direct immediate life-threatening emergencies to 999 or 112. Review recordings, transcripts, latency, costs, failure rates, and lead accuracy before wider release.