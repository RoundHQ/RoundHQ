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

## Launch Priorities

1. Rebrand the user-facing app to RoundHQ.
2. Move the private app from `/` to `/dashboard`.
3. Add the public homepage, login, signup, and pricing routes.
4. Replace the single-company Supabase schema with organisation-based tenancy.
5. Add Stripe checkout, webhook handling, and subscription-gated access.
6. Deploy through Vercel and connect `roundhq.co.uk`.
