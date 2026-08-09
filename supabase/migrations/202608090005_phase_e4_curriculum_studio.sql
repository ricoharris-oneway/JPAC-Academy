begin;

alter table public.course_modules
  add column if not exists video_provider text,
  add column if not exists video_title text,
  add column if not exists lab_tool_id uuid references public.lab_tools(id) on delete set null;

create table if not exists public.curriculum_module_revisions(
  module_id uuid primary key references public.course_modules(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check(status in('draft','review','approved')),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.curriculum_module_revisions enable row level security;
drop policy if exists curriculum_module_revisions_staff_select on public.curriculum_module_revisions;
create policy curriculum_module_revisions_staff_select on public.curriculum_module_revisions for select to authenticated using(public.is_staff());
drop policy if exists curriculum_module_revisions_staff_write on public.curriculum_module_revisions;
create policy curriculum_module_revisions_staff_write on public.curriculum_module_revisions for all to authenticated using(public.is_staff()) with check(public.is_staff());
revoke all on public.curriculum_module_revisions from anon;
grant select,insert,update on public.curriculum_module_revisions to authenticated;

comment on column public.course_modules.lab_tool_id is 'Optional approved JPAC LAB catalog association. Null means no working student tool is configured.';

create or replace function public.curriculum_studio_evidence(target_course uuid)
returns table(object_type text,object_id uuid,progress_count bigint,submission_count bigint,xp_count bigint)
language sql stable security definer set search_path=public as $$
  select 'module',m.id,
    (select count(*) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where l.module_id=m.id),
    (select count(*) from public.submissions s join public.activities a on a.id=s.activity_id where a.module_id=m.id),
    (select count(*) from public.xp_ledger x where x.module_id=m.id)
  from public.course_modules m where m.course_id=target_course and public.is_staff()
  union all
  select 'lesson',l.id,(select count(*) from public.lesson_progress p where p.lesson_id=l.id),
    (select count(*) from public.submissions s join public.activities a on a.id=s.activity_id where a.lesson_id=l.id),
    (select count(*) from public.xp_ledger x where x.source_id=l.id)
  from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_id=target_course and public.is_staff()
  union all
  select 'activity',a.id,0,(select count(*) from public.submissions s where s.activity_id=a.id),
    (select count(*) from public.xp_ledger x where x.source_id=a.id)
  from public.activities a where a.course_id=target_course and public.is_staff();
$$;

create or replace function public.curriculum_studio_save_module(target_module uuid,payload jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare m public.course_modules%rowtype; desired_status text; tool uuid;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into m from public.course_modules where id=target_module for update;
  if m.id is null then raise exception 'Module not found'; end if;
  if m.status='published' and m.level_module_number=2 and m.title='Pitch, Tone & First Performance' then
    if coalesce(payload->>'title','')<>'Find Your Natural Voice' then raise exception 'The controlled Module 2 replacement title is fixed'; end if;
    desired_status:=coalesce(payload->>'revision_status','draft');
    if desired_status not in('draft','review','approved') then raise exception 'Unsupported replacement review status'; end if;
    if desired_status='approved' and not public.is_admin() then raise exception 'Administrator approval required'; end if;
    tool:=nullif(payload->>'lab_tool_id','')::uuid;
    if tool is not null and not exists(select 1 from public.lab_tools where id=tool and status='ready' and nullif(launch_url,'') is not null) then raise exception 'Only a ready tool with a working launch URL may be associated'; end if;
    if desired_status='approved' and (
      nullif(trim(payload->>'short_intro'),'') is null or nullif(trim(payload->>'primary_video_url'),'') is null or tool is null
      or nullif(trim(payload->>'career_connection'),'') is null or jsonb_typeof(payload->'aria_coaching_targets'->'evidence_targets')<>'array'
      or (select count(*) from public.lessons where module_id=m.id and status in('review','approved') and sort_order between 101 and 103)<3
      or (select count(*) from public.activities where module_id=m.id and status in('review','approved') and required and xp_type='core' and xp_reward=350 and passing_score between 0 and 100 and coalesce((select sum((r->>'weight')::numeric) from jsonb_array_elements(rubric->'criteria') r),0)=100)<>1
    ) then raise exception 'Replacement is not complete enough for approval'; end if;
    insert into public.curriculum_module_revisions(module_id,payload,status,updated_by,updated_at)
    values(m.id,payload-'status'-'revision_status'-'core_xp'-'core_unlock_threshold'-'level_module_number',desired_status,auth.uid(),now())
    on conflict(module_id) do update set payload=excluded.payload,status=excluded.status,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
    return;
  end if;
  if m.status='published' then raise exception 'Published modules require a controlled transition; normal Save cannot change student-facing curriculum'; end if;
  desired_status:=coalesce(payload->>'status',m.status);
  if desired_status not in('draft','review','approved') then raise exception 'Studio Save cannot publish or archive a module'; end if;
  if desired_status='approved' and not public.is_admin() then raise exception 'Administrator approval required'; end if;
  tool:=m.lab_tool_id;
  if payload ? 'lab_tool_id' then
    tool:=nullif(payload->>'lab_tool_id','')::uuid;
  end if;
  if tool is not null then
    if not exists(select 1 from public.lab_tools where id=tool and status='ready' and nullif(launch_url,'') is not null) then raise exception 'Only a ready tool with a working launch URL may be associated'; end if;
  end if;
  if desired_status='approved' and (
    nullif(trim(payload->>'short_intro'),'') is null or nullif(trim(payload->>'primary_video_url'),'') is null
    or tool is null or nullif(trim(payload->>'career_connection'),'') is null or jsonb_typeof(payload->'aria_coaching_targets'->'evidence_targets')<>'array'
    or (select count(*) from public.lessons where module_id=m.id and status in('review','approved'))<1
    or (select count(*) from public.activities where module_id=m.id and not required and xp_type='bonus' and activity_type='practice' and status in('review','approved'))<2
    or (select count(*) from public.activities where module_id=m.id and required and xp_type='core' and xp_reward=350 and passing_score between 0 and 100 and coalesce((select sum((r->>'weight')::numeric) from jsonb_array_elements(rubric->'criteria') r),0)=100)<1
  ) then raise exception 'Module is not complete enough for approval'; end if;
  update public.course_modules set
    title=coalesce(nullif(trim(payload->>'title'),''),title),description=coalesce(payload->>'description',description),
    short_intro=coalesce(payload->>'short_intro',short_intro),career_connection=coalesce(payload->>'career_connection',career_connection),
    primary_video_url=nullif(payload->>'primary_video_url',''),video_provider=nullif(payload->>'video_provider',''),
    video_title=nullif(payload->>'video_title',''),video_brief=coalesce(payload->>'video_brief',video_brief),
    jpac_tool_activity=coalesce(payload->'jpac_tool_activity',jpac_tool_activity),real_world_activity=coalesce(payload->'real_world_activity',real_world_activity),
    aria_coaching_targets=coalesce(payload->'aria_coaching_targets',aria_coaching_targets),career_mission_ideas=coalesce(payload->'career_mission_ideas',career_mission_ideas),
    portfolio_moment=coalesce((payload->>'portfolio_moment')::boolean,portfolio_moment),portfolio_ready_threshold=case when payload ? 'portfolio_ready_threshold' then nullif(payload->>'portfolio_ready_threshold','')::numeric else portfolio_ready_threshold end,
    lab_tool_id=tool,status=desired_status,review_notes=coalesce(payload->>'review_notes',review_notes),
    approved_by=case when desired_status='approved' then auth.uid() else approved_by end,approved_at=case when desired_status='approved' then now() else approved_at end,updated_at=now()
  where id=m.id;
end $$;

create or replace function public.curriculum_studio_save_lesson(target_lesson uuid,payload jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare l public.lessons%rowtype; desired_status text;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into l from public.lessons where id=target_lesson for update;
  if l.id is null then raise exception 'Lesson not found'; end if;
  if l.status='published' then raise exception 'Published lessons cannot be edited through normal Studio Save'; end if;
  desired_status:=coalesce(payload->>'status',l.status);
  if desired_status not in('draft','review','approved','archived') then raise exception 'Unsupported lesson status'; end if;
  if desired_status='approved' and not public.is_admin() then raise exception 'Administrator approval required'; end if;
  if jsonb_typeof(coalesce(payload->'content_blocks','[]'::jsonb))<>'array' then raise exception 'Content blocks must be an array'; end if;
  update public.lessons set title=coalesce(nullif(trim(payload->>'title'),''),title),description=coalesce(payload->>'description',description),
    short_summary=coalesce(payload->>'short_summary',short_summary),duration_minutes=coalesce((payload->>'duration_minutes')::integer,duration_minutes),
    learning_objective=coalesce(payload->>'learning_objective',learning_objective),content_blocks=coalesce(payload->'content_blocks',content_blocks),
    technique_cues=case when payload ? 'technique_cues' then array(select jsonb_array_elements_text(payload->'technique_cues')) else technique_cues end,
    common_mistakes=case when payload ? 'common_mistakes' then array(select jsonb_array_elements_text(payload->'common_mistakes')) else common_mistakes end,
    self_check=coalesce(payload->>'self_check',self_check),wix_lesson_url=nullif(payload->>'wix_lesson_url',''),
    status=desired_status,updated_at=now() where id=l.id;
end $$;

create or replace function public.curriculum_studio_reorder_lesson(target_lesson uuid,direction text)
returns void language plpgsql security definer set search_path=public as $$
declare current_lesson public.lessons%rowtype; neighbor public.lessons%rowtype;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if direction not in('up','down') then raise exception 'Direction must be up or down'; end if;
  select * into current_lesson from public.lessons where id=target_lesson for update;
  if current_lesson.id is null then raise exception 'Lesson not found'; end if;
  if current_lesson.status='published' then raise exception 'Published lesson order requires a controlled transition'; end if;
  if direction='up' then
    select * into neighbor from public.lessons where module_id=current_lesson.module_id and sort_order<current_lesson.sort_order order by sort_order desc limit 1 for update;
  else
    select * into neighbor from public.lessons where module_id=current_lesson.module_id and sort_order>current_lesson.sort_order order by sort_order limit 1 for update;
  end if;
  if neighbor.id is null or neighbor.status='published' then raise exception 'Cannot reorder across a published lesson boundary'; end if;
  update public.lessons set sort_order=-2147483648 where id=current_lesson.id;
  update public.lessons set sort_order=current_lesson.sort_order where id=neighbor.id;
  update public.lessons set sort_order=neighbor.sort_order,updated_at=now() where id=current_lesson.id;
end $$;

create or replace function public.curriculum_studio_save_activity(target_activity uuid,payload jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare a public.activities%rowtype; desired_status text; proposed_rubric jsonb; rubric_total numeric;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into a from public.activities where id=target_activity for update;
  if a.id is null then raise exception 'Activity not found'; end if;
  if a.status='published' then raise exception 'Published activities cannot be edited through normal Studio Save'; end if;
  desired_status:=coalesce(payload->>'status',a.status); proposed_rubric:=coalesce(payload->'rubric',a.rubric);
  if desired_status not in('draft','review','approved','archived') then raise exception 'Unsupported activity status'; end if;
  if desired_status='approved' and not public.is_admin() then raise exception 'Administrator approval required'; end if;
  if a.required and a.xp_type='core' then
    if jsonb_typeof(proposed_rubric->'criteria')<>'array' then raise exception 'Creative Challenge rubric criteria are required'; end if;
    select coalesce(sum((r->>'weight')::numeric),0) into rubric_total from jsonb_array_elements(proposed_rubric->'criteria') r;
    if desired_status in('review','approved') and rubric_total<>100 then raise exception 'Rubric weights must total exactly 100'; end if;
  end if;
  update public.activities set title=coalesce(nullif(trim(payload->>'title'),''),title),description=coalesce(payload->>'description',description),
    instructions=coalesce(payload->>'instructions',instructions),submission_type=coalesce(payload->>'submission_type',submission_type),
    passing_score=coalesce((payload->>'passing_score')::numeric,passing_score),allows_resubmission=coalesce((payload->>'allows_resubmission')::boolean,allows_resubmission),
    portfolio_candidate=coalesce((payload->>'portfolio_candidate')::boolean,portfolio_candidate),rubric=proposed_rubric,status=desired_status,updated_at=now()
  where id=a.id;
end $$;

revoke all on function public.curriculum_studio_evidence(uuid) from public,anon;
revoke all on function public.curriculum_studio_save_module(uuid,jsonb) from public,anon;
revoke all on function public.curriculum_studio_save_lesson(uuid,jsonb) from public,anon;
revoke all on function public.curriculum_studio_reorder_lesson(uuid,text) from public,anon;
revoke all on function public.curriculum_studio_save_activity(uuid,jsonb) from public,anon;
grant execute on function public.curriculum_studio_evidence(uuid) to authenticated;
grant execute on function public.curriculum_studio_save_module(uuid,jsonb) to authenticated;
grant execute on function public.curriculum_studio_save_lesson(uuid,jsonb) to authenticated;
grant execute on function public.curriculum_studio_reorder_lesson(uuid,text) to authenticated;
grant execute on function public.curriculum_studio_save_activity(uuid,jsonb) to authenticated;

commit;
