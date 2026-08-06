# Block A7 — End-to-End Completion Validation

Block A7 closes the enrollment-to-certificate workflow. It does not add or redesign student features.

## Protected readiness endpoint

Send a GET request to:

`https://<jpac-domain>/api/block-a-readiness`

Use either header:

- `x-jpac-wix-secret: <JPAC_WIX_SYNC_SECRET>`
- `Authorization: Bearer <JPAC_WIX_SYNC_SECRET>`

The endpoint reports whether each Block A database capability is installed and includes unresolved inbound or outbound integration counts.

## Required result before live testing

The readiness response should show:

- `status: ready_for_end_to_end_test`
- `missingChecks: 0`
- all checks with `status: ready`

Record counts may be zero before the first real Wix test. A zero count does not mean installation failed.

## End-to-end acceptance test

1. Create or use a JPAC student profile with the same email as a Wix member.
2. Send a Wix member, pricing-plan, and program-enrollment event to `/api/wix-sync`.
3. Synchronize one Wix performance assignment with its program ID and sequence number.
4. Open the assignment deep link while signed in as the matching student.
5. Upload audio or video and submit it.
6. Confirm the submission appears in Teacher Studio.
7. Approve it with a score and feedback.
8. Confirm XP is awarded once.
9. Confirm learning progress and the next assignment update.
10. Repeat until the program reaches 100% completion.
11. Confirm one certificate is issued, appears in Creative Passport, and verifies publicly.
12. Confirm notification queue records use current Notification Routing settings.
13. Confirm Wix return events are either delivered or safely waiting in the outbox.

## Pass criteria

Block A passes when:

- no duplicate profiles, XP entries, submissions, or certificates are created;
- revision requests do not award XP or advance completion;
- teacher approval updates all downstream records;
- certificate verification returns only an active issued credential;
- failed external delivery remains retryable instead of being lost;
- notification recipients can be changed in Admin without a deployment.

## Database query

Admin and Developer users may also run:

`select public.jpac_validate_block_a();`

or inspect:

`select * from public.jpac_block_a_readiness order by check_key;`
