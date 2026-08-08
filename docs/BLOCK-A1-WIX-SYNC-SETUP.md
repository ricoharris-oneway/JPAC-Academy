# Block A1 — Wix Identity and Enrollment Sync

This completion block connects Wix Members, Pricing Plans orders, and Online Programs participants to existing JPAC Academy profiles.

## 1. Apply the Supabase migration

Run:

`supabase/migrations/202608060001_block_a1_wix_identity_sync.sql`

The migration creates:

- `wix_member_links`
- `wix_access_entitlements`
- `wix_program_enrollments`
- `integration_events`
- `jpac_has_active_wix_access(profile_id)`

## 2. Add Vercel environment variables

Add these Production, Preview, and Development variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JPAC_WIX_SYNC_SECRET`
- `ACADEMY_SITE_URL` (the canonical production HTTPS Academy origin)

Use a long random value for `JPAC_WIX_SYNC_SECRET`. Do not expose the service-role key in frontend variables.

## 3. Wix request destination

Send server-side POST requests from Wix/Velo or a configured Wix automation to:

`https://<your-jpac-domain>/api/wix-sync`

Required header:

`x-jpac-wix-secret: <JPAC_WIX_SYNC_SECRET>`

## 4. Canonical payload

```json
{
  "eventId": "wix-event-or-record-id",
  "eventType": "pricing_plan_order_updated",
  "member": {
    "id": "wix-member-id",
    "email": "student@example.com",
    "displayName": "Student Name"
  },
  "order": {
    "id": "wix-order-id",
    "planId": "wix-plan-id",
    "planName": "JPAC Academy Membership",
    "status": "active",
    "startsAt": "2026-08-06T00:00:00.000Z",
    "endsAt": null
  },
  "programEnrollment": {
    "participantId": "wix-participant-id",
    "programId": "wix-program-id",
    "programTitle": "Piano Level 1",
    "status": "active",
    "progress": 0,
    "joinedAt": "2026-08-06T00:00:00.000Z",
    "completedAt": null
  }
}
```

`order` and `programEnrollment` are optional individually. The member identity and event metadata are required.

## 5. Duplicate prevention

- Events are idempotent by `provider + external_event_id`.
- Wix members are unique by Wix member ID and linked one-to-one with a JPAC profile.
- Pricing access is unique by Wix order ID.
- Program participation is unique by JPAC profile and Wix program ID.

Repeated delivery of the same event does not create duplicate XP, users, access records, or enrollments.

## 6. Profile matching and activation rule

A Wix member is matched to an existing JPAC `profiles` record by email. If no profile exists, the endpoint creates an invited Supabase user, the existing auth trigger creates its student profile, and the invitation returns through the production Academy auth callback so the purchaser can set a password. Existing profile IDs, roles, links, and access records are preserved.

## 7. Operational verification

After sending a test event, confirm:

1. `integration_events.processing_status = processed`
2. One row exists in `wix_member_links`
3. The order appears in `wix_access_entitlements`
4. The program appears in `wix_program_enrollments`
5. `select public.jpac_has_active_wix_access('<profile-id>');` returns `true` for an active plan

## 8. Failure handling

Failed events remain in `integration_events` with:

- original payload
- error message
- processing status
- timestamps
- retry count field for the later retry worker

Block A2 will use these linked identities and enrollments to bridge Wix assignments to JPAC submissions automatically.
