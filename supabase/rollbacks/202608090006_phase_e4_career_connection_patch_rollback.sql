begin;

-- Restore only the blank value repaired by 090006. This does not touch
-- curriculum structure or student evidence. Do not run after a later approved
-- edit has replaced this exact value.
update public.course_modules m
set career_connection='',updated_at=now()
from public.course_levels cl, public.courses c
where m.course_level_id=cl.id
  and m.course_id=c.id
  and c.slug='singing'
  and cl.level_number=1
  and m.level_module_number=1
  and m.title='Breath, Alignment & Vocal Health'
  and m.status='published'
  and m.career_connection='Alignment, breath coordination, and healthy vocal production support reliable work for live performers, recording artists, voice actors, and other vocal creators.';

commit;
