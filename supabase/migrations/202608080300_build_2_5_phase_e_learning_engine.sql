begin;

-- Phase E extends the existing Academy-native curriculum and learning records.
alter table public.courses add column if not exists core_xp_total integer not null default 25000 check(core_xp_total=25000);
alter table public.course_levels add column if not exists core_xp_target integer not null default 6250 check(core_xp_target>=0);
alter table public.course_levels add column if not exists review_notes text not null default '';
alter table public.course_levels drop constraint if exists course_levels_status_check;
alter table public.course_levels add constraint course_levels_status_check check(status in('draft','review','approved','published','archived'));

alter table public.course_modules
  add column if not exists level_module_number integer,
  add column if not exists short_intro text not null default '',
  add column if not exists primary_video_url text,
  add column if not exists video_duration_seconds integer check(video_duration_seconds is null or video_duration_seconds>0),
  add column if not exists core_xp integer not null default 625 check(core_xp>=0),
  add column if not exists intro_core_xp integer not null default 50 check(intro_core_xp=50),
  add column if not exists video_core_xp integer not null default 100 check(video_core_xp=100),
  add column if not exists assignment_core_xp integer not null default 350 check(assignment_core_xp=350),
  add column if not exists mastery_core_xp integer not null default 125 check(mastery_core_xp=125),
  add column if not exists core_unlock_threshold integer not null default 438 check(core_unlock_threshold=438),
  add column if not exists jpac_tool_bonus_xp integer not null default 50 check(jpac_tool_bonus_xp>=0),
  add column if not exists real_world_bonus_xp integer not null default 50 check(real_world_bonus_xp>=0),
  add column if not exists bonus_xp_available integer not null default 0 check(bonus_xp_available>=0),
  add column if not exists jpac_tool_activity jsonb not null default '{}'::jsonb,
  add column if not exists real_world_activity jsonb not null default '{}'::jsonb,
  add column if not exists career_connection text not null default '',
  add column if not exists portfolio_moment boolean not null default false,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists review_notes text not null default '';
create unique index if not exists course_modules_level_number_uidx on public.course_modules(course_level_id,level_module_number) where course_level_id is not null and level_module_number is not null;
alter table public.course_modules drop constraint if exists course_modules_core_xp_components_check;
alter table public.course_modules add constraint course_modules_core_xp_components_check check(core_xp=intro_core_xp+video_core_xp+assignment_core_xp+mastery_core_xp);
alter table public.course_modules drop constraint if exists course_modules_status_check;
alter table public.course_modules add constraint course_modules_status_check check(status in('draft','review','approved','published','archived'));
alter table public.lessons drop constraint if exists lessons_status_check;
alter table public.lessons add constraint lessons_status_check check(status in('draft','review','approved','published','archived'));
alter table public.activities drop constraint if exists activities_status_check;
alter table public.activities add constraint activities_status_check check(status in('draft','review','approved','published','archived'));

alter table public.activities
  add column if not exists xp_type text not null default 'bonus' check(xp_type in('core','bonus')),
  add column if not exists passing_score numeric(5,2) not null default 70 check(passing_score between 0 and 100),
  add column if not exists allows_resubmission boolean not null default true,
  add column if not exists portfolio_candidate boolean not null default false;

alter table public.xp_ledger
  add column if not exists xp_type text not null default 'legacy' check(xp_type in('core','bonus','legacy')),
  add column if not exists course_id uuid references public.courses(id) on delete set null,
  add column if not exists module_id uuid references public.course_modules(id) on delete set null;
create index if not exists xp_ledger_student_type_idx on public.xp_ledger(student_id,xp_type,created_at desc);
create unique index if not exists xp_ledger_module_core_component_uidx on public.xp_ledger(student_id,module_id,(metadata->>'component')) where xp_type='core' and module_id is not null and metadata ? 'component';
-- Preserve cached legacy XP before new classified ledger entries can cause the
-- existing ledger-total trigger to recalculate profiles.total_xp.
insert into public.xp_ledger(student_id,amount,reason,source_type,xp_type,metadata)
select p.id,p.total_xp-coalesce(x.ledger_total,0),'Legacy XP balance preserved during Core/Bonus classification','import','legacy',jsonb_build_object('migration','phase-e1')
from public.profiles p left join(select student_id,sum(amount) ledger_total from public.xp_ledger group by student_id)x on x.student_id=p.id
where p.total_xp>coalesce(x.ledger_total,0);
alter table public.xp_ledger alter column xp_type set default 'bonus';

