-- JPAC Academy LC2.2A: Student Digital Twin Engine
create extension if not exists "pgcrypto";

create table if not exists public.student_digital_twins (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  creative_health numeric(5,2) not null default 50 check (creative_health between 0 and 100),
  course_progress_score numeric(5,2) not null default 0 check (course_progress_score between 0 and 100),
  practice_consistency numeric(5,2) not null default 50 check (practice_consistency between 0 and 100),
  confidence_score numeric(5,2) not null default 50 check (confidence_score between 0 and 100),
  technique_score numeric(5,2) not null default 50 check (technique_score between 0 and 100),
  creativity_score numeric(5,2) not null default 50 check (creativity_score between 0 and 100),
  professionalism_score numeric(5,2) not null default 50 check (professionalism_score between 0 and 100),
  portfolio_score numeric(5,2) not null default 0 check (portfolio_score between 0 and 100),
  goal_progress_score numeric(5,2) not null default 0 check (goal_progress_score between 0 and 100),
  performance_readiness numeric(5,2) not null default 0 check (performance_readiness between 0 and 100),
  career_readiness numeric(5,2) not null default 0 check (career_readiness between 0 and 100),
  learning_velocity numeric(5,2) not null default 0 check (learning_velocity between 0 and 100),
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  trend text not null default 'stable' check (trend in ('rising','stable','declining')),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  summary text not null default '',
  next_best_action text not null default '',
  calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_skill_mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  skill_name text not null,
  skill_category text not null default 'creative',
  mastery_score numeric(5,2) not null default 50 check (mastery_score between 0 and 100),
  confidence numeric(5,2) not null default 50 check (confidence between 0 and 100),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  source text not null default 'system' check (source in ('system','teacher','assessment','aria','wix','student')),
  last_evidence_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, course_id, skill_name)
);

create table if not exists public.digital_twin_snapshots (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  creative_health numeric(5,2) not null,
  dimensions jsonb not null default '{}'::jsonb,
  reason text not null default 'scheduled refresh',
  created_at timestamptz not null default now()
);

alter table public.student_digital_twins enable row level security;
alter table public.student_skill_mastery enable row level security;
alter table public.digital_twin_snapshots enable row level security;

drop policy if exists "students read own digital twin" on public.student_digital_twins;
create policy "students read own digital twin" on public.student_digital_twins for select using(auth.uid()=student_id or public.is_staff());
drop policy if exists "staff manage digital twins" on public.student_digital_twins;
create policy "staff manage digital twins" on public.student_digital_twins for all using(public.is_staff()) with check(public.is_staff());

drop policy if exists "students read own skill mastery" on public.student_skill_mastery;
create policy "students read own skill mastery" on public.student_skill_mastery for select using(auth.uid()=student_id or public.is_staff());
drop policy if exists "staff manage skill mastery" on public.student_skill_mastery;
create policy "staff manage skill mastery" on public.student_skill_mastery for all using(public.is_staff()) with check(public.is_staff());

drop policy if exists "students read own twin snapshots" on public.digital_twin_snapshots;
create policy "students read own twin snapshots" on public.digital_twin_snapshots for select using(auth.uid()=student_id or public.is_staff());
drop policy if exists "staff manage twin snapshots" on public.digital_twin_snapshots;
create policy "staff manage twin snapshots" on public.digital_twin_snapshots for all using(public.is_staff()) with check(public.is_staff());

create or replace function public.refresh_student_digital_twin(target_student uuid, refresh_reason text default 'manual refresh')
returns public.student_digital_twins
language plpgsql
security definer
set search_path=public
as $$
declare
  progress_score numeric := 0;
  portfolio_value numeric := 0;
  goals_value numeric := 0;
  engagement_value numeric := 50;
  motivation_value numeric := 50;
  strength_avg numeric := 50;
  evidence_total integer := 0;
  health numeric := 50;
  risk text := 'low';
  action_text text := 'Complete the next Wix lesson and choose one focused JPAC LAB practice activity.';
  result_row public.student_digital_twins;
