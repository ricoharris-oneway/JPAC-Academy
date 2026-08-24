# JPAC Singing Lab Tools Ready Promotion

## Purpose

This artifact set prepares a narrowly reviewed visibility promotion for four Singing-safe Creative Studio tools. It does not create tools, change course assignments, bind tools to modules, or execute SQL during artifact review.

## Promotion set

Only these seed-owned tools move from `testing` to `ready` when the migration is deliberately applied:

- `vocal-practice-planner`
- `performance-prep-checklist`
- `assignment-practice-builder`
- `portfolio-builder-checklist`

These four tools already have course-level mappings to the existing Singing course. The Studio page returns ready tools whose course mappings match a student's active enrollment, so enrolled Singing students become eligible to see this exact set.

## Tools intentionally left in testing

The following tools remain hidden pending separate course-specific review:

- `script-scene-rehearsal-tool`
- `dance-rehearsal-tracker`
- `songwriting-idea-pad`
- `video-shot-planner`

They are not promoted or assigned to another course.

## Visibility boundary

The migration updates only `public.lab_tools.status` and `updated_at` for the four approved slugs carrying the original seed marker. It does not change RLS, authentication, enrollment, or Studio query behavior. Visibility continues to require both `status = 'ready'` and a matching active enrolled course assignment.

The tools retain built-in type, zero configured XP, and null launch URLs. Students may see their catalog cards after promotion, but the existing Studio UI will state that a ready tool has no launch URL until a separately reviewed internal tool route is implemented.

## Preflight

Run `supabase/validation/202608240002_jpac_lab_tools_ready_preflight.sql` manually in an authorized environment. The read-only report requires:

- All eight exact seed-owned tools remain in `testing`.
- The catalog contains exactly eight tools and zero ready tools.
- Exactly four mappings exist, all for Singing.
- No direct module bindings exist.
- Protected course counts, Assignment Swap, student-state, certificates, and Community Wall tables remain at their approved baselines.
- `OVERALL PASS` with zero blockers.

## Migration

After human review and a passing preflight, apply `supabase/migrations/202608240002_jpac_lab_tools_ready.sql` using the approved migration workflow. Guard clauses reject unexpected catalog, assignment, or direct-module-binding state. The update is idempotent for the exact intended ready state and touches only the four approved seed-owned rows.

## Post-validation

Run `supabase/validation/202608240002_jpac_lab_tools_ready_post_validation.sql` after application. It verifies:

- Exactly four globally ready tools, matching the approved promotion set.
- The other four exact tools remain in `testing`.
- All four ready tools are linked to Singing and no tools are linked to other courses.
- Direct module bindings remain zero.
- Protected course module counts, Assignment Swap, student-state, certificate zero, and Community Wall tables remain preserved.

## Rollback

`supabase/rollbacks/202608240002_jpac_lab_tools_ready_rollback.sql` changes only the four exact seed-owned tools from `ready` back to `testing`. It does not delete tools or mappings and does not touch courses, modules, curriculum, students, evidence, XP, progress, certificates, or Community Wall data.

## Pilot recommendation

After a passing post-validation, confirm the four catalog cards with an internal Singing test student. Keep the pilot limited to approved internal accounts. Do not promote the remaining tools until their course mappings and internal launch experiences have separate approval.
