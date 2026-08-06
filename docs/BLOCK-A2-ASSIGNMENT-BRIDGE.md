# Block A2 — Wix Assignment Bridge

This completion block synchronizes Wix assignment metadata into JPAC Academy and links student performance submissions to the existing Teacher Studio review workflow.

## 1. Apply the migration

Run:

`supabase/migrations/202608060002_block_a2_assignment_bridge.sql`

The migration adds:

- `wix_assignments`
- Wix assignment references on `submissions`
- media metadata fields on `submissions`
- `jpac_create_wix_submission(...)`
- duplicate protection for external submission IDs

## 2. Sync an assignment from Wix

POST to:

`https://<your-jpac-domain>/api/wix-sync`

Header:

`x-jpac-wix-secret: <JPAC_WIX_SYNC_SECRET>`

Example payload:

```json
{
  "eventId": "assignment-piano-lesson-4-v1",
  "eventType": "assignment_published",
  "member": {
    "id": "wix-member-id",
    "email": "student@example.com",
    "displayName": "Student Name"
  },
  "assignment": {
    "id": "wix-assignment-id",
    "programId": "wix-program-id",
    "stepId": "wix-step-id",
    "title": "Piano Performance 4",
    "description": "Perform the assigned selection using both hands.",
    "dueAt": "2026-09-01T23:59:00.000Z",
    "submissionType": "performance",
    "status": "active"
  }
}
```

## 3. Deep link format

Add a Wix assignment button that opens:

`https://<your-jpac-domain>/practice-coach?assignment=<wix-assignment-id>&program=<wix-program-id>`

The next A2 connection step uses these parameters to preload the existing Practice Coach and create the submission record without requiring the student to choose the assignment again.

## 4. Teacher Studio

Synced submissions remain in the existing `submissions` table, so the current Teacher Studio queue and `teacher_review_submission` workflow remain the review interface. No duplicate teacher page is introduced.

## 5. Verification

After applying the migration and sending the sample event, confirm:

1. A row exists in `wix_assignments`.
2. The integration event is marked `processed`.
3. Sending the same event again returns `duplicate: true`.
4. The assignment deep link contains the exact Wix assignment ID.

## 6. Remaining A2 connection

The next focused update will bind the deep-link parameters to Practice Coach submission creation and storage upload, then verify that the resulting submission appears in Teacher Studio.
