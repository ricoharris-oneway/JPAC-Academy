-- READ ONLY. Piano Beginner Level 1 / Module 1 preflight.
-- Run in a read-only transaction and retain this output as the comparison baseline.
begin transaction read only;

select id,slug,title,description,module_count,total_xp,core_xp_total,status,created_at,updated_at
from public.courses where slug='piano';

select cl.* from public.course_levels cl join public.courses c on c.id=cl.course_id
where c.slug='piano' and cl.level_number=1 order by cl.id;

select m.* from public.course_modules m join public.courses c on c.id=m.course_id
left join public.course_levels cl on cl.id=m.course_level_id
where c.slug='piano' and (cl.level_number=1 or m.level_module_number=1 or m.sort_order=1 or m.title='Piano Posture and Hand Position')
order by m.sort_order,m.id;

select l.* from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id
where c.slug='piano' and (m.level_module_number=1 or m.title='Piano Posture and Hand Position') order by l.sort_order,l.id;

select a.* from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id
where c.slug='piano' and (m.level_module_number=1 or m.title='Piano Posture and Hand Position') order by a.title,a.id;

select e.id,e.student_id,e.course_id,e.level,e.status,e.progress,e.xp_earned,e.enrolled_at,e.updated_at,
  (e.status in('pending','active','paused','completed')) affected
from public.enrollments e join public.courses c on c.id=e.course_id
where c.slug='piano' and e.level=1 order by e.status,e.id;

-- Evidence/dependency inventory for every Piano Level 1 Module 1 candidate.
with target_modules as(
  select m.id from public.course_modules m join public.courses c on c.id=m.course_id
  left join public.course_levels cl on cl.id=m.course_level_id
  where c.slug='piano' and (cl.level_number=1 and m.level_module_number=1 or m.title='Piano Posture and Hand Position')
), target_lessons as(select id from public.lessons where module_id in(select id from target_modules)),
target_activities as(select id from public.activities where module_id in(select id from target_modules))
select
  'COUNT ONLY — supplemental; not proof of content preservation' evidence_scope,
  (select count(*) from public.lesson_progress where lesson_id in(select id from target_lessons)) lesson_progress,
  (select count(*) from public.submissions where activity_id in(select id from target_activities)) submissions,
  (select count(*) from public.practice_logs where activity_id in(select id from target_activities)) practice_logs,
  (select count(*) from public.activity_progress where activity_id in(select id from target_activities)) activity_progress,
  (select count(*) from public.portfolio_projects where activity_id in(select id from target_activities)) portfolio_projects,
  (select count(*) from public.curriculum_change_requests where module_id in(select id from target_modules) or lesson_id in(select id from target_lessons) or activity_id in(select id from target_activities)) change_requests,
  (select count(*) from public.curriculum_module_revisions where module_id in(select id from target_modules)) module_revisions,
  (select count(*) from public.course_progress where current_module_id in(select id from target_modules) or current_lesson_id in(select id from target_lessons)) current_progress_references,
  (select count(*) from public.xp_ledger where module_id in(select id from target_modules) or source_id in(select id from target_activities)) xp_ledger,
  (select count(*) from public.module_video_progress where module_id in(select id from target_modules)) module_video_progress,
  (select count(*) from public.module_instructional_media where module_id in(select id from target_modules)) instructional_media;

select
 'COUNT ONLY — supplemental; not proof of content preservation' evidence_scope,
 (select count(*) from public.lab_tool_courses ltc join public.courses c on c.id=ltc.course_id where c.slug='piano') piano_lab_bindings,
 (select count(*) from public.student_career_progress) student_career_progress_rows,
 (select count(*) from public.career_paths) career_path_rows,
 (select count(*) from public.career_milestones) career_milestone_rows;

select event_object_table,trigger_name,event_manipulation,action_timing,action_statement
from information_schema.triggers
where event_object_schema='public' and event_object_table in('course_levels','course_modules','lessons','activities','enrollments','xp_ledger','submissions')
order by event_object_table,trigger_name,event_manipulation;

select p.proname,md5(pg_get_functiondef(p.oid)) definition_hash
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in('jpac_module_completion','jpac_module_is_unlocked','jpac_finalize_module_mastery','jpac_sync_enrollment_progress','jpac_submit_module_activity','jpac_review_module_submission','jpac_assess_module_submission')
order by p.proname,p.oid;

