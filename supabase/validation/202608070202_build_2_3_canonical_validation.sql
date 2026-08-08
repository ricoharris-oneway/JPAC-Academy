-- EXPECT lab_tool_id and no tool_id.
select column_name,data_type,is_nullable
from information_schema.columns
where table_schema='public' and table_name='lab_tool_courses'
order by ordinal_position;

-- EXPECT ZERO: Wix Programs referenced by approved submissions without an
-- explicit program-to-course mapping.
select distinct a.wix_program_id
from public.submissions s
join public.wix_assignments a on a.id=s.wix_assignment_id
left join public.wix_program_course_map m on m.wix_program_id=a.wix_program_id
where s.status='approved' and m.wix_program_id is null;

-- Record both legacy/canonical counts before and after; this migration deletes
-- no rows and stops only future duplicate XP writes.
select
  (select count(*) from public.xp_ledger) canonical_xp_rows,
  (select count(*) from public.student_xp_ledger) retained_legacy_xp_rows,
  (select count(*) from public.badges) canonical_badges,
  (select count(*) from public.student_badges) canonical_badge_awards,
  (select count(*) from public.achievement_definitions) retained_legacy_achievement_definitions,
  (select count(*) from public.student_achievements) retained_legacy_achievement_awards,
  (select count(*) from public.notifications) retained_legacy_notifications,
  (select count(*) from public.student_notifications) canonical_notifications,
  (select count(*) from public.portfolio_projects) canonical_portfolio_projects,
  (select count(*) from public.media_assets) canonical_media_assets;

-- EXPECT false for normalized-title inference in the installed definition.
select pg_get_functiondef('public.jpac_refresh_student_learning_state(uuid)'::regprocedure)
       ~* 'lower\s*\(\s*trim\s*\(.*wix_program_title' as contains_title_mapping;

-- EXPECT no authenticated execution.
select not has_function_privilege(
  'authenticated','public.jpac_refresh_student_learning_state(uuid)','EXECUTE'
) as clients_cannot_rebuild_official_progress;
