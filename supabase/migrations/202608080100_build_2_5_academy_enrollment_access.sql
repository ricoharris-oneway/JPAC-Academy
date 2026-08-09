begin;

-- Build 2.5 Phases A-C: Academy enrollments become authoritative for course
-- access. Wix commerce/history tables remain unchanged and retain all data.
alter table public.enrollments
  add column if not exists end_date date,
  add column if not exists level integer not null default 1,
  add column if not exists enrollment_source text,
  add column if not exists last_synchronized_at timestamptz;

-- Classify pre-Build-2.5 rows without claiming that historical records were
-- created by the new Academy workflow.
update public.enrollments
set enrollment_source=case when wix_enrollment_id is null then 'legacy' else 'legacy_wix' end,
    last_synchronized_at=case
      when wix_enrollment_id is not null then coalesce(last_synchronized_at,updated_at,enrolled_at)
      else last_synchronized_at
    end
where enrollment_source is null;

alter table public.enrollments
  alter column enrollment_source set default 'academy',
  alter column enrollment_source set not null;

alter table public.enrollments drop constraint if exists enrollments_level_check;
alter table public.enrollments add constraint enrollments_level_check
  check (level between 1 and 4);

alter table public.enrollments drop constraint if exists enrollments_status_check;
alter table public.enrollments add constraint enrollments_status_check
  check (status in ('pending','active','paused','completed','cancelled','withdrawn','expired'));

create index if not exists enrollments_student_active_course_idx
  on public.enrollments(student_id,course_id)
  where status='active';

create or replace function public.jpac_student_has_course_access(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select case
    when auth.uid() is null then false
    when exists(
      select 1 from public.profiles p
      where p.id=auth.uid() and p.role in ('teacher','admin','developer')
    ) then true
    else exists(
      select 1
      from public.enrollments e
      join public.courses c on c.id=e.course_id
      where e.student_id=auth.uid()
        and e.course_id=target_course
        and e.status='active'
        and c.status='published'
        and (e.start_date is null or e.start_date<=current_date)
        and (e.end_date is null or e.end_date>=current_date)
    )
  end;
$$;

revoke all on function public.jpac_student_has_course_access(uuid) from public;
grant execute on function public.jpac_student_has_course_access(uuid) to authenticated;

create or replace function public.jpac_my_academy_courses()
returns table(
  course_id uuid,
  slug text,
  title text,
  description text,
  difficulty text,
  total_xp integer,
  wix_program_url text,
  enrollment_id uuid,
  enrollment_status text,
  enrollment_start_date date,
  enrollment_end_date date,
  enrollment_level integer,
  enrollment_source text,
  progress numeric,
  last_accessed_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  select
    c.id,
    c.slug,
    c.title,
    c.description,
    c.difficulty,
    c.total_xp,
    c.wix_program_url,
    e.id,
    e.status,
    e.start_date,
    e.end_date,
    e.level,
    e.enrollment_source,
    coalesce(e.progress,0)::numeric,
    recent.last_accessed_at
  from public.enrollments e
  join public.courses c on c.id=e.course_id
  left join lateral (
    select max(lp.updated_at) as last_accessed_at
    from public.lesson_progress lp
    join public.lessons l on l.id=lp.lesson_id
    join public.course_modules m on m.id=l.module_id
    where lp.student_id=e.student_id and m.course_id=c.id
  ) recent on true
  where e.student_id=auth.uid()
    and e.status='active'
    and c.status='published'
    and (e.start_date is null or e.start_date<=current_date)
    and (e.end_date is null or e.end_date>=current_date)
  order by recent.last_accessed_at desc nulls last,e.enrolled_at,c.title;
$$;

revoke all on function public.jpac_my_academy_courses() from public;
grant execute on function public.jpac_my_academy_courses() to authenticated;

comment on function public.jpac_my_academy_courses() is
  'Build 2.5 canonical student course list. Active Academy enrollments authorize access; Wix entitlement tables are not consulted.';
comment on column public.enrollments.enrollment_source is
  'Origin of the Academy enrollment, such as academy, google_sheet, import, or legacy. Supabase remains authoritative.';

commit;
