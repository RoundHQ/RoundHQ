# Voicemail-to-lead Telnyx setup

RoundHQ uses Telnyx for a conventional voicemail-to-lead flow. Live AI calling and
OpenAI Realtime are retired: the settings normaliser forces voicemail mode and the
legacy Realtime endpoints return `410 Gone`.

## Required server configuration

Set these server-only variables for Production and Preview:

- `AI_RECEPTIONIST_PUBLIC_BASE_URL=https://YOUR-ROUNDHQ-DOMAIN`
- `AI_RECEPTIONIST_TELNYX_API_KEY`
- `AI_RECEPTIONIST_TELNYX_PUBLIC_KEY`
- `AI_RECEPTIONIST_TELNYX_CONNECTION_ID`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not expose these values in browser code or screenshots. OpenAI credentials are
not required for voicemail-to-lead.

## Telnyx configuration

1. Create a Telnyx Voice API application using webhook API v2.
2. Set its primary webhook URL to
   `https://YOUR-ROUNDHQ-DOMAIN/api/ai-receptionist/telnyx/webhook`.
3. Copy its Application/Connection ID into
   `AI_RECEPTIONIST_TELNYX_CONNECTION_ID`.
4. Assign the approved inbound number to that application.
5. Keep inbound calling and call recording enabled. Outbound calling is not needed.
6. Confirm the Telnyx webhook signing public key matches
   `AI_RECEPTIONIST_TELNYX_PUBLIC_KEY`.

The RoundHQ platform owner must enable the voicemail feature for the testing
organisation. A workspace administrator can then allocate or connect a number and
enable voicemail in Settings. Customer API keys are never requested.

## Expected call flow

An inbound call is answered with the configured voicemail greeting, recorded, and
ended after the caller finishes. Verified Telnyx recording/transcription events
create or update one tenant-scoped Lead. The lead contains the caller number, call
and provider references, timestamp, recording reference, and transcript when one is
available. It does not create a customer, job, quote, or invoice.

Provider retries are deduplicated. Recordings are stored by reference and streamed
through the authenticated, tenant-scoped RoundHQ recording endpoint; raw Telnyx
recording URLs are not exposed to customers.

## Safe verification

Run the local mocked suites:

```powershell
npm.cmd run test:ai-receptionist
npm.cmd run test:ai-receptionist-settings
npm.cmd run test:ai-receptionist-telnyx
npm.cmd run test:ai-receptionist-number-provisioning
npm.cmd run test:ai-receptionist-realtime
```

For a later staging verification, use a named test organisation and test number.
Confirm one missed call produces one lead, a repeated webhook does not duplicate it,
the recording is available only to the correct tenant, and disabling feature access
removes every voicemail trace from that customer's dashboard.

Do not configure an OpenAI SIP webhook or select a live conversation mode. The
legacy columns remain only for migration compatibility and historical data.