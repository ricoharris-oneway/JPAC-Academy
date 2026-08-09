-- Curriculum and exact Core XP model.
select c.slug,c.core_xp_total,count(m.id) module_count,sum(m.core_xp) curriculum_core_xp
from public.courses c left join public.course_modules m on m.course_id=c.id
where c.slug='singing' group by c.slug,c.core_xp_total;
select cl.level_number,cl.title,cl.status,count(m.id) modules,sum(m.core_xp) core_xp
from public.course_levels cl join public.courses c on c.id=cl.course_id left join public.course_modules m on m.course_level_id=cl.id
where c.slug='singing' group by cl.level_number,cl.title,cl.status order by cl.level_number;
select count(*) filter(where status='published') published_modules,count(*) filter(where status in('draft','review','approved')) unpublished_modules from public.course_modules where course_id=(select id from public.courses where slug='singing');
select count(*)=4 as exactly_four_levels from public.course_levels where course_id=(select id from public.courses where slug='singing');
select bool_and(module_count=10) and count(*)=4 as exactly_ten_modules_per_level from(select cl.id,count(m.id) module_count from public.course_levels cl left join public.course_modules m on m.course_level_id=cl.id where cl.course_id=(select id from public.courses where slug='singing') group by cl.id)s;
select count(*)=40 as exactly_forty_modules,bool_and(core_xp=625) as every_module_625_core_xp,sum(core_xp)=25000 as exactly_25000_core_xp,bool_and(core_unlock_threshold=438) as every_threshold_is_438,bool_and(intro_core_xp=50 and video_core_xp=100 and assignment_core_xp=350 and mastery_core_xp=125) as exact_component_distribution from public.course_modules where course_id=(select id from public.courses where slug='singing');
select coalesce(sum(m.jpac_tool_bonus_xp+m.real_world_bonus_xp),0) bonus_opportunity_xp,coalesce(sum(m.core_xp),0) canonical_core_xp from public.course_modules m where m.course_id=(select id from public.courses where slug='singing');
select bool_and(practice_count>=2) as published_modules_have_two_bonus_practices from(select m.id,count(a.id) practice_count from public.course_modules m left join public.activities a on a.module_id=m.id and a.status='published' and a.xp_type='bonus' and a.activity_type='practice' where m.course_id=(select id from public.courses where slug='singing') and m.status='published' group by m.id)s;
select count(*) filter(where status='published')=2 and count(*) filter(where status<>'published')=38 as published_pilot_preserved_and_new_modules_unpublished from public.course_modules where course_id=(select id from public.courses where slug='singing');

-- Existing records remain intact and attempts can coexist.
select count(*) submissions,count(distinct(student_id,activity_id)) student_activities,max(attempt_number) max_attempt from public.submissions;
select xp_type,count(*),coalesce(sum(amount),0) amount from public.xp_ledger group by xp_type order by xp_type;
select student_id,module_id,metadata->>'component' component,count(*) awards from public.xp_ledger where xp_type='core' and metadata ? 'component' group by student_id,module_id,metadata->>'component' having count(*)>1;
select student_id,source_id,count(*) awards from public.xp_ledger where xp_type='core' and metadata->>'component'='assignment' group by student_id,source_id having count(*)>1;

-- Actual RLS and function privileges.
select c.relname,p.polname,pg_get_expr(p.polqual,p.polrelid) using_expression,pg_get_expr(p.polwithcheck,p.polrelid) check_expression from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname in('course_modules','lessons','activities','submissions','module_video_progress') order by c.relname,p.polname;
select p.oid::regprocedure function_name,has_function_privilege('anon',p.oid,'execute') anon_execute,has_function_privilege('authenticated',p.oid,'execute') authenticated_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_record_module_video_progress','jpac_module_completion','jpac_module_is_unlocked','jpac_review_module_submission','curriculum_transition_module','jpac_submit_module_activity','jpac_complete_bonus_activity','jpac_complete_module_intro','jpac_award_module_core_component','jpac_finalize_module_mastery') order by 1;

-- Server definitions must visibly retain the non-bypass conditions.
select p.proname,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_module_completion','jpac_module_is_unlocked','jpac_review_module_submission');

-- Run as the enrolled Singing student, substituting real UUIDs.
-- select * from public.jpac_module_completion(auth.uid(),'<module uuid>');
-- select public.jpac_module_is_unlocked('<module 2 uuid>',auth.uid());
-- Direct select of a locked module, its lessons, and activities must return zero rows.
-- Repeat as an unenrolled student: Singing levels/modules/lessons/activities return zero rows.
-- Attempt target_student='<other student uuid>' in jpac_module_completion: must raise Not authorized.
-- Attempt insert/update against another student's module_video_progress/submissions: must fail RLS.
-- With only Bonus XP ledger rows present, jpac_module_completion must report core_xp_earned=0 and is_complete=false.
-- With video_percent<90 or any required score<70, is_complete must remain false.