-- Preserve every historical submission and permit immutable resubmission attempts.
alter table public.submissions drop constraint if exists submissions_activity_id_student_id_key;
alter table public.submissions add column if not exists attempt_number integer not null default 1 check(attempt_number>0);
create unique index if not exists submissions_activity_student_attempt_uidx on public.submissions(activity_id,student_id,attempt_number);

create table if not exists public.module_video_progress(
  student_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  watched_seconds integer not null default 0 check(watched_seconds>=0),
  duration_seconds integer not null check(duration_seconds>0),
  percent_watched numeric(5,2) generated always as(least(100,round((watched_seconds::numeric/duration_seconds::numeric)*100,2))) stored,
  started_at timestamptz not null default now(),
  last_watched_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key(student_id,module_id)
);
alter table public.module_video_progress enable row level security;
drop policy if exists "students read own module video progress" on public.module_video_progress;
drop policy if exists "staff read module video progress" on public.module_video_progress;
create policy "students read own module video progress" on public.module_video_progress for select to authenticated using(student_id=auth.uid());
create policy "staff read module video progress" on public.module_video_progress for select to authenticated using(public.is_staff());
grant select on public.module_video_progress to authenticated;
revoke insert,update,delete on public.module_video_progress from authenticated;

create or replace function public.jpac_award_module_core_component(target_student uuid,target_module uuid,component text)
returns integer language plpgsql security definer set search_path=public as $$
declare reward integer;reason_text text;inserted integer;
begin
  select case component when 'intro' then intro_core_xp when 'video' then video_core_xp when 'mastery' then mastery_core_xp end into reward from public.course_modules where id=target_module;
  if reward is null or component not in('intro','video','mastery') then raise exception 'Unsupported Core XP component'; end if;
  if not exists(select 1 from public.xp_ledger where student_id=target_student and module_id=target_module and xp_type='core' and metadata->>'component'=component) then
    reason_text:=case component when 'intro' then 'Completed module introduction' when 'video' then 'Watched required instructional video' else 'Completed module mastery requirements' end;
    insert into public.xp_ledger(student_id,amount,reason,source_type,source_id,xp_type,course_id,module_id,metadata)
    select target_student,reward,reason_text,'module',target_module,'core',m.course_id,m.id,jsonb_build_object('component',component) from public.course_modules m where m.id=target_module on conflict do nothing;
    get diagnostics inserted=row_count;
    if inserted=1 then return reward;end if;
  end if;
  return 0;
end; $$;
revoke all on function public.jpac_award_module_core_component(uuid,uuid,text) from public,anon,authenticated;

