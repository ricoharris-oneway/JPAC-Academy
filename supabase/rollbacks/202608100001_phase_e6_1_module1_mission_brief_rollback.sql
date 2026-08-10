begin;

-- Revert only the exact reviewed value introduced by the forward migration.
update public.course_modules m
set short_intro='',
    updated_at=now()
from public.course_levels cl,public.courses c
where cl.id=m.course_level_id
  and c.id=m.course_id
  and c.slug='singing'
  and cl.level_number=1
  and m.level_module_number=1
  and m.title='Breath, Alignment & Vocal Health'
  and m.short_intro='Build a healthy physical foundation for singing.';

commit;
