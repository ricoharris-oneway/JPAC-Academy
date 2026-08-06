# JPAC Production Integration Layer

The integration layer is the single server-side connection point for Wix, Supabase, and future production services.

## Core files

- `api/_lib/integration.js` — shared authentication, Supabase client, validation, event logging, profile matching, and Wix delivery
- `api/wix-sync.js` — inbound Wix Members, Pricing Plans, Programs, and assignment synchronization
- `api/wix-outbox.js` — retry-safe delivery of approved JPAC submission results back to Wix
- `api/integration-health.js` — protected production health check

## Required environment variables

Required now:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JPAC_WIX_SYNC_SECRET`

Required only after the Wix receiver is created:

- `WIX_PROGRESS_WEBHOOK_URL`

Do not create `WIX_PROGRESS_WEBHOOK_URL` until the Wix/Velo HTTP function exists and its final production URL is known. Until then, approved completion events remain safely queued in Supabase.

## Health check

Request:

```bash
curl -H "x-jpac-wix-secret: YOUR_SHARED_SECRET" \
  https://YOUR_JPAC_DOMAIN/api/integration-health
```

The response reports:

- required environment configuration
- Supabase connectivity
- inbound sync errors
- outbound events waiting for delivery
- permanently failed deliveries
- whether the Wix progress-return endpoint is configured

## Data ownership

Wix remains the source of truth for:

- members
- subscriptions and Pricing Plans
- Online Programs
- lessons, quizzes, and assignments
- Wix program participation

Supabase remains the source of truth for:

- JPAC profiles and roles
- submissions and private performance media
- teacher reviews
- XP and achievements
- Creative Passport evidence
- certificate readiness
- notifications
- integration logs and retry queues

## Production flow

1. Wix sends identity, access, program, or assignment changes to `/api/wix-sync`.
2. The integration layer authenticates the request and logs an idempotent event.
3. JPAC stores only the application data needed to complete the learning workflow.
4. A student submits media through Practice Coach.
5. Teacher Studio approves or requests revision.
6. Approval automation updates XP, Passport, readiness, and notifications.
7. The completion event enters the integration outbox.
8. `/api/wix-outbox` returns the result to Wix when `WIX_PROGRESS_WEBHOOK_URL` is configured.

## Security rules

- Never expose the Supabase service-role key in `VITE_` variables.
- Wix calls must include `x-jpac-wix-secret`.
- Health and outbox endpoints use the same protected shared secret.
- Performance media remains in the private `performance-submissions` bucket.
- Duplicate Wix events and repeated teacher approvals must not duplicate records or XP.
