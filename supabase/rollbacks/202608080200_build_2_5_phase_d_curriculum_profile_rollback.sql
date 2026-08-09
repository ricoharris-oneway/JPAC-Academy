begin;
drop policy if exists "entitled modules readable" on public.course_modules;
create policy "entitled modules readable" on public.course_modules for select to authenticated using(status='published' and public.jpac_student_has_course_access(course_id));
drop policy if exists "entitled lessons readable" on public.lessons;
create policy "entitled lessons readable" on public.lessons for select to authenticated using(status='published' and exists(select 1 from public.course_modules m where m.id=module_id and public.jpac_student_has_course_access(m.course_id)));
-- Preserve profile names and pilot curriculum data. Roll back student level visibility only.
drop policy if exists "enrolled students read published course levels" on public.course_levels;
update public.course_levels set status='draft',approved_at=null where course_id=(select id from public.courses where slug='singing');
update public.course_modules set status='draft' where course_level_id in(select id from public.course_levels where course_id=(select id from public.courses where slug='singing'));
update public.lessons set status='draft' where module_id in(select id from public.course_modules where course_level_id in(select id from public.course_levels where course_id=(select id from public.courses where slug='singing')));
update public.activities set status='draft' where course_id=(select id from public.courses where slug='singing') and title in('Five-Day Healthy Warm-Up Log','Level 1 Foundation Performance');
commit;