-- Stable ordered preservation hashes. FULL CONTENT unless explicitly labelled COUNT ONLY.
select 'piano_course_full' set_name,md5(coalesce(string_agg(to_jsonb(c)::text,'|' order by c.id),'')) set_hash,count(*) row_count from public.courses c where c.slug='piano'
union all select 'piano_level1_enrollments_full',md5(coalesce(string_agg(to_jsonb(e)::text,'|' order by e.id),'')),count(*) from public.enrollments e join public.courses c on c.id=e.course_id where c.slug='piano' and e.level=1
union all select 'piano_level1_course_progress_full',md5(coalesce(string_agg(to_jsonb(cp)::text,'|' order by cp.enrollment_id),'')),count(*) from public.course_progress cp join public.enrollments e on e.id=cp.enrollment_id join public.courses c on c.id=e.course_id where c.slug='piano' and e.level=1
union all select 'career_paths_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.career_paths x
union all select 'career_milestones_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.career_milestones x
union all select 'student_career_progress_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.student_id,x.career_path_id),'')),count(*) from public.student_career_progress x;

select 'singing_course_full' set_name,md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')) set_hash,count(*) row_count from public.courses x where x.slug='singing'
union all select 'singing_levels_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.course_levels x join public.courses c on c.id=x.course_id where c.slug='singing'
union all select 'singing_modules_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.course_modules x join public.courses c on c.id=x.course_id where c.slug='singing'
union all select 'singing_lessons_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.lessons x join public.course_modules m on m.id=x.module_id join public.courses c on c.id=m.course_id where c.slug='singing'
union all select 'singing_activities_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.activities x join public.courses c on c.id=x.course_id where c.slug='singing'
union all select 'singing_media_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.module_instructional_media x join public.course_modules m on m.id=x.module_id join public.courses c on c.id=m.course_id where c.slug='singing'
union all select 'singing_enrollments_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.enrollments x join public.courses c on c.id=x.course_id where c.slug='singing'
union all select 'singing_progress_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.enrollment_id),'')),count(*) from public.course_progress x join public.courses c on c.id=x.course_id where c.slug='singing'
union all select 'singing_submissions_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.submissions x join public.activities a on a.id=x.activity_id join public.courses c on c.id=a.course_id where c.slug='singing'
union all select 'singing_xp_full',md5(coalesce(string_agg(to_jsonb(x)::text,'|' order by x.id),'')),count(*) from public.xp_ledger x join public.courses c on c.id=x.course_id where c.slug='singing';

-- Protected Singing baseline. Hashes are for manual pre/post comparison; this file writes no manifest.
select c.id course_id,c.status,c.module_count,c.total_xp,c.core_xp_total,
 'COUNT ONLY — supplemental; not proof of content preservation' evidence_scope,
 (select count(*) from public.course_levels where course_id=c.id) levels,
 (select count(*) from public.course_modules where course_id=c.id) modules,
 (select count(*) from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_id=c.id) lessons,
 (select count(*) from public.activities where course_id=c.id) activities,
 (select count(*) from public.enrollments where course_id=c.id) enrollments,
 (select count(*) from public.xp_ledger where course_id=c.id) xp_rows,
 md5(concat_ws('|',c.id::text,c.status,c.module_count::text,c.total_xp::text,c.core_xp_total::text,c.updated_at::text)) course_hash
from public.courses c where c.slug='singing';

select case
 when (select count(*) from public.courses where slug='piano')<>1 then 'FAIL: canonical Piano course missing or ambiguous'
 when exists(select 1 from public.enrollments e join public.courses c on c.id=e.course_id where c.slug='piano' and e.level=1 and e.status in('pending','active','paused','completed'))
   and not exists(select 1 from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=m.course_id where c.slug='piano' and cl.level_number=1 and m.level_module_number=1)
   then 'FAIL: creating a non-archived module would change an affected Level 1 denominator'
 else 'PASS/NEEDS EXACT COMPATIBILITY REVIEW: draft isolation enrollment gate satisfied'
end draft_isolation_finding;

