# Block A5 — Automatic Progress and XP Engine

Block A5 completes automatic learning-state updates after a teacher approves a Wix-linked submission.

## Trigger

The existing Teacher Studio approval action calls the A3 review function. A3 writes one `approval_completed` automation event. Block A5 listens to that existing event and recalculates the student's program state.

## Automatic updates

- Counts active Wix assignments in the program
- Counts the student's uniquely approved assignments
- Calculates program completion percentage
- Calculates average approved score
- Identifies the next unapproved Wix assignment
- Updates `wix_program_enrollments`
- Updates the existing `enrollments` record when the Wix Program is mapped to a JPAC course
- Records the XP award in `student_xp_ledger` without duplicating XP
- Updates `student_learning_state` for dashboards, ARIA, certificate checks, and reporting
- Queues a retry-safe Wix program-progress event through the A4 outbox

## Program-to-course mapping

`wix_program_course_map` links a Wix Program ID to the existing JPAC `courses` record used by the current dashboard.

The engine automatically creates this mapping only when the Wix Program title exactly matches a JPAC course title, ignoring capitalization and surrounding spaces. Admin and Developer accounts can set or correct mappings explicitly.

## Assignment ordering

The Wix sync payload may include any of these assignment-order properties:

- `sequenceNumber`
- `order`
- `position`
- `index`

The first unapproved active assignment in that order becomes the student's next step.

## ARIA signals

The engine records one functional signal without changing the ARIA interface:

- `begin_program`
- `continue_learning`
- `teacher_support_recommended`
- `completion_near`
- `program_complete`

## Installation order

Apply the Block A migrations in filename order, ending with:

- `202608060007_block_a5_progress_xp_engine.sql`
- `202608060008_block_a5_progress_payload_guard.sql`

## Verification

After approving a Wix-linked submission, verify:

1. `student_learning_state` contains the program state.
2. `wix_program_enrollments.progress` reflects approved assignments.
3. `student_xp_ledger` contains one submission ledger entry.
4. `integration_outbox` contains one `program_progress` event.
5. Re-approving the same submission does not create duplicate XP or duplicate outbox events.
6. `select * from public.jpac_a5_status;` reports the updated state.
