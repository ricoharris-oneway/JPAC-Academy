-- Build 2.1 / Stage 1 non-destructive rollback.
-- Run only after the Stage 2 rollback. Configuration tables are intentionally
-- retained so plan mappings and status-review history are not destroyed.

drop trigger if exists register_wix_entitlement_status on public.wix_access_entitlements;
drop function if exists public.jpac_register_wix_entitlement_status();
drop function if exists public.jpac_my_entitled_courses();
drop function if exists public.jpac_student_has_course_access(uuid);

comment on table public.wix_plan_course_map is
  'Build 2.1 configuration retained after non-destructive rollback.';
comment on table public.wix_entitlement_status_rules is
  'Build 2.1 status inventory retained after non-destructive rollback.';