with expected as(select jsonb_build_object('criteria',jsonb_build_array(
 jsonb_build_object('name','Technique and safe hand shape','weight',35,'bands',jsonb_build_object('exceeds','Consistently uses a natural, functional hand shape with flexible wrist and independently releases tension.','meets','Generally uses safe hand shape and wrist freedom with minor inconsistency.','developing','Shows partial technique; recurring tension or finger collapse affects control.','not_yet','Evidence is missing, substantially uncontrolled, or presents an unresolved safety concern.')),
 jsonb_build_object('name','Posture and body alignment','weight',25,'bands',jsonb_build_object('exceeds','Setup is balanced, supported, individualized, and consistently maintained.','meets','Setup is functional and generally balanced with minor alignment issues.','developing','Reaching, crowding, instability, or tension affects playing.','not_yet','Setup cannot be evaluated or does not yet support safe functional playing.')),
 jsonb_build_object('name','Finger control and five-finger pattern accuracy','weight',20,'bands',jsonb_build_object('exceeds','Pattern is accurate, clear, controlled, and reasonably even.','meets','Pattern is recognizable and mostly accurate with minor inconsistency.','developing','Repeated accuracy or control problems interrupt the pattern.','not_yet','Pattern evidence is absent or insufficient to evaluate.')),
 jsonb_build_object('name','Student reflection/self-awareness','weight',10,'bands',jsonb_build_object('exceeds','Specifically identifies a strength, adjustment, and useful next step.','meets','Identifies all required reflection elements with adequate understanding.','developing','Reflection is vague, incomplete, or weakly connected to the evidence.','not_yet','Reflection is absent or does not demonstrate meaningful self-awareness.')),
 jsonb_build_object('name','Preparation and submission completeness','weight',10,'bands',jsonb_build_object('exceeds','Evidence is complete, clear, and easy to review.','meets','Required evidence is present with minor clarity issues.','developing','One required component is incomplete or difficult to evaluate.','not_yet','Multiple components are absent or evidence cannot be reviewed reliably.')))) rubric),
