# JPAC Singing Pilot Enrollment Manager v1

## Launch decision

The first enrollment launch is Singing-only because Singing is the only proposed launch course with reviewed, published learning content in production. Bronze, Silver, Gold, and multi-course enrollment remain deferred until additional courses are published and reviewed.

Wix remains the marketing, checkout, payment, scholarship-sign-up, and confirmation front door. JPAC Academy remains the source of truth for authentication, roles, canonical Singing access, learning, tracking, submissions, teacher review, Aria guidance, and portfolio.

No Wix API, webhook, payment automation, or Wix Courses dependency is introduced by this build.

## Staff workflow

1. Verify the Wix Starter Pass payment/sign-up or an authorized scholarship outside JPAC.
2. Confirm the learner has created or signed into JPAC Academy using the learner email.
3. Open `/staff/singing-pilot-enrollment` as teacher, admin, or developer.
4. Enter the learner email. Optionally enter student name, guardian email, and a short operational note.
5. Check **I have verified Wix payment/sign-up**.
6. Confirm the preview says **This will grant Singing Pilot access only**.
7. Approve access.
8. Copy the invitation/login instructions and send them through the staff’s approved communication channel.

Students cannot see the navigation item and the route redirects non-staff users. The RPC independently verifies the authenticated caller’s staff role.

## Narrow RPC

`public.jpac_singing_pilot_enroll_existing_student(text,text,text,text,boolean,text)`:

- requires an authenticated teacher, admin, or developer through `public.is_staff()`;
- requires the payment/scholarship verification flag;
- normalizes and validates learner email;
- finds exactly one existing JPAC student profile;
- returns `student_missing` without creating an Auth user or profile;
- returns `student_role_blocked` for a non-student profile;
- resolves only the published course with canonical slug `singing` and requires at least one published module;
- creates a new active Level 1 Singing enrollment or activates the existing relationship;
- returns `already_enrolled` without writing when valid active access already exists;
- relies on the unique `(student_id, course_id)` constraint for concurrency-safe duplicate prevention;
- explicitly revokes execution from `PUBLIC`, `anon`, and `service_role`, then grants only `authenticated`;
- has a fixed `search_path`.

## What the RPC does not do

It does not create Auth users or profiles. It does not enroll Acting, Dance, Video Production, or any other course. It does not create or update XP, lesson progress, mastery, certificates, submissions, reviews, teacher assignments, timelines, Aria/intelligence records, or curriculum publication status.

For an existing inactive Singing enrollment, only access fields are reactivated: status, start/end dates, enrollment source, operational notes, and `updated_at`. Existing progress and `xp_earned` values are preserved.

## Missing student handling

When no existing student profile matches the normalized email, the UI shows:

> Student must create/sign into the JPAC app with this email before access can be granted.

Staff should send the login/sign-up URL and retry approval after the student completes account creation. Staff must not create or share a temporary password.

## Duplicate prevention

The RPC first locks an existing student/Singing enrollment. A new insert uses `ON CONFLICT (student_id, course_id) DO NOTHING`, then re-reads the relationship under lock if another request won the race. Valid active access returns `already_enrolled`; no duplicate enrollment, progress reset, or XP reset occurs.

## Invitation copy

> Welcome to JPAC Academy. Use the same email submitted during enrollment to sign in at [JPAC app login link]. Aria will guide you through your first steps, and your Singing course access will appear in My Academy.

Copying this text does not send email or call an external service.

## Failure points avoided

- no automatic trust in a Wix payment claim;
- no unsafe Auth-user creation from the browser or database function;
- no payer/guardian email substituted silently for the learner email;
- no title-based or multi-course enrollment;
- no enrollment when Singing is unpublished or has no published module;
- no duplicate student/course relationship;
- no use of the broader legacy Enrollment Manager RPC and its intelligence/timeline side effects;
- no public or anonymous execution;
- no payment data stored; staff notes explicitly warn against card details.

## Validation and rollout

The migration is intentionally not applied by this PR. Before deployment:

1. Run `supabase/validation/202608310001_singing_pilot_enrollment_preflight.sql` and capture protected counts/hash.
2. Apply `supabase/migrations/202608310001_singing_pilot_enrollment.sql` only after approval.
3. Run `supabase/validation/202608310001_singing_pilot_enrollment_post_validation.sql` before any deliberate enrollment test.
4. With separate approval, test one existing student. Only the enrollment count may increase, by exactly one when no Singing relationship existed.
5. Re-run post-validation and confirm XP, lesson progress, submissions, certificates, and curriculum status are unchanged.
6. Use `supabase/rollbacks/202608310001_singing_pilot_enrollment_rollback.sql` only if rollback is approved. Rolling back removes the RPC, not enrollments already deliberately approved.

Live enrollment validation is intentionally deferred to the first controlled enrollment of a real pilot student after production course content is ready. Do not create a fake test student for validation.

## Future Bronze/Silver/Gold path

Do not extend this RPC with package branching. After at least three launch courses have reviewed published content, define stable package IDs and explicit course mappings, add a pending intake/approval model, and build a separate reviewed multi-course approval workflow. Keep canonical Academy enrollments as the final access authority.
