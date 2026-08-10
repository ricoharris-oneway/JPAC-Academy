begin;

do $$
declare
  target public.activities%rowtype;
  legacy_rubric constant jsonb := '{"criteria":["Balanced alignment","Coordinated breath","Sustained phrase control","Prepared creative delivery"]}'::jsonb;
  reviewed_rubric constant jsonb := '{"criteria":[{"name":"Alignment and posture","weight":20},{"name":"Breath coordination","weight":25},{"name":"Phrase control","weight":20},{"name":"Healthy vocal production","weight":20},{"name":"Preparation and completion","weight":15}]}'::jsonb;
begin
  select a.* into target
  from public.activities a
  join public.course_modules m on m.id=a.module_id
  join public.course_levels cl on cl.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where a.id='6ff39598-9e2c-4efd-8f9e-cd6d71d6d4db'::uuid
    and c.slug='singing'
    and cl.level_number=1
    and m.level_module_number=1
    and m.title='Breath, Alignment & Vocal Health'
  for update of a;

  if target.id is null then
    raise exception 'Canonical Module 1 Breath Control Studio Challenge was not found at the expected identity';
  end if;

  if target.title is distinct from 'Breath Control Studio Challenge'
    or target.status is distinct from 'published'
    or target.required is distinct from true
    or target.xp_type is distinct from 'core'
    or target.xp_reward is distinct from 350
    or target.passing_score is distinct from 70 then
    raise exception 'Challenge state does not match the approved E6.1 production baseline';
  end if;

  if target.rubric is not distinct from reviewed_rubric then
    return;
  end if;

  if target.rubric is distinct from legacy_rubric then
    raise exception 'Challenge rubric does not match the reviewed legacy baseline';
  end if;

  update public.activities
  set rubric=reviewed_rubric
  where id=target.id;
end $$;

commit;
