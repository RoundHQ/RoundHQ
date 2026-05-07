# RoundHQ

RoundHQ is the public SaaS version of the Cleancut jobs and route management app.

This repo starts from the existing private app, but should use separate production services:

- New Supabase project with multi-tenant row-level security
- New Vercel project connected to `roundhq.co.uk`
- New Stripe product and monthly subscription
- New production environment variables based on `.env.example`

## Local Setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the new RoundHQ service credentials.

## Supabase Setup

For the public RoundHQ project, run only the fresh tenant-safe schema:

```text
supabase/roundhq_tenant_schema.sql
```

Apply it from the Supabase SQL editor after configuring Auth URL settings. Make sure no partial text is selected before pressing Run, otherwise Supabase may execute only part of a function definition. The legacy SQL files in `supabase/` are kept as references from the private Cleancut app and should not be applied to the public SaaS database.

## Stripe Setup

Create a Stripe product with a monthly recurring price, then add the price ID and secret keys to `.env.local`:

```text
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

Webhook endpoint:

```text
https://roundhq.co.uk/api/stripe/webhook
```

Send subscription events plus `checkout.session.completed` so RoundHQ can keep each workspace's subscription status in sync.

## Launch Priorities

1. Rebrand the user-facing app to RoundHQ.
2. Move the private app from `/` to `/dashboard`.
3. Add the public homepage, login, signup, and pricing routes.
4. Apply the organisation-based Supabase schema and row-level security.
5. Add Stripe checkout, webhook handling, and subscription-gated access.
6. Deploy through Vercel and connect `roundhq.co.uk`.
