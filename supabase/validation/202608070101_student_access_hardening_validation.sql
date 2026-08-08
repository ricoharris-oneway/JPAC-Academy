-- Build 2.1 production validation. Run after Stage 1 and again after Stage 2.
-- Result sets marked EXPECT ZERO must be empty before Stage 2 is applied.

-- Inventory every Wix status and its reviewed access decision.
select lower(trim(e.status)) as production_status,
       count(*) as entitlement_count,
       r.grants_access,
       r.reviewed_at,
       r.description
from public.wix_access_entitlements e
left join public.wix_entitlement_status_rules r
  on r.status=lower(trim(e.status))
group by lower(trim(e.status)),r.grants_access,r.reviewed_at,r.description
order by production_status;

-- EXPECT ZERO: blank, undiscovered, or unreviewed production statuses.
select e.status,count(*) as entitlement_count
from public.wix_access_entitlements e
left join public.wix_entitlement_status_rules r
  on r.status=lower(trim(e.status))
where nullif(trim(e.status),'') is null or r.status is null or r.reviewed_at is null
group by e.status order by e.status;

-- Explicit Wix-plan coverage, including expired/history rows for visibility.
select e.wix_plan_id,e.plan_name,lower(trim(e.status)) as status,
       count(*) as entitlement_count,m.course_id,c.slug,m.active
from public.wix_access_entitlements e
left join public.wix_plan_course_map m on m.wix_plan_id=e.wix_plan_id
left join public.courses c on c.id=m.course_id
group by e.wix_plan_id,e.plan_name,lower(trim(e.status)),m.course_id,c.slug,m.active
order by e.plan_name,e.wix_plan_id,status;

-- EXPECT ZERO: current access-granting rows without an active explicit mapping.
select e.id,e.profile_id,e.wix_member_id,e.wix_plan_id,e.plan_name,e.status,e.starts_at,e.ends_at
from public.wix_access_entitlements e
join public.wix_entitlement_status_rules r
  on r.status=lower(trim(e.status)) and r.grants_access
left join public.wix_plan_course_map m
  on m.wix_plan_id=e.wix_plan_id and m.active
where (e.starts_at is null or e.starts_at<=now())
  and (e.ends_at is null or e.ends_at>now())
  and (nullif(trim(e.wix_plan_id),'') is null or m.course_id is null)
order by e.profile_id,e.wix_plan_id;

-- EXPECT ZERO: broken explicit mappings.
select m.* from public.wix_plan_course_map m
left join public.courses c on c.id=m.course_id
where c.id is null;

-- Identity preservation counts. Record and compare these before/after migration.
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.wix_member_links) as wix_member_links,
  (select count(*) from public.wix_access_entitlements) as wix_entitlements;

-- Confirm RLS and installed policy definitions. Staff management policies remain
-- separate permissive policies and the progress write policies retain is_staff().
select c.relname as table_name,c.relrowsecurity as rls_enabled,p.polname,
       pg_get_expr(p.polqual,p.polrelid) as using_expression,
       pg_get_expr(p.polwithcheck,p.polrelid) as check_expression
from pg_class c
left join pg_policy p on p.polrelid=c.oid
where c.oid in (
  'public.courses'::regclass,'public.course_modules'::regclass,
  'public.lessons'::regclass,'public.lesson_progress'::regclass,
  'public.wix_plan_course_map'::regclass,
  'public.wix_entitlement_status_rules'::regclass
)
order by c.relname,p.polname;

-- EXPECT four rows after Stage 1: two functions, one trigger function, one trigger.
select 'function' as object_type,p.proname as object_name
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'jpac_student_has_course_access','jpac_my_entitled_courses',
  'jpac_register_wix_entitlement_status'
)
union all
select 'trigger',t.tgname
from pg_trigger t
where t.tgrelid='public.wix_access_entitlements'::regclass
  and t.tgname='register_wix_entitlement_status' and not t.tgisinternal;

-- Auth-context test template. Replace the UUID, run in a transaction, and roll
-- back so session settings do not leak into subsequent SQL-editor statements.
-- begin;
-- set local role authenticated;
-- select set_config('request.jwt.claim.sub','REPLACE-WITH-PROFILE-UUID',true);
-- select * from public.jpac_my_entitled_courses();
-- select c.id,c.slug,public.jpac_student_has_course_access(c.id)
-- from public.courses c order by c.slug;
-- rollback;
