-- Build 2.1 / Stage 2 rollback.
-- Restores the exact curriculum read and lesson-progress write intent that
-- existed before entitlement enforcement. No application data is modified.

drop policy if exists "entitled courses readable" on public.courses;
drop policy if exists "published courses readable" on public.courses;
create policy "published courses readable" on public.courses
for select using(status='published');

drop policy if exists "entitled modules readable" on public.course_modules;
drop policy if exists "published modules readable" on public.course_modules;
create policy "published modules readable" on public.course_modules
for select using(status='published' or public.is_staff());

drop policy if exists "entitled lessons readable" on public.lessons;
drop policy if exists "published lessons readable" on public.lessons;
create policy "published lessons readable" on public.lessons
for select using(status='published' or public.is_staff());

drop policy if exists "lesson progress own insert" on public.lesson_progress;
create policy "lesson progress own insert" on public.lesson_progress
for insert with check(student_id=auth.uid() or public.is_staff());

drop policy if exists "lesson progress own or staff update" on public.lesson_progress;
create policy "lesson progress own or staff update" on public.lesson_progress
for update
using(student_id=auth.uid() or public.is_staff())
with check(student_id=auth.uid() or public.is_staff());