begin
  if auth.uid() <> target_student and not public.is_staff() then raise exception 'Not authorized'; end if;

  perform public.initialize_student_intelligence(target_student);

  select coalesce(avg(percent_complete),0), count(*)
    into progress_score, evidence_total
    from public.course_progress where student_id=target_student;

  select least(100, count(*) * 20) into portfolio_value
    from public.portfolio_projects where student_id=target_student and status in ('review','published');

  select coalesce(avg(progress),0) into goals_value
    from public.student_goals where student_id=target_student and status in ('active','completed');

  select coalesce(engagement_score,50), coalesce(motivation_score,50)
    into engagement_value, motivation_value
    from public.aria_profiles where student_id=target_student;

  select coalesce(avg(confidence*100),50) into strength_avg
    from public.student_strengths where student_id=target_student;

  health := round((progress_score*.30 + engagement_value*.20 + motivation_value*.15 + strength_avg*.15 + portfolio_value*.10 + goals_value*.10)::numeric,2);
  risk := case when health < 40 then 'critical' when health < 55 then 'high' when health < 70 then 'medium' else 'low' end;

  if progress_score >= 80 then action_text := 'Prepare a portfolio-quality performance and request instructor readiness feedback.';
  elsif engagement_value < 55 then action_text := 'Complete one short 15-minute practice mission to rebuild momentum.';
  elsif portfolio_value < 40 then action_text := 'Turn the next completed Wix assignment into a Creative Passport portfolio piece.';
  end if;

  insert into public.student_digital_twins(
    student_id,creative_health,course_progress_score,practice_consistency,confidence_score,
    technique_score,creativity_score,professionalism_score,portfolio_score,goal_progress_score,
    performance_readiness,career_readiness,learning_velocity,risk_level,trend,evidence_count,summary,next_best_action,calculated_at,updated_at
  ) values (
    target_student,health,progress_score,engagement_value,strength_avg,
    progress_score,strength_avg,motivation_value,portfolio_value,goals_value,
    round((progress_score*.55+strength_avg*.30+engagement_value*.15)::numeric,2),
    round((portfolio_value*.40+goals_value*.30+progress_score*.30)::numeric,2),
    round((progress_score*.60+engagement_value*.40)::numeric,2),risk,'stable',evidence_total,
    'ARIA combined course progress, engagement, strengths, goals and portfolio evidence into this Digital Twin.',action_text,now(),now()
  ) on conflict(student_id) do update set
    creative_health=excluded.creative_health,course_progress_score=excluded.course_progress_score,
    practice_consistency=excluded.practice_consistency,confidence_score=excluded.confidence_score,
    technique_score=excluded.technique_score,creativity_score=excluded.creativity_score,
    professionalism_score=excluded.professionalism_score,portfolio_score=excluded.portfolio_score,
    goal_progress_score=excluded.goal_progress_score,performance_readiness=excluded.performance_readiness,
    career_readiness=excluded.career_readiness,learning_velocity=excluded.learning_velocity,
    risk_level=excluded.risk_level,evidence_count=excluded.evidence_count,summary=excluded.summary,
    next_best_action=excluded.next_best_action,calculated_at=now(),updated_at=now()
  returning * into result_row;

  insert into public.digital_twin_snapshots(student_id,creative_health,dimensions,reason)
  values(target_student,health,jsonb_build_object('progress',progress_score,'engagement',engagement_value,'motivation',motivation_value,'confidence',strength_avg,'portfolio',portfolio_value,'goals',goals_value),refresh_reason);

  return result_row;
end;
$$;

grant execute on function public.refresh_student_digital_twin(uuid,text) to authenticated;

-- Initialize existing student accounts.
insert into public.student_digital_twins(student_id)
select id from public.profiles where role='student'
on conflict(student_id) do nothing;