create or replace function public.jpac_finalize_module_mastery(target_student uuid,target_module uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare requirements_met boolean;threshold integer;
begin
  select m.core_unlock_threshold,
    exists(select 1 from public.xp_ledger intro where intro.student_id=target_student and intro.module_id=m.id and intro.xp_type='core' and intro.metadata->>'component'='intro')
    and coalesce(v.percent_watched,0)>=90
    and exists(select 1 from public.activities required where required.module_id=m.id and required.required and required.activity_type in('assignment','performance','quiz'))
    and not exists(select 1 from public.activities required where required.module_id=m.id and required.required and required.activity_type in('assignment','performance','quiz') and not exists(select 1 from public.submissions s where s.activity_id=required.id and s.student_id=target_student and s.status='approved' and s.score>=required.passing_score))
    and coalesce((select sum(x.amount) from public.xp_ledger x where x.student_id=target_student and x.module_id=m.id and x.xp_type='core' and coalesce(x.metadata->>'component','')<>'mastery'),0)>=m.core_unlock_threshold
  into threshold,requirements_met from public.course_modules m left join public.module_video_progress v on v.module_id=m.id and v.student_id=target_student where m.id=target_module;
  if coalesce(requirements_met,false) then perform public.jpac_award_module_core_component(target_student,target_module,'mastery');end if;
  return coalesce(requirements_met,false);
end; $$;
revoke all on function public.jpac_finalize_module_mastery(uuid,uuid) from public,anon,authenticated;

create or replace function public.jpac_complete_module_intro(target_module uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare awarded integer;
begin
  if auth.uid() is null or not public.jpac_module_is_unlocked(target_module,auth.uid()) then raise exception 'Module access required'; end if;
  awarded:=public.jpac_award_module_core_component(auth.uid(),target_module,'intro');
  perform public.jpac_finalize_module_mastery(auth.uid(),target_module);
  return awarded;
end; $$;
revoke all on function public.jpac_complete_module_intro(uuid) from public,anon;
grant execute on function public.jpac_complete_module_intro(uuid) to authenticated;

create or replace function public.jpac_record_module_video_progress(target_module uuid,watched integer,duration integer)
returns numeric language plpgsql security definer set search_path=public as $$
declare pct numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if watched<0 or duration<=0 or watched>duration+5 then raise exception 'Invalid video progress'; end if;
  if not exists(select 1 from public.course_modules m where m.id=target_module and m.status='published' and public.jpac_student_has_course_access(m.course_id)) or not public.jpac_module_is_unlocked(target_module,auth.uid()) then raise exception 'Module access required'; end if;
  insert into public.module_video_progress(student_id,module_id,watched_seconds,duration_seconds)
  values(auth.uid(),target_module,least(watched,duration,10),duration)
  on conflict(student_id,module_id) do update set
    watched_seconds=greatest(module_video_progress.watched_seconds,least(excluded.watched_seconds,excluded.duration_seconds,floor(extract(epoch from now()-module_video_progress.started_at))::integer+10)),
    duration_seconds=excluded.duration_seconds,last_watched_at=now();
  update public.module_video_progress set completed_at=coalesce(completed_at,now()) where student_id=auth.uid() and module_id=target_module and percent_watched>=90;
  select percent_watched into pct from public.module_video_progress where student_id=auth.uid() and module_id=target_module;
  if pct>=90 then perform public.jpac_award_module_core_component(auth.uid(),target_module,'video');perform public.jpac_finalize_module_mastery(auth.uid(),target_module);end if;
  return pct;
end; $$;
revoke all on function public.jpac_record_module_video_progress(uuid,integer,integer) from public,anon;
grant execute on function public.jpac_record_module_video_progress(uuid,integer,integer) to authenticated;

create or replace function public.jpac_module_completion(target_student uuid,target_module uuid)
returns table(video_percent numeric,assignment_score numeric,core_xp_earned integer,core_xp_available integer,core_xp_threshold integer,intro_complete boolean,assignment_submitted boolean,assessment_passed boolean,mastery_awarded boolean,is_complete boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  if target_student<>auth.uid() and not public.is_staff() then raise exception 'Not authorized'; end if;
  return query with facts as(
    select coalesce(v.percent_watched,0) video_percent,
      coalesce((select max(s.score) from public.submissions s join public.activities a on a.id=s.activity_id where s.student_id=target_student and a.module_id=target_module and a.required and a.activity_type in('assignment','performance','quiz')),0) assignment_score,
      coalesce((select sum(x.amount) from public.xp_ledger x where x.student_id=target_student and x.module_id=target_module and x.xp_type='core'),0)::integer core_earned,
      m.core_xp core_available,
      m.core_unlock_threshold core_threshold,
      exists(select 1 from public.xp_ledger x where x.student_id=target_student and x.module_id=target_module and x.xp_type='core' and x.metadata->>'component'='intro') intro_done,
      exists(select 1 from public.submissions s join public.activities a on a.id=s.activity_id where s.student_id=target_student and a.module_id=target_module and a.required and a.activity_type in('assignment','performance','quiz')) submitted,
      exists(select 1 from public.activities a where a.module_id=target_module and a.required and a.activity_type in('assignment','performance','quiz')) and not exists(select 1 from public.activities a where a.module_id=target_module and a.required and a.activity_type in('assignment','performance','quiz') and not exists(select 1 from public.submissions s where s.activity_id=a.id and s.student_id=target_student and s.status='approved' and s.score>=a.passing_score)) assessment_ok,
      exists(select 1 from public.xp_ledger x where x.student_id=target_student and x.module_id=target_module and x.xp_type='core' and x.metadata->>'component'='mastery') mastery_done
    from public.course_modules m left join public.module_video_progress v on v.module_id=m.id and v.student_id=target_student where m.id=target_module
  ) select facts.video_percent,facts.assignment_score,facts.core_earned,facts.core_available,facts.core_threshold,facts.intro_done,facts.submitted,facts.assessment_ok,facts.mastery_done,
    video_percent>=90 and intro_done and submitted and assessment_ok and core_earned>=core_threshold and mastery_done from facts;
end;
$$;
revoke all on function public.jpac_module_completion(uuid,uuid) from public,anon;
grant execute on function public.jpac_module_completion(uuid,uuid) to authenticated;

create or replace function public.jpac_module_is_unlocked(target_module uuid,target_student uuid default auth.uid())
returns boolean language plpgsql stable security definer set search_path=public as $$
declare current_row record;previous_id uuid;complete boolean;
begin
  if target_student<>auth.uid() and not public.is_staff() then return false; end if;
  select m.course_id,m.course_level_id,m.level_module_number,m.sort_order into current_row from public.course_modules m where m.id=target_module;
  if current_row.course_id is null or not public.jpac_student_has_course_access(current_row.course_id) then return false; end if;
  select m.id into previous_id from public.course_modules m where m.course_id=current_row.course_id and m.status='published' and (m.sort_order<current_row.sort_order or (m.sort_order=current_row.sort_order and m.id<target_module)) order by m.sort_order desc,m.id desc limit 1;
  if previous_id is null then return true; end if;
  select c.is_complete into complete from public.jpac_module_completion(target_student,previous_id)c;
  return coalesce(complete,false);
end; $$;
revoke all on function public.jpac_module_is_unlocked(uuid,uuid) from public,anon;
grant execute on function public.jpac_module_is_unlocked(uuid,uuid) to authenticated;

-- Student reads retain entitlement checks and now enforce sequential unlocks.
drop policy if exists "entitled modules readable" on public.course_modules;
create policy "entitled modules readable" on public.course_modules for select to authenticated using(status='published' and public.jpac_student_has_course_access(course_id) and public.jpac_module_is_unlocked(id,auth.uid()));
drop policy if exists "entitled lessons readable" on public.lessons;
create policy "entitled lessons readable" on public.lessons for select to authenticated using(status='published' and exists(select 1 from public.course_modules m where m.id=module_id and m.status='published' and public.jpac_module_is_unlocked(m.id,auth.uid())));
drop policy if exists "published activities readable" on public.activities;
create policy "published activities readable" on public.activities for select to authenticated using(status='published' and (public.is_staff() or exists(select 1 from public.course_modules m where m.id=module_id and public.jpac_module_is_unlocked(m.id,auth.uid())) or (module_id is null and course_id is not null and public.jpac_student_has_course_access(course_id))));

-- Students cannot self-author scores, approvals, or feedback.
drop policy if exists "submissions own insert" on public.submissions;
create policy "submissions own insert" on public.submissions for insert to authenticated with check(student_id=auth.uid() and status='submitted' and score is null and teacher_feedback is null and reviewed_by is null and reviewed_at is null);

create or replace function public.jpac_submit_module_activity(target_activity uuid,file_name text,file_type text,storage_path text)
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.activities%rowtype;submission_id uuid;next_attempt integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into a from public.activities where id=target_activity and status='published';
  if a.id is null or a.module_id is null or not public.jpac_module_is_unlocked(a.module_id,auth.uid()) then raise exception 'Activity access required'; end if;
  if a.submission_type not in('audio','video') or file_type not like 'audio/%' and file_type not like 'video/%' then raise exception 'Audio or video submission required'; end if;
  if storage_path is null or split_part(storage_path,'/',1)<>auth.uid()::text then raise exception 'Invalid private storage path'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='performance-submissions' and o.name=storage_path and coalesce(o.metadata->>'mimetype','')=file_type) then raise exception 'Private submission media not found'; end if;
  select coalesce(max(attempt_number),0)+1 into next_attempt from public.submissions where activity_id=a.id and student_id=auth.uid();
  insert into public.submissions(activity_id,student_id,media_url,status,attempt_number,submitted_at,updated_at)
  values(a.id,auth.uid(),storage_path,'submitted',next_attempt,now(),now()) returning id into submission_id;
  return submission_id;
end; $$;
revoke all on function public.jpac_submit_module_activity(uuid,text,text,text) from public,anon;
grant execute on function public.jpac_submit_module_activity(uuid,text,text,text) to authenticated;

create or replace function public.jpac_complete_bonus_activity(target_activity uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare a public.activities%rowtype;c uuid;awarded integer:=0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into a from public.activities where id=target_activity and status='published' and xp_type='bonus';
  if a.id is null or a.module_id is null or not public.jpac_module_is_unlocked(a.module_id,auth.uid()) then raise exception 'Practice access required'; end if;
  if not exists(select 1 from public.practice_logs where student_id=auth.uid() and activity_id=a.id) then insert into public.practice_logs(student_id,course_id,activity_id,notes) values(auth.uid(),a.course_id,a.id,'Completed Academy recommended practice'); end if;
  if a.xp_reward>0 and not exists(select 1 from public.xp_ledger where student_id=auth.uid() and source_type='practice' and source_id=a.id and xp_type='bonus') then
    select course_id into c from public.course_modules where id=a.module_id;
    insert into public.xp_ledger(student_id,amount,reason,source_type,source_id,xp_type,course_id,module_id) values(auth.uid(),a.xp_reward,'Completed recommended creative practice','practice',a.id,'bonus',c,a.module_id);
    awarded:=a.xp_reward;
  end if;
  return awarded;
end; $$;
revoke all on function public.jpac_complete_bonus_activity(uuid) from public,anon;
grant execute on function public.jpac_complete_bonus_activity(uuid) to authenticated;

-- Wrap the existing reviewed automation so Phase E assessment gates are applied
-- without bypassing notifications, certificate readiness, or audit behavior.
create or replace function public.jpac_review_module_submission(submission_target uuid,review_score numeric,review_feedback text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.submissions%rowtype;a public.activities%rowtype;m uuid;c uuid;result jsonb;final_status text;awarded_now integer:=0;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if review_score is null or review_score<0 or review_score>100 then raise exception 'Score must be between 0 and 100'; end if;
  select * into s from public.submissions where id=submission_target;
  if s.id is null then raise exception 'Submission not found'; end if;
  select * into a from public.activities where id=s.activity_id;
  final_status:=case when review_score>=a.passing_score then 'approved' else 'revision_requested' end;
  result:=public.jpac_review_submission(submission_target,final_status,review_score,review_feedback);
  if final_status='approved' and a.xp_type='core' and not exists(select 1 from public.xp_ledger where student_id=s.student_id and source_type='activity' and source_id=a.id and xp_type='core') then
    m:=a.module_id;select course_id into c from public.course_modules where id=m;
    insert into public.xp_ledger(student_id,amount,reason,source_type,source_id,awarded_by,xp_type,course_id,module_id,metadata)
    values(s.student_id,a.xp_reward,'Passed required creative assignment','activity',a.id,auth.uid(),'core',c,m,jsonb_build_object('component','assignment','submission_id',s.id)) on conflict do nothing returning amount into awarded_now;
  elsif final_status='revision_requested' then
    insert into public.aria_recommendations(student_id,recommendation_type,title,rationale,action_payload,priority,source_version)
    values(s.student_id,'assessment','Improve and resubmit',coalesce(nullif(review_feedback,''),'Review the rubric, focus on one to three priority corrections, practice the weakest criterion, and submit a new attempt.'),jsonb_build_object('submission_id',s.id,'activity_id',a.id,'score',review_score),4,'phase-e1');
  end if;
  if final_status='approved' then
    update public.submissions set xp_awarded=coalesce(awarded_now,0) where id=s.id;
    update public.student_notifications set message=case when coalesce(awarded_now,0)>0 then format('Your submission was approved and %s Core XP was awarded.',awarded_now) else 'Your submission was approved. Core assignment XP was already earned on an earlier passing attempt.' end where related_submission_id=s.id and notification_type='submission_approved';
    update public.submission_automation_events set payload=payload||jsonb_build_object('xpAwarded',coalesce(awarded_now,0),'xpType','core') where submission_id=s.id and event_type='approval_completed';
    update public.profiles set total_xp=greatest(0,coalesce((select sum(amount) from public.xp_ledger where student_id=s.student_id),0)),updated_at=now() where id=s.student_id;
    perform public.jpac_finalize_module_mastery(s.student_id,a.module_id);
  end if;
  return result||jsonb_build_object('passingScore',a.passing_score,'assessmentPassed',final_status='approved','xpAwarded',coalesce(awarded_now,0));
end; $$;
revoke all on function public.jpac_review_module_submission(uuid,numeric,text) from public,anon;
grant execute on function public.jpac_review_module_submission(uuid,numeric,text) to authenticated;

create or replace function public.curriculum_transition_module(target_module uuid,target_status text,notes text default '')
returns void language plpgsql security definer set search_path=public as $$
declare m public.course_modules%rowtype;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if target_status not in('draft','review','approved','published','archived') then raise exception 'Unsupported curriculum status'; end if;
  select * into m from public.course_modules where id=target_module for update;
  if m.id is null then raise exception 'Module not found'; end if;
  if target_status='published' and (m.status<>'approved' or nullif(m.primary_video_url,'') is null or nullif(m.short_intro,'') is null or m.jpac_tool_activity='{}'::jsonb or m.real_world_activity='{}'::jsonb or (select count(*) from public.activities a where a.module_id=m.id and a.required and a.xp_type='core' and a.rubric<>'{}'::jsonb)<>1 or (select count(*) from public.activities a where a.module_id=m.id and not a.required and a.xp_type='bonus' and a.activity_type='practice')<2) then raise exception 'Approved module is missing video, one Core creative assignment/rubric, or two Bonus practice activities'; end if;
  update public.course_modules set status=target_status,review_notes=coalesce(notes,''),approved_by=case when target_status='approved' then auth.uid() else approved_by end,approved_at=case when target_status='approved' then now() when target_status='draft' then null else approved_at end,updated_at=now() where id=target_module;
end; $$;
revoke all on function public.curriculum_transition_module(uuid,text,text) from public,anon;
grant execute on function public.curriculum_transition_module(uuid,text,text) to authenticated;

-- Existing Singing Level 1 remains published; normalize its canonical XP and practices.
update public.courses set core_xp_total=25000 where slug='singing';
update public.course_levels set title=case level_number when 1 then 'Beginner' when 2 then 'Intermediate' when 3 then 'Advanced' when 4 then 'Master' end,core_xp_target=6250 where course_id=(select id from public.courses where slug='singing');
with ranked as(select id,row_number() over(order by sort_order,id) n from public.course_modules where course_id=(select id from public.courses where slug='singing') and course_level_id=(select cl.id from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug='singing' and cl.level_number=1))
update public.course_modules m set level_module_number=r.n::integer,core_xp=625,jpac_tool_activity=case when r.n=1 then '{"title":"Breath Control Studio","instructions":"Use the JPAC practice timer to record three controlled breath cycles and compare consistency."}'::jsonb else '{"title":"Pitch and Tone Lab","instructions":"Use an appropriate JPAC audio tool to compare three short takes and identify the clearest tone."}'::jsonb end,real_world_activity=case when r.n=1 then '{"title":"Three-Take Breath Challenge","instructions":"Record three versions of a chorus, focusing on one breath-control choice per take, then select the strongest."}'::jsonb else '{"title":"One-Take Foundation Session","instructions":"Record 30–60 seconds of a song you choose while demonstrating pitch, healthy tone, and expressive intent."}'::jsonb end from ranked r where m.id=r.id;
update public.activities set xp_type='core',xp_reward=350,passing_score=70,allows_resubmission=true where course_id=(select id from public.courses where slug='singing') and title='Level 1 Foundation Performance';
update public.activities set xp_type='bonus',xp_reward=50,required=false,allows_resubmission=true where course_id=(select id from public.courses where slug='singing') and title='Five-Day Healthy Warm-Up Log';
insert into public.activities(course_id,module_id,title,description,activity_type,instructions,submission_type,xp_reward,required,status,rubric,xp_type,passing_score,allows_resubmission)
select m.course_id,m.id,'Breath Control Studio Challenge','Create a short vocal take that demonstrates balanced alignment and controlled breath release.','performance','Record 30–60 seconds of a song you choose. Demonstrate prepared alignment, a quiet coordinated breath, and a sustained phrase.','audio',350,true,'published',jsonb_build_object('criteria',array['Balanced alignment','Coordinated breath','Sustained phrase control','Prepared creative delivery']),'core',70,true
from public.course_modules m join public.courses c on c.id=m.course_id join public.course_levels cl on cl.id=m.course_level_id
where c.slug='singing' and cl.level_number=1 and m.level_module_number=1 and not exists(select 1 from public.activities a where a.module_id=m.id and a.required and a.activity_type in('assignment','performance','quiz'));

-- Draft-only Singing roadmap. These outlines require staff review, detailed lessons,
-- media, assignments and rubrics before any publication transition.
with existing_numbers as(
  select m.id,row_number() over(partition by m.course_level_id order by m.sort_order,m.id)+(select coalesce(max(numbered.level_module_number),0) from public.course_modules numbered where numbered.course_level_id=m.course_level_id) n
  from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=m.course_id
  where c.slug='singing' and m.level_module_number is null
)
update public.course_modules m set level_module_number=e.n::integer from existing_numbers e where m.id=e.id;
with blueprint(level_number,module_number,title,career) as(values
 (1,3,'Resonance: Find Your Sound','Singers shape resonance to create a recognizable, sustainable sound.'),(1,4,'Rhythm and Vocal Timing','Session singers must enter, sustain, and release phrases accurately.'),(1,5,'Diction and Story Clarity','Clear diction helps performers communicate lyrics without losing musical flow.'),(1,6,'Range Without Strain','Healthy range development supports consistent auditions and performances.'),(1,7,'Dynamics: Make Them Feel Something','Dynamic control helps vocalists shape emotion and audience attention.'),(1,8,'Harmony Starter Session','Harmony skills prepare singers for ensembles, studio layers, and background vocals.'),(1,9,'Microphone Fundamentals','Microphone technique supports clean live and recorded performances.'),(1,10,'Beginner Showcase','Creators learn to prepare, capture, review, and improve a complete performance.'),
 (2,1,'Breath Control Under Pressure','Reliable support helps performers stay consistent through demanding phrases.'),(2,2,'Extending Range and Registration','Flexible registration expands repertoire and professional versatility.'),(2,3,'Tone Colors and Style','Working singers adapt tone while maintaining healthy technique.'),(2,4,'Harmony and Ensemble Precision','Ensemble accuracy is essential for groups, sessions, and live productions.'),(2,5,'Runs, Riffs and Musical Choices','Agility becomes useful when musical choices remain intentional.'),(2,6,'Interpretation and Phrasing','Phrasing turns correct notes into a compelling performance.'),(2,7,'Studio Vocal Workflow','Recording workflows teach preparation, comping awareness, and repeatable takes.'),(2,8,'Live Performance Stamina','Performance stamina supports rehearsals, shows, and touring conditions.'),(2,9,'Collaboration Session','Professional creators communicate, revise, and deliver within a team.'),(2,10,'Intermediate Performance Project','A complete project demonstrates growing independence and artistic decision-making.'),
 (3,1,'Advanced Vocal Coordination','Advanced coordination supports demanding repertoire safely.'),(3,2,'Genre Fluency','Genre awareness helps vocalists work across varied creative opportunities.'),(3,3,'Advanced Harmony and Arrangement','Arrangement skills expand ensemble, production, and directing opportunities.'),(3,4,'Improvisation With Intent','Improvisation supports responsive, original performance choices.'),(3,5,'Character, Emotion and Authenticity','Authentic interpretation connects technique to audience experience.'),(3,6,'Recording Session Leadership','Session leadership combines preparation, communication, and efficient delivery.'),(3,7,'Performance Production','Artists coordinate sound, staging, visuals, and collaborators.'),(3,8,'Audition Strategy','Audition readiness combines material choice, preparation, and adaptability.'),(3,9,'Original Vocal Project','Independent creation demonstrates advanced artistic ownership.'),(3,10,'Advanced Showcase','A polished showcase provides evidence for performance and portfolio review.'),
 (4,1,'Professional Vocal Identity','Professionals define their sound, strengths, audience, and working direction.'),(4,2,'Signature Repertoire','Strategic repertoire communicates identity and employable range.'),(4,3,'High-Level Studio Delivery','Professional recording requires consistency, direction-taking, and efficient revision.'),(4,4,'Live Set Design','Set design balances pacing, audience experience, stamina, and artistic purpose.'),(4,5,'Creative Direction and Collaboration','Creative leaders align collaborators around a clear performance vision.'),(4,6,'Vocal Business Essentials','Working artists need practical knowledge of preparation, communication, rights, and delivery.'),(4,7,'Brand and Audience Connection','Clear presentation helps audiences and collaborators understand an artist’s work.'),(4,8,'Professional Audition Package','A strong package makes skills easy for decision-makers to evaluate.'),(4,9,'Portfolio-Ready Capstone','A capstone demonstrates independent professional creative practice.'),(4,10,'Career-Ready Showcase','The final showcase connects mastery evidence to next career actions.'))
insert into public.course_modules(course_id,course_level_id,level_module_number,title,description,short_intro,career_connection,sort_order,xp_value,core_xp,status)
select c.id,cl.id,b.module_number,b.title,'Draft creative module outline. Requires human-authored lessons, video, assignment, rubric, and two practice reviews before approval.','Create, perform, compare, improve, and show a measurable skill through a concise studio challenge.',b.career,(b.level_number-1)*10+b.module_number,625,625,'draft'
from blueprint b join public.courses c on c.slug='singing' join public.course_levels cl on cl.course_id=c.id and cl.level_number=b.level_number
where not exists(select 1 from public.course_modules m where m.course_level_id=cl.id and m.level_module_number=b.module_number)
on conflict(course_id,sort_order) do nothing;

update public.course_modules set core_xp=625,intro_core_xp=50,video_core_xp=100,assignment_core_xp=350,mastery_core_xp=125,core_unlock_threshold=438,jpac_tool_bonus_xp=50,real_world_bonus_xp=50,bonus_xp_available=100,xp_value=625 where course_id=(select id from public.courses where slug='singing');
update public.course_levels set core_xp_target=6250 where course_id=(select id from public.courses where slug='singing');
update public.activities a set xp_reward=350 from public.course_modules m where a.module_id=m.id and a.xp_type='core' and m.course_id=(select id from public.courses where slug='singing');

-- Published pilot modules expose two distinct, configurable Bonus XP practices.
insert into public.activities(course_id,module_id,title,description,activity_type,instructions,submission_type,xp_reward,required,status,xp_type)
select m.course_id,m.id,'JPAC Tool Practice: Breath and Tone Lab','Use a JPAC Creative Studio tool for a short, focused comparison challenge.','practice','Record or compare three short takes. Identify the strongest breath, pitch, or tone choice and explain what improved.','none',m.jpac_tool_bonus_xp,false,'published','bonus' from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and m.status='published' and not exists(select 1 from public.activities a where a.module_id=m.id and a.title='JPAC Tool Practice: Breath and Tone Lab');
insert into public.activities(course_id,module_id,title,description,activity_type,instructions,submission_type,xp_reward,required,status,xp_type)
select m.course_id,m.id,'Real-World Practice: Three-Take Session','Use your voice, microphone, phone, or performance space for a specific improvement session.','practice','Create three takes while focusing on one module skill. Listen back, compare them, and choose the strongest take.','none',m.real_world_bonus_xp,false,'published','bonus' from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and m.status='published' and not exists(select 1 from public.activities a where a.module_id=m.id and a.xp_type='bonus' and a.activity_type='practice' and a.title<>'JPAC Tool Practice: Breath and Tone Lab');

do $$
declare singing_id uuid;level_count integer;module_count integer;invalid_levels integer;invalid_modules integer;unexpected_modules integer;distinct_titles integer;core_total integer;
begin
  select id into singing_id from public.courses where slug='singing';
  select count(*) into level_count from public.course_levels where course_id=singing_id;
  select count(*) into module_count from public.course_modules where course_id=singing_id;
  select count(*) into invalid_levels from(select cl.id from public.course_levels cl left join public.course_modules m on m.course_level_id=cl.id where cl.course_id=singing_id group by cl.id having count(m.id)<>10)s;
  select count(*) into invalid_modules from public.course_modules where course_id=singing_id and (course_level_id is null or level_module_number not between 1 and 10 or core_xp<>625 or intro_core_xp<>50 or video_core_xp<>100 or assignment_core_xp<>350 or mastery_core_xp<>125 or core_unlock_threshold<>438);
  select count(*),count(distinct title) into unexpected_modules,distinct_titles from public.course_modules where course_id=singing_id and title<>all(array[
    'Breath, Alignment & Vocal Health','Pitch, Tone & First Performance','Resonance: Find Your Sound','Rhythm and Vocal Timing','Diction and Story Clarity','Range Without Strain','Dynamics: Make Them Feel Something','Harmony Starter Session','Microphone Fundamentals','Beginner Showcase',
    'Breath Control Under Pressure','Extending Range and Registration','Tone Colors and Style','Harmony and Ensemble Precision','Runs, Riffs and Musical Choices','Interpretation and Phrasing','Studio Vocal Workflow','Live Performance Stamina','Collaboration Session','Intermediate Performance Project',
    'Advanced Vocal Coordination','Genre Fluency','Advanced Harmony and Arrangement','Improvisation With Intent','Character, Emotion and Authenticity','Recording Session Leadership','Performance Production','Audition Strategy','Original Vocal Project','Advanced Showcase',
    'Professional Vocal Identity','Signature Repertoire','High-Level Studio Delivery','Live Set Design','Creative Direction and Collaboration','Vocal Business Essentials','Brand and Audience Connection','Professional Audition Package','Portfolio-Ready Capstone','Career-Ready Showcase']);
  select count(distinct title) into distinct_titles from public.course_modules where course_id=singing_id;
  select coalesce(sum(core_xp),0) into core_total from public.course_modules where course_id=singing_id;
  if level_count<>4 or module_count<>40 or invalid_levels<>0 or invalid_modules<>0 or unexpected_modules<>0 or distinct_titles<>40 or core_total<>25000 then raise exception 'Singing canonical model validation failed: levels %, modules %, invalid levels %, invalid modules %, unexpected modules %, distinct titles %, Core XP %',level_count,module_count,invalid_levels,invalid_modules,unexpected_modules,distinct_titles,core_total;end if;
end; $$;

commit;