target as(select c.id course_id,l.id level_id,m.id module_id from public.courses c left join public.course_levels l on l.course_id=c.id and l.level_number=1 left join public.course_modules m on m.course_level_id=l.id and m.level_module_number=1 where c.slug='piano'),
findings as(
 select 'CP-PIANO-COURSE' finding,case when (select count(*) from public.courses where slug='piano' and title='Piano')=1 then 'PASS' else 'FAIL: canonical identity missing, ambiguous, or renamed' end result
 union all select 'CP-ENROLLMENT-DENOMINATOR',case when exists(select 1 from public.enrollments e join public.courses c on c.id=e.course_id where c.slug='piano' and e.level=1 and e.status in('pending','active','paused','completed')) and not exists(select 1 from target where module_id is not null) then 'FAIL: insert would change an affected enrollment denominator' else 'PASS' end
 union all select 'CP-LEVEL1-COMPATIBILITY',case when not exists(select 1 from target where level_id is not null) then 'PASS: CREATE' when (select count(distinct level_id) from target where level_id is not null)=1 and exists(select 1 from public.course_levels l join target t on t.level_id=l.id where l.course_id=t.course_id and l.level_number=1 and l.title='Beginner' and l.description='Beginner Piano foundations. Draft review only.' and l.learning_objectives=array['Build healthy setup and foundational keyboard control.']::text[] and l.status='draft' and l.core_xp_target=6250 and l.review_notes='Piano Module 1 pilot; AI-PROPOSED content requires leadership and piano-teacher review.' and l.approved_by is null and l.approved_at is null) then 'PASS: EXACT REUSE' else 'FAIL: Level 1 is ambiguous or its payload conflicts' end
 union all select 'CP-MODULE1-COMPATIBILITY',case when not exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='piano' and (m.level_module_number=1 or m.sort_order=1 or m.title='Piano Posture and Hand Position')) then 'PASS: CREATE' when (select count(*) from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='piano' and (m.level_module_number=1 or m.sort_order=1 or m.title='Piano Posture and Hand Position'))=1 and exists(select 1 from public.course_modules m join target t on t.module_id=m.id where m.course_id=t.course_id and m.course_level_id=t.level_id and m.level_module_number=1 and m.sort_order=1 and m.title='Piano Posture and Hand Position' and m.description='Establish a balanced or adaptive setup, natural hand shape, relaxed wrists, and controlled five-finger movement.' and m.short_intro='Build a comfortable Piano setup before speed: align, relax, play slowly, observe, and adjust.' and m.status='draft' and m.xp_value=625 and m.core_xp=625 and m.intro_core_xp=50 and m.video_core_xp=100 and m.assignment_core_xp=350 and m.mastery_core_xp=125 and m.core_unlock_threshold=438 and m.bonus_xp_available=0 and m.primary_video_url is null and m.video_provider is null and m.video_title is null and m.video_duration_seconds is null and m.active_instructional_media_id is null and m.video_brief='NEEDS REVIEW: Validate source video accuracy, availability, licensing, captions, transcript quality, and alignment before creating media.' and m.aria_coaching_targets=jsonb_build_object('advisory_only',true,'targets',jsonb_build_array('posture','bench distance','curved fingers','relaxed wrists','finger independence','wrist tension','finger collapse','hand positioning','slow practice','confidence building'),'prohibited',jsonb_build_array('assess','approve evidence','award XP','grant mastery','unlock content','diagnose injury')) and m.lab_tool_id is null and m.jpac_tool_activity='{}'::jsonb and m.real_world_activity='{}'::jsonb and m.career_connection='' and m.career_mission_ideas='[]'::jsonb and not m.portfolio_moment and m.review_notes='AI-PROPOSED — leadership and piano-teacher review required. Media NEEDS REVIEW; tools NEEDS CATALOG REVIEW.' and m.approved_by is null and m.approved_at is null) then 'PASS: EXACT REUSE' else 'FAIL: Module 1 is ambiguous or its full payload conflicts' end
 union all select 'CP-CHILD-LESSONS',case when not exists(select 1 from target where module_id is not null) or not exists(select 1 from public.lessons l join target t on t.module_id=l.module_id) then 'PASS: CREATE' when (select count(*) from public.lessons l join target t on t.module_id=l.module_id)=3 and (select count(*) from public.lessons l join target t on t.module_id=l.module_id where l.status='draft' and l.lesson_type='interactive' and l.xp_value=0 and l.wix_lesson_id is null and l.wix_lesson_url is null and ((l.sort_order=1 and l.duration_minutes=20 and l.title='Bench and Body Alignment' and l.description='Set up the bench or adaptive playing position so your body feels supported, flexible, and ready to move.' and l.short_summary='Build a stable and comfortable playing setup.' and l.learning_objective='Establish supported seating, appropriate keyboard distance, relaxed shoulders, and functional arm alignment.' and l.content_blocks=jsonb_build_array('Sit near the front of the bench or use an approved adaptive position.','Support both feet or use an appropriate foot support.','Adjust distance so elbows can move without reaching or crowding.','Keep the spine tall but flexible and release shoulders, neck, and jaw.','Make one intentional setup adjustment and explain why it helped.') and l.technique_cues=array['Shoulders away from ears','Elbows have room to move','Supported, not stiff','Stop and contact staff if playing causes pain']::text[] and l.common_mistakes=array['Reaching for the keyboard','Crowding the keyboard','Raised shoulders','Rigid posture']::text[] and l.self_check='Can you name one setup adjustment that improved comfort or balance?' and l.resource_brief='AI-PROPOSED. Alternatives: wheelchair or adaptive seating, foot support, photographs with narration, live teacher demonstration, or assistive communication.') or (l.sort_order=2 and l.duration_minutes=20 and l.title='Curved Fingers and Relaxed Wrists' and l.description='Practice a natural hand shape, flexible wrist, and gentle controlled key presses.' and l.short_summary='Use natural hand shape without unnecessary tension.' and l.learning_objective='Establish a functional finger curve, flexible wrist, relaxed thumb, and controlled press-and-release motion.' and l.content_blocks=jsonb_build_array('Observe the hand natural resting shape.','Place five fingers on neighboring white keys without pressing.','Press and release one key at a time.','Pause after each sequence and release the wrist.','Name one sign of tension and one reset strategy.') and l.technique_cues=array['Natural rather than forced curve','Flexible wrist','Release after each note','Slow down when joints collapse']::text[] and l.common_mistakes=array['Forced finger curve','Rigid or collapsed wrist','Tucked rigid thumb','Excessive finger lifting']::text[] and l.self_check='What tension sign did you notice, and how did you reset?' and l.resource_brief='AI-PROPOSED. Alternatives: approved individual hand position, one hand, fewer notes, adaptive keyboard, live or narrated evidence.') or (l.sort_order=3 and l.duration_minutes=25 and l.title='Five-Finger Technique Check' and l.description='Combine setup and hand technique in a slow five-note pattern with each hand separately.' and l.short_summary='Apply balanced setup to a controlled five-finger pattern.' and l.learning_objective='Play an approved five-note pattern with functional posture, hand shape, wrist freedom, note-order accuracy, and self-awareness.' and l.content_blocks=jsonb_build_array('Place one hand over an approved five-note pattern such as C-D-E-F-G.','Play upward and downward slowly.','Pause and release tension before repeating with the other hand.','Use about 60 BPM only when it supports relaxed control.','Identify one strength and one next improvement.') and l.technique_cues=array['Control before speed','Clear even notes','Pause and reset','Hands separate first']::text[] and l.common_mistakes=array['Rushing to match the metronome','Continuing through tension','Finger collapse','Unplanned restart']::text[] and l.self_check='What improved between your first and second controlled attempt?' and l.resource_brief='AI-PROPOSED. Alternatives: fewer notes, one hand, adapted controller, audio plus teacher-observed setup, or counted pulse without metronome.')))=3 then 'PASS: EXACT REUSE' else 'FAIL: lesson set or instructional payload conflict' end
 union all select 'CP-ACTIVITIES',case when not exists(select 1 from target where module_id is not null) or not exists(select 1 from public.activities a join target t on t.module_id=a.module_id) then 'PASS: CREATE' when (select count(*) from public.activities a join target t on t.module_id=a.module_id)=2 and exists(select 1 from public.activities a join target t on t.module_id=a.module_id where a.course_id=t.course_id and a.lesson_id is null and a.title='Guided Piano Setup Practice' and a.description='Low-pressure preparation before the assessed challenge.' and a.activity_type='practice' and a.instructions='Check the bench or adaptive position, body alignment, natural hand shape, and wrist. Play the approved five-finger pattern with each hand separately. Identify one strength, make one adjustment, and repeat. No submission is required.' and a.submission_type='none' and a.xp_reward=0 and a.estimated_minutes=20 and a.xp_type='bonus' and not a.required and a.status='draft' and a.rubric='{}'::jsonb and a.skill_tags=array['piano setup','posture','hand position','five-finger pattern']::text[] and a.ai_summary='AI-PROPOSED; optional, non-progressive, and non-assessed.' and a.passing_score=70 and a.allows_resubmission and not a.portfolio_candidate and not a.certificate_eligible) and exists(select 1 from public.activities a join target t on t.module_id=a.module_id cross join expected e where a.course_id=t.course_id and a.lesson_id is null and a.title='Balanced Piano Setup Challenge' and a.description='Demonstrate a balanced or adaptive setup and controlled beginner five-finger technique.' and a.activity_type='performance' and a.instructions='Submit JPAC video evidence showing or explaining your playing position and keyboard distance, natural hand shape, flexible wrist, and two upward/downward repetitions of an approved five-finger pattern with each hand separately unless an accommodation is approved. Include one strength, one adjustment, and one next improvement. Allowed alternatives through existing teacher review include live demonstration, multiple short angles, photographs plus audio, audio plus teacher-observed setup, adapted keyboard, or one-hand evidence. Stop and contact staff if playing causes pain.' and a.submission_type='video' and a.xp_reward=350 and a.estimated_minutes=30 and a.xp_type='core' and a.required and a.status='draft' and a.passing_score=70 and a.allows_resubmission and a.rubric=e.rubric and a.skill_tags=array['piano setup','posture','hand position','wrist freedom','five-finger pattern','self-reflection']::text[] and a.ai_summary='AI-PROPOSED — teacher review required. ARIA cannot assess, approve, award XP, grant mastery, or unlock content.' and not a.portfolio_candidate and not a.certificate_eligible) then 'PASS: EXACT REUSE' else 'FAIL: activity set, instructions, assessment, or rubric conflict' end
 union all select 'CP-DRAFT-ISOLATION',case when exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='piano' and (m.level_module_number=1 or m.sort_order=1 or m.title='Piano Posture and Hand Position') and m.status<>'draft') or exists(select 1 from public.lessons l join target t on t.module_id=l.module_id where l.status<>'draft') or exists(select 1 from public.activities a join target t on t.module_id=a.module_id where a.status<>'draft') then 'FAIL: existing candidate is not draft' else 'PASS' end
)
select finding,result from findings
union all
select 'CP-OVERALL',case when exists(select 1 from findings where result like 'FAIL:%') then 'FAIL: one or more prerequisite findings failed' else 'PASS: READY FOR GUARDED MIGRATION REVIEW' end;

rollback;
