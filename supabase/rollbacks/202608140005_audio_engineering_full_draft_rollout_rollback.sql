-- JPAC Audio Engineering 48-module draft rollout rollback. Removes exact batch-created rows only.
begin;
do $$
declare v_course uuid; v_marker constant text:='Audio Engineering full draft rollout 202608140005'; v_count int;
begin
 if (select count(*) from public.courses where slug='audio-engineering')<>1 then raise exception 'Expected exactly one canonical audio-engineering course'; end if;
 select id into v_course from public.courses where slug='audio-engineering' for share;
 if exists(select 1 from public.enrollments where course_id=v_course)
 or exists(select 1 from public.submissions s join public.activities a on a.id=s.activity_id where a.course_id=v_course)
 or exists(select 1 from public.lesson_progress p join public.lessons l on l.id=p.lesson_id join public.course_modules m on m.id=l.module_id where m.course_id=v_course)
 or exists(select 1 from public.activity_progress p join public.activities a on a.id=p.activity_id where a.course_id=v_course)
 or exists(select 1 from public.practice_logs p join public.activities a on a.id=p.activity_id where a.course_id=v_course)
 or exists(select 1 from public.xp_ledger where course_id=v_course)
 or exists(select 1 from public.certificates where course_id=v_course)
 or exists(select 1 from public.portfolio_projects p join public.activities a on a.id=p.activity_id where a.course_id=v_course)
 or exists(select 1 from public.module_video_progress p join public.course_modules m on m.id=p.module_id where m.course_id=v_course)
 or exists(select 1 from public.module_instructional_media p join public.course_modules m on m.id=p.module_id where m.course_id=v_course)
 or exists(select 1 from public.lab_tool_courses where course_id=v_course)
 or exists(select 1 from public.course_progress where course_id=v_course)
 or exists(select 1 from public.curriculum_module_revisions r join public.course_modules m on m.id=r.module_id where m.course_id=v_course)
 or exists(select 1 from public.curriculum_change_requests r join public.course_modules m on m.id=r.module_id where m.course_id=v_course)
 or exists(select 1 from public.curriculum_assignment_swap_operations where target_course_id=v_course)
 then raise exception 'Audio Engineering dependency blocks rollback'; end if;
 select count(*) into v_count from public.course_modules where course_id=v_course and review_notes like v_marker||';%';
 if exists(select 1 from public.course_modules m where m.course_id=v_course and m.review_notes like v_marker||';%' and (m.status<>'draft' or m.sort_order not between 1 and 48 or m.level_module_number not between 1 and 12 or m.core_xp<>625 or m.intro_core_xp<>50 or m.video_core_xp<>100 or m.assignment_core_xp<>350 or m.mastery_core_xp<>125 or m.core_unlock_threshold<>438 or m.lab_tool_id is not null or m.active_instructional_media_id is not null or m.primary_video_url is not null or m.approved_by is not null or m.approved_at is not null or (select count(*) from public.lessons where module_id=m.id)<>3 or (select count(*) from public.lessons where module_id=m.id and status='draft' and xp_value=0)<>3 or (select count(*) from public.activities where module_id=m.id)<>2 or (select count(*) from public.activities where module_id=m.id and status='draft' and activity_type='practice' and not required and xp_reward=0 and xp_type='bonus')<>1 or (select count(*) from public.activities where module_id=m.id and status='draft' and activity_type='performance' and required and xp_reward=350 and xp_type='core' and passing_score=70 and allows_resubmission and jsonb_array_length(rubric->'criteria')=5 and (select sum((x->>'weight')::int) from jsonb_array_elements(rubric->'criteria') x)=100)<>1)) then raise exception 'Batch-marked Audio Engineering payload no longer matches approved rollout'; end if;
 delete from public.activities where module_id in(select id from public.course_modules where course_id=v_course and review_notes like v_marker||';%');
 delete from public.lessons where module_id in(select id from public.course_modules where course_id=v_course and review_notes like v_marker||';%');
 delete from public.course_modules where course_id=v_course and review_notes like v_marker||';%';
 delete from public.course_levels l where l.course_id=v_course and l.review_notes=v_marker||'; batch-created level; canonical 12-module level.' and not exists(select 1 from public.course_modules m where m.course_level_id=l.id);
 raise notice 'Removed % exact batch-created Audio Engineering modules; compatible pre-existing rows preserved',v_count;
end $$;
commit;
