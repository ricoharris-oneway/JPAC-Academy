-- Block A3: one teacher review action completes the downstream learning workflow.

-- Add review and automation state to the existing submissions table.
do $$ begin
  alter table public.submissions add column reviewed_by uuid references public.profiles(id) on delete set null;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.submissions add column reviewed_at timestamptz;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.submissions add column xp_awarded integer not null default 0;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.submissions add column passport_eligible boolean not null default false;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.submissions add column automation_processed_at timestamptz;
exception when duplicate_column then null; end $$;

create table if not exists public.student_notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  related_submission_id uuid references public.submissions(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists student_notifications_student_idx
  on public.student_notifications(student_id,created_at desc);

alter table public.student_notifications enable row level security;
drop policy if exists "students read own notifications" on public.student_notifications;
create policy "students read own notifications" on public.student_notifications
  for select to authenticated using(student_id=auth.uid());

create table if not exists public.certificate_readiness (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid,
  approved_submissions integer not null default 0,
  average_score numeric(5,2) not null default 0,
  readiness_status text not null default 'in_progress' check(readiness_status in ('in_progress','review_ready','eligible')),
  last_submission_id uuid references public.submissions(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(student_id,course_id)
);

create index if not exists certificate_readiness_student_idx
  on public.certificate_readiness(student_id,readiness_status);

alter table public.certificate_readiness enable row level security;
drop policy if exists "students read own certificate readiness" on public.certificate_readiness;
create policy "students read own certificate readiness" on public.certificate_readiness
  for select to authenticated using(student_id=auth.uid());

create table if not exists public.submission_automation_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  event_type text not null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(submission_id,event_type)
);

alter table public.submission_automation_events enable row level security;

create or replace function public.jpac_review_submission(
  submission_target uuid,
  review_status text,
  review_score numeric default null,
  review_feedback text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  reviewer public.profiles%rowtype;
  submission_row public.submissions%rowtype;
  submission_json jsonb;
  activity_json jsonb := '{}'::jsonb;
  activity_target uuid;
  course_target uuid;
  xp_reward integer := 250;
  approved_count integer := 0;
  approved_average numeric := 0;
  readiness text := 'in_progress';
  already_processed boolean := false;
begin
  select * into reviewer from public.profiles where id=auth.uid();
  if reviewer.id is null or reviewer.role not in ('teacher','admin','developer') then
    raise exception 'Teacher, Admin, or Developer access required';
  end if;

  if review_status not in ('approved','revision_requested') then
    raise exception 'Unsupported review status';
  end if;

  select * into submission_row from public.submissions where id=submission_target for update;
  if submission_row.id is null then raise exception 'Submission not found'; end if;

  already_processed := submission_row.automation_processed_at is not null;

  update public.submissions
  set status=review_status,
      score=review_score,
      teacher_feedback=review_feedback,
      reviewed_by=auth.uid(),
      reviewed_at=now(),
      passport_eligible=(review_status='approved'),
      automation_processed_at=case when review_status='approved' and automation_processed_at is null then now() else automation_processed_at end
  where id=submission_target
  returning * into submission_row;

  if review_status='revision_requested' then
    insert into public.student_notifications(student_id,notification_type,title,message,related_submission_id)
    values(submission_row.student_id,'submission_revision','Revision requested','Your instructor returned a submission with feedback. Review the notes and submit a new attempt.',submission_row.id);

    return jsonb_build_object('ok',true,'status',review_status,'submissionId',submission_row.id,'automationProcessed',false);
  end if;

  -- Approval automation is idempotent. Re-approving cannot award XP twice.
  if not already_processed then
    submission_json := to_jsonb(submission_row);
    begin activity_target := nullif(submission_json->>'activity_id','')::uuid; exception when others then activity_target := null; end;

    if activity_target is not null and to_regclass('public.activities') is not null then
      execute 'select to_jsonb(a) from public.activities a where a.id=$1' into activity_json using activity_target;
      xp_reward := greatest(0,coalesce((activity_json->>'xp_reward')::integer,250));
      begin course_target := nullif(activity_json->>'course_id','')::uuid; exception when others then course_target := null; end;
    end if;

    update public.profiles
      set total_xp=coalesce(total_xp,0)+xp_reward
      where id=submission_row.student_id;

    update public.submissions set xp_awarded=xp_reward where id=submission_row.id;

    -- Raise course progress without overwriting higher progress already earned.
    if course_target is not null and to_regclass('public.enrollments') is not null then
      update public.enrollments
      set progress=greatest(coalesce(progress,0),least(100,coalesce(progress,0)+10))
      where student_id=submission_row.student_id and course_id=course_target;
    end if;

    -- Existing Creative Passport consumes student_timeline entries.
    if to_regclass('public.student_timeline') is not null then
      execute 'insert into public.student_timeline(student_id,event_type,title,description,occurred_at) values($1,$2,$3,$4,now())'
      using submission_row.student_id,'performance','Performance approved',coalesce(review_feedback,'Instructor-approved creative performance.');
    end if;

    insert into public.student_notifications(student_id,notification_type,title,message,related_submission_id)
    values(submission_row.student_id,'submission_approved','Performance approved',format('Your submission was approved and %s XP was awarded.',xp_reward),submission_row.id);

    insert into public.submission_automation_events(submission_id,event_type,student_id,payload)
    values(submission_row.id,'approval_completed',submission_row.student_id,jsonb_build_object('xpAwarded',xp_reward,'courseId',course_target,'score',review_score))
    on conflict(submission_id,event_type) do nothing;
  end if;

  select count(*),coalesce(avg(score),0)
    into approved_count,approved_average
  from public.submissions
  where student_id=submission_row.student_id and status='approved' and (course_target is null or id=submission_row.id or true);

  readiness := case when approved_count>=5 and approved_average>=80 then 'eligible' when approved_count>=3 then 'review_ready' else 'in_progress' end;

  insert into public.certificate_readiness(student_id,course_id,approved_submissions,average_score,readiness_status,last_submission_id,updated_at)
  values(submission_row.student_id,course_target,approved_count,approved_average,readiness,submission_row.id,now())
  on conflict(student_id,course_id) do update set
    approved_submissions=excluded.approved_submissions,
    average_score=excluded.average_score,
    readiness_status=excluded.readiness_status,
    last_submission_id=excluded.last_submission_id,
    updated_at=now();

  return jsonb_build_object(
    'ok',true,
    'status',review_status,
    'submissionId',submission_row.id,
    'xpAwarded',case when already_processed then submission_row.xp_awarded else xp_reward end,
    'passportEligible',true,
    'certificateReadiness',readiness,
    'automationProcessed',not already_processed
  );
end;
$$;

grant execute on function public.jpac_review_submission(uuid,text,numeric,text) to authenticated;
