select c.slug,cl.level_number,cl.title,cl.status,count(distinct m.id) modules,count(distinct l.id) lessons,count(distinct a.id) activities from public.courses c join public.course_levels cl on cl.course_id=c.id left join public.course_modules m on m.course_level_id=cl.id left join public.lessons l on l.module_id=m.id left join public.activities a on a.lesson_id=l.id where c.slug='singing' group by c.slug,cl.level_number,cl.title,cl.status order by cl.level_number;
select p.id,p.email,p.first_name,p.last_name,p.full_name,p.display_name from public.profiles p where p.display_name is null or p.email is null or lower(coalesce(p.display_name,'')) in(lower(p.email),lower(split_part(p.email,'@',1)));
select c.relname as table_name,p.polname,pg_get_expr(p.polqual,p.polrelid) using_expression
from pg_policy p join pg_class c on c.oid=p.polrelid
where p.polrelid in('public.course_levels'::regclass,'public.course_modules'::regclass,'public.lessons'::regclass)
order by c.relname,p.polname;
select count(*)=4 as has_four_singing_levels from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug='singing';
select count(*)=2 as pilot_has_two_modules from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=cl.course_id where c.slug='singing' and cl.level_number=1 and m.status='published';
select count(*)=4 as pilot_has_four_lessons from public.lessons l join public.course_modules m on m.id=l.module_id join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=cl.course_id where c.slug='singing' and cl.level_number=1 and l.status='published';
select bool_and(status='draft') as upper_levels_remain_draft from public.course_levels cl join public.courses c on c.id=cl.course_id where c.slug='singing' and cl.level_number between 2 and 4;
-- As enrolled student: select * from public.course_levels where course_id='<singing uuid>';
-- As unenrolled student: the same query and direct module/lesson reads must return no rows.
