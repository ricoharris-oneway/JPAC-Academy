begin transaction read only;

do $$
declare singing_id uuid; beginner_id uuid;
begin
  select id into singing_id from public.courses where slug='singing';
  select id into beginner_id from public.course_levels where course_id=singing_id and level_number=1;
  if singing_id is null or beginner_id is null then raise exception 'BLOCKED: canonical Singing hierarchy missing'; end if;
  if (select count(*) from public.course_modules where course_id=singing_id)<>40 then raise exception 'BLOCKED: Singing must remain 40 modules'; end if;
  if (select count(*) from public.course_modules where course_level_id=beginner_id)<>10 then raise exception 'BLOCKED: Beginner must remain 10 modules'; end if;
  if exists(select 1 from public.course_modules where course_id=singing_id and (core_xp<>625 or core_unlock_threshold<>438)) then raise exception 'BLOCKED: canonical module XP changed'; end if;
  if (select sum(core_xp) from public.course_modules where course_id=singing_id)<>25000 then raise exception 'BLOCKED: Singing Core XP changed'; end if;
  if not exists(select 1 from public.course_modules where course_level_id=beginner_id and level_module_number=2 and title='Pitch, Tone & First Performance' and status='published') then raise exception 'BLOCKED: published Module 2 pilot changed'; end if;
  if (select count(*) from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_level_id=beginner_id and l.status='draft')<28 then raise exception 'BLOCKED: staged Beginner drafts missing'; end if;
end $$;

select c.column_name,c.data_type
from information_schema.columns c
where c.table_schema='public' and c.table_name='course_modules'
  and c.column_name in('video_provider','video_title','lab_tool_id')
order by c.column_name;

select c.relname as revision_table,c.relrowsecurity as rls_enabled,
  (select count(*) from pg_policies p where p.schemaname='public' and p.tablename='curriculum_module_revisions') as policy_count
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='curriculum_module_revisions';

select p.proname,
  has_function_privilege('authenticated',p.oid,'execute') as authenticated_execute,
  has_function_privilege('anon',p.oid,'execute') as anon_execute,
  position('public.is_staff()' in pg_get_functiondef(p.oid))>0 as internal_staff_check
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in('curriculum_studio_evidence','curriculum_studio_save_module','curriculum_studio_save_lesson','curriculum_studio_reorder_lesson','curriculum_studio_save_activity')
order by p.proname;

-- Live catalog gap report. READY requires a ready tool and a nonempty launch URL;
-- name/description matches without that state are PARTIAL; otherwise FUTURE.
with proposed(module_number,lab_name,terms) as(values
  (1,'Breath Cycle Comparison',array['breath']),
  (2,'Natural Tone Comparison',array['tone','voice']),
  (3,'Pitch Match Lab',array['pitch']),
  (4,'Rhythm Match Lab',array['rhythm','timing']),
  (5,'Tone Color Lab',array['tone','resonance']),
  (6,'Lyric Clarity Lab',array['lyric','diction']),
  (7,'Dynamics Comparison Lab',array['dynamic']),
  (8,'Recording Setup Lab',array['record','microphone','audio']),
  (9,'Performance Review Lab',array['performance','video']),
  (10,'Showcase Review Lab',array['showcase','performance','video'])
), matches as(
  select p.module_number,p.lab_name,t.id,t.name,t.status,t.launch_url,
    case when t.status='ready' and nullif(t.launch_url,'') is not null then 1 else 2 end rank
  from proposed p left join public.lab_tools t on exists(select 1 from unnest(p.terms) term where lower(t.name||' '||t.description) like '%'||term||'%')
)
select module_number,lab_name,
  case when bool_or(rank=1) then 'READY' when count(id)>0 then 'PARTIAL' else 'FUTURE' end classification,
  string_agg(name,', ' order by name) matched_tools
from matches group by module_number,lab_name order by module_number;

select relname as table_name,relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and relname in('course_modules','lessons','activities','lesson_progress','submissions','xp_ledger','lab_tools')
order by relname;

rollback;
