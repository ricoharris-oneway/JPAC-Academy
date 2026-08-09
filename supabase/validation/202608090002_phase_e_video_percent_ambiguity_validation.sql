begin transaction read only;

-- Exercise the normal authenticated/RLS path for the existing Singing student.
do $$
begin
  if not exists(
    select 1
    from public.enrollments e
    join public.courses c on c.id=e.course_id
    where c.slug='singing' and e.status='active'
  ) then
    raise exception 'No active enrollment exists for the canonical Singing course';
  end if;
end;
$$;

select set_config('request.jwt.claims',(
  select jsonb_build_object('sub',e.student_id,'role','authenticated')::text
  from public.enrollments e join public.courses c on c.id=e.course_id
  where c.slug='singing' and e.status='active'
  order by e.id limit 1
),true);
set local role authenticated;

-- A. Must return without an ambiguous-column exception.
select completion.*
from public.courses c
join public.course_levels cl on cl.course_id=c.id and cl.level_number=1
join public.course_modules m on m.course_level_id=cl.id and m.level_module_number=1
cross join lateral public.jpac_module_completion(auth.uid(),m.id) completion
where c.slug='singing';

-- D. Same published-module query and RLS path used by the frontend.
select m.id,m.title,m.level_module_number,m.status
from public.course_modules m join public.courses c on c.id=m.course_id
where c.slug='singing' and m.status='published' order by m.sort_order,m.id;

-- E. Confirm sequential server-side unlock results remain evaluable.
select m.id,m.title,m.level_module_number,
       public.jpac_module_is_unlocked(m.id,auth.uid()) as is_unlocked
from public.course_modules m join public.courses c on c.id=m.course_id
where c.slug='singing' and m.status='published' order by m.sort_order,m.id;
reset role;

-- B. Expected: 4, 40, 40, 25000.
select count(distinct cl.id) as singing_levels,
       count(distinct m.id) as singing_modules,
       count(distinct m.id) filter(where m.core_xp=625) as modules_at_625_core_xp,
       sum(m.core_xp) as total_core_xp
from public.courses c join public.course_levels cl on cl.course_id=c.id
join public.course_modules m on m.course_level_id=cl.id where c.slug='singing';

-- C. Existing published Beginner modules and lessons must remain present.
select m.id,m.title,m.level_module_number,m.status,
       count(l.id) filter(where l.status='published') as published_lessons
from public.courses c join public.course_levels cl on cl.course_id=c.id and cl.level_number=1
join public.course_modules m on m.course_level_id=cl.id
left join public.lessons l on l.module_id=m.id
where c.slug='singing' and m.status='published'
group by m.id,m.title,m.level_module_number,m.status order by m.level_module_number;

-- F. The separate submission RLS hardening must remain installed.
select policyname,cmd,roles,qual,with_check from pg_policies
where schemaname='public' and tablename='submissions'
  and policyname='submissions own draft update';

select has_function_privilege('anon','public.jpac_module_completion(uuid,uuid)','execute') as anon_execute,
       has_function_privilege('authenticated','public.jpac_module_completion(uuid,uuid)','execute') as authenticated_execute;

rollback;
