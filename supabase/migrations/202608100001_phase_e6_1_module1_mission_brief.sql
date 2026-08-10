begin;

-- The reviewed E3 seed contains this mission, but intentionally skipped the
-- already-published Module 1. Fill only the proven blank canonical field.
do $$
declare
  target_count integer;
begin
  select count(*) into target_count
  from public.course_modules m
  join public.course_levels cl on cl.id=m.course_level_id
  join public.courses c on c.id=m.course_id
  where c.slug='singing'
    and cl.level_number=1
    and m.level_module_number=1
    and m.title='Breath, Alignment & Vocal Health';

  if target_count<>1 then
    raise exception 'Expected exactly one canonical Singing Beginner Module 1, found %',target_count;
  end if;
end $$;

update public.course_modules m
set short_intro='Build a healthy physical foundation for singing.',
    updated_at=now()
from public.course_levels cl,public.courses c
where cl.id=m.course_level_id
  and c.id=m.course_id
  and c.slug='singing'
  and cl.level_number=1
  and m.level_module_number=1
  and m.title='Breath, Alignment & Vocal Health'
  and nullif(trim(m.short_intro),'') is null;

commit;
