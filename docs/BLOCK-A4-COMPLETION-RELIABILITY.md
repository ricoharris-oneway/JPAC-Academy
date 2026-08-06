# Block A4 — Completion Reliability

Block A4 closes the complete learning workflow by reliably returning approved JPAC assignment results to Wix.

## Added

- `integration_outbox` durable delivery queue
- duplicate-safe completion events
- exponential retry scheduling
- maximum-attempt failure state
- delivery response logging
- `/api/wix-outbox` delivery worker
- `jpac_block_a_status` operational verification view

## Required Vercel variable

Add:

`WIX_PROGRESS_WEBHOOK_URL`

Value: the Wix/Velo HTTP function or automation endpoint that accepts JPAC completion payloads and updates the applicable Wix Program participant or assignment state.

The Wix endpoint must accept the same shared secret through:

`x-jpac-wix-secret: <JPAC_WIX_SYNC_SECRET>`

## Delivery payload

```json
{
  "eventType": "jpac_assignment_approved",
  "eventId": "jpac-completion-<submission-id>",
  "memberId": "<wix-member-id>",
  "programId": "<wix-program-id>",
  "assignmentId": "<wix-assignment-id>",
  "submissionId": "<jpac-submission-id>",
  "status": "approved",
  "score": 92,
  "feedback": "Instructor feedback",
  "xpAwarded": 250,
  "approvedAt": "2026-08-06T00:00:00.000Z"
}
```

## Running the delivery worker

Send an authenticated request to:

`POST https://<jpac-domain>/api/wix-outbox`

Header:

`x-jpac-wix-secret: <JPAC_WIX_SYNC_SECRET>`

Optional body:

```json
{"limit":20}
```

The worker claims pending records, sends them to Wix, and records success or schedules an exponential retry.

## Retry behavior

Attempts are delayed approximately:

1, 2, 4, 8, 16, 32, 64, and 128 minutes.

After the configured maximum attempts, the event remains in `failed` status for administrative review. Repeated approval does not create duplicate outbound events because each completion uses a unique dedupe key based on the submission ID.

## End-to-end verification

After applying all Block A migrations, test one student through this sequence:

1. Wix member identity sync creates `wix_member_links`.
2. Wix enrollment sync creates `wix_program_enrollments`.
3. Wix assignment sync creates `wix_assignments`.
4. Student follows the Wix deep link to Practice Coach.
5. Student uploads media and creates a `wix_bridge` submission.
6. Submission appears in Teacher Studio.
7. Teacher approves it once.
8. XP, notification, timeline, passport eligibility, and certificate readiness are created.
9. One `integration_outbox` row is created.
10. `/api/wix-outbox` delivers the result to Wix.
11. The outbox row changes to `delivered`.

## Status query

Run:

```sql
select * from public.jpac_block_a_status;
```

A healthy completed test should show at least one linked member, program enrollment, assignment, bridged submission, approved submission, and successful Wix delivery, with zero failed outbound events.
