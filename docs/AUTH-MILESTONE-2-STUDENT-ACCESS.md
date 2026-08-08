# Milestone 2: Student Enrollment and Course Access

Milestone 2 reuses the Academy's existing identity, Wix access, curriculum, progress, and XP structures. Build 2.1 hardens its production rollout. It is not production-complete until the live test in `PRODUCTION_DEPLOYMENT.md` passes.

## Canonical data path

`auth.users.id → profiles.id → wix_member_links.profile_id → wix_access_entitlements.profile_id`

Wix owns purchases and plan identifiers. Supabase owns the explicit association between a Wix plan ID and an Academy course ID in `wix_plan_course_map`. Course access is resolved server-side by `jpac_student_has_course_access(course_id)`, and `jpac_my_entitled_courses()` supplies the student course list.

## Explicit Wix ID mapping

Authorization never compares or normalizes display titles. Each stable `wix_access_entitlements.wix_plan_id` must have an active row in `wix_plan_course_map` pointing to `courses.id`. The existing `wix_program_course_map` remains intact and continues to associate Wix Program IDs with Academy courses for synchronized program progress; it does not authorize a pricing-plan purchase.

## Status discovery and access

Stage 1 inventories every distinct production entitlement status in `wix_entitlement_status_rules`. Known currently supported statuses are seeded without overwriting prior decisions. A trigger automatically records every future unknown status as `grants_access=false`, so new Wix vocabulary fails closed until an administrator reviews it.

A student receives access only when the entitlement:

- belongs to `auth.uid()`;
- has a reviewed status whose rule grants access;
- has started and has not expired;
- contains a stable Wix plan ID with an active explicit course mapping; and
- maps to a published course.

Multiple valid entitlements are collapsed to one result per course. Expired entitlements remain in history but do not grant access. Staff retain access through the existing staff management policies and `is_staff()` branches.

## Progress security

The client does not provide a student ID to `jpac_my_entitled_courses()`. The function and curriculum RLS use `auth.uid()`. `lesson_progress` select remains limited to the authenticated student or staff, and student inserts/updates require both `student_id=auth.uid()` and course access. Staff insert/update permission is explicitly preserved.

## Production artifacts

- Stage 1 forward migration: `supabase/migrations/202608070101_student_access_hardening_prepare.sql`
- Stage 2 forward migration: `supabase/migrations/202608070102_student_access_hardening_enforce.sql`
- Stage 2 rollback: `supabase/rollbacks/202608070102_student_access_hardening_enforce_rollback.sql`
- Stage 1 non-destructive rollback: `supabase/rollbacks/202608070101_student_access_hardening_prepare_rollback.sql`
- Validation: `supabase/validation/202608070101_student_access_hardening_validation.sql`
- Operator runbook: `docs/PRODUCTION_DEPLOYMENT.md`
