-- Milestone 2: entitlement-backed student course access.
-- Reuses profiles, Wix entitlements, courses, course_modules, lessons, and lesson_progress.

create or replace function public.jpac_course_access_key(value text)
returns text language sql immutable set search_path=public as $$
  select case
    when cleaned like '%audio engineering%' then 'audio-engineering'
    when cleaned like '%video production%' then 'video-production'
    when cleaned like '%artist development%' then 'artist-development'
    when cleaned like '%music business%' then 'music-business'
    when cleaned like '%songwriting%' then 'songwriting'
    when cleaned like '%singing%' then 'singing'
    when cleaned like '%piano%' then 'piano'
    when cleaned like '%acting%' then 'acting'
    when cleaned like '%dance%' then 'dance'
    when cleaned like '%guitar%' then 'guitar'
    else cleaned
  end
  from (select trim(both '-' from regexp_replace(lower(trim(coalesce(value,''))), '^jpac\s*[-:]\s*|[^a-z0-9]+', '-', 'g')) cleaned) normalized;
$$;

create or replace function public.jpac_student_has_course_access(target_course uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select case
    when auth.uid() is null then false
    when exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('teacher','admin','developer')) then true
    else exists(
      select 1
      from public.wix_access_entitlements e
      join public.courses c on c.id=target_course
      where e.profile_id=auth.uid()
        and lower(e.status) in ('active','trialing','trial','free_trial')
        and (e.starts_at is null or e.starts_at<=now())
        and (e.ends_at is null or e.ends_at>now())
        and c.status='published'
        and (
          public.jpac_course_access_key(e.plan_name)=public.jpac_course_access_key(c.title)
          or exists(
            select 1 from public.wix_program_enrollments wpe
            join public.wix_program_course_map map on map.wix_program_id=wpe.wix_program_id
            where wpe.profile_id=e.profile_id and map.course_id=c.id
              and public.jpac_course_access_key(wpe.wix_program_title)=public.jpac_course_access_key(e.plan_name)
          )
        )
    )
  end;
$$;

revoke all on function public.jpac_student_has_course_access(uuid) from public;
grant execute on function public.jpac_student_has_course_access(uuid) to authenticated;

create or replace function public.jpac_my_entitled_courses()
returns table(
  course_id uuid, slug text, title text, description text, difficulty text,
  total_xp integer, wix_program_url text, entitlement_id uuid, plan_name text,
  entitlement_status text, entitlement_ends_at timestamptz, progress numeric,
  last_accessed_at timestamptz
)
language sql stable security definer set search_path=public as $$
  select distinct on (c.id)
    c.id,c.slug,c.title,c.description,c.difficulty,c.total_xp,c.wix_program_url,
    e.id,e.plan_name,e.status,e.ends_at,
    coalesce(sls.progress,wpe.progress,en.progress,0)::numeric,
    recent.last_accessed_at
  from public.wix_access_entitlements e
  join public.courses c on (
    public.jpac_course_access_key(e.plan_name)=public.jpac_course_access_key(c.title)
    or exists(
      select 1 from public.wix_program_enrollments mapped_wpe
      join public.wix_program_course_map map on map.wix_program_id=mapped_wpe.wix_program_id
      where mapped_wpe.profile_id=e.profile_id and map.course_id=c.id
        and public.jpac_course_access_key(mapped_wpe.wix_program_title)=public.jpac_course_access_key(e.plan_name)
    )
  )
  left join public.wix_program_enrollments wpe
    on wpe.profile_id=e.profile_id
   and public.jpac_course_access_key(wpe.wix_program_title)=public.jpac_course_access_key(c.title)
  left join public.student_learning_state sls
    on sls.student_id=e.profile_id and (sls.course_id=c.id or sls.wix_program_id=wpe.wix_program_id)
  left join public.enrollments en on en.student_id=e.profile_id and en.course_id=c.id
  left join lateral (
    select max(lp.updated_at) last_accessed_at
    from public.lesson_progress lp
    join public.lessons l on l.id=lp.lesson_id
    join public.course_modules m on m.id=l.module_id
    where lp.student_id=e.profile_id and m.course_id=c.id
  ) recent on true
  where e.profile_id=auth.uid()
    and lower(e.status) in ('active','trialing','trial','free_trial')
    and (e.starts_at is null or e.starts_at<=now())
    and (e.ends_at is null or e.ends_at>now())
    and c.status='published'
  order by c.id,recent.last_accessed_at desc nulls last,e.updated_at desc;
$$;

revoke all on function public.jpac_my_entitled_courses() from public;
grant execute on function public.jpac_my_entitled_courses() to authenticated;

drop policy if exists "published courses readable" on public.courses;
drop policy if exists "entitled courses readable" on public.courses;
create policy "entitled courses readable" on public.courses for select to authenticated
using(public.jpac_student_has_course_access(id));

drop policy if exists "published modules readable" on public.course_modules;
drop policy if exists "entitled modules readable" on public.course_modules;
create policy "entitled modules readable" on public.course_modules for select to authenticated
using(status='published' and public.jpac_student_has_course_access(course_id));

drop policy if exists "published lessons readable" on public.lessons;
drop policy if exists "entitled lessons readable" on public.lessons;
create policy "entitled lessons readable" on public.lessons for select to authenticated
using(status='published' and exists(
  select 1 from public.course_modules m
  where m.id=module_id and public.jpac_student_has_course_access(m.course_id)
));

drop policy if exists "lesson progress own insert" on public.lesson_progress;
create policy "lesson progress own insert" on public.lesson_progress for insert to authenticated
with check(student_id=auth.uid() and exists(
  select 1 from public.lessons l join public.course_modules m on m.id=l.module_id
  where l.id=lesson_id and public.jpac_student_has_course_access(m.course_id)
));

drop policy if exists "lesson progress own or staff update" on public.lesson_progress;
create policy "lesson progress own or staff update" on public.lesson_progress for update to authenticated
using((student_id=auth.uid() and exists(
  select 1 from public.lessons l join public.course_modules m on m.id=l.module_id
  where l.id=lesson_id and public.jpac_student_has_course_access(m.course_id)
)) or public.is_staff())
with check((student_id=auth.uid() and exists(
  select 1 from public.lessons l join public.course_modules m on m.id=l.module_id
  where l.id=lesson_id and public.jpac_student_has_course_access(m.course_id)
)) or public.is_staff());
