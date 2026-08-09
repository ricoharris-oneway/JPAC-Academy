begin transaction read only;

-- Result 1: canonical Beginner Singing modules.
select m.id as module_uuid,m.level_module_number as module_number,m.title,m.status,
       m.core_xp,m.core_unlock_threshold
from public.course_modules m
join public.course_levels cl on cl.id=m.course_level_id
join public.courses c on c.id=m.course_id
where c.slug='singing' and cl.level_number=1
order by m.level_module_number,m.id;

-- Result 2: every physical Beginner lesson and its curriculum classification.
select m.level_module_number as module_number,m.title as module_title,l.id as lesson_uuid,
       l.title as lesson_title,l.sort_order,l.status,
       case
         when m.level_module_number=2 and l.title in('Pitch Matching and Listening','Foundation Performance') then 'LEGACY/HISTORICAL'
         when l.status in('draft','review','approved') or l.sort_order between 101 and 103 then 'STAGED'
         else 'CURRENT'
       end as curriculum_classification
from public.lessons l
join public.course_modules m on m.id=l.module_id
join public.course_levels cl on cl.id=m.course_level_id
join public.courses c on c.id=m.course_id
where c.slug='singing' and cl.level_number=1
order by m.level_module_number,l.sort_order,l.id;

-- Result 3: expected E3 lesson manifest. Missing rows remain visible.
with expected(module_number,lesson_number,lesson_title) as(values
 (1,1,'Singer Alignment and Breath'),(1,2,'Healthy Warm-Up Routine'),(1,3,'Vocal Health for Real Creators'),
 (2,1,'Speaking Into Song'),(2,2,'Comfortable Range and Tension Awareness'),(2,3,'Natural Tone and Healthy Onset'),
 (3,1,'Listen Before You Sing'),(3,2,'Stable Notes and Simple Intervals'),(3,3,'Correct Your Own Melody'),
 (4,1,'Find the Pulse'),(4,2,'Entrances, Durations and Releases'),(4,3,'Build the Groove'),
 (5,1,'Where Tone Resonates'),(5,2,'Bright, Dark and Balanced Color'),(5,3,'Choose Tone for the Lyric'),
 (6,1,'Clear Words Without Overworking'),(6,2,'Phrase the Story'),(6,3,'Make Them Believe You'),
 (7,1,'Control Soft and Strong Singing'),(7,2,'Shape a Phrase With Dynamics'),(7,3,'Interpret One Chorus Three Ways'),
 (8,1,'Microphone and Phone Placement'),(8,2,'Prepare a Clean Recording Space'),(8,3,'Record, Review and Choose a Take'),
 (9,1,'Prepare to Perform'),(9,2,'Presence, Focus and Connection'),(9,3,'Recover and Keep Going'),
 (10,1,'Plan Your Beginner Showcase'),(10,2,'Dress Rehearsal and Self-Review'),(10,3,'Record the JPAC Beginner Showcase')
), beginner_modules as(
 select m.* from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=m.course_id
 where c.slug='singing' and cl.level_number=1
)
select e.module_number,e.lesson_number,e.lesson_title,l.id as lesson_uuid,l.sort_order,l.status,
       case when l.id is null then 'MISSING' else 'EXISTS' end as audit_result
from expected e left join beginner_modules m on m.level_module_number=e.module_number
left join public.lessons l on l.module_id=m.id and l.title=e.lesson_title
order by e.module_number,e.lesson_number,l.id;

-- Result 4: curriculum lesson totals, including the two retained legacy rows.
with beginner_lessons as(
 select m.level_module_number,l.* from public.lessons l join public.course_modules m on m.id=l.module_id
 join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=m.course_id
 where c.slug='singing' and cl.level_number=1
)
select count(*) filter(where not(level_module_number=2 and title in('Pitch Matching and Listening','Foundation Performance'))) as current_or_staged_lessons,
       count(*) filter(where level_module_number=2 and title in('Pitch Matching and Listening','Foundation Performance')) as retained_legacy_lessons,
       count(*) as physical_lesson_rows
from beginner_lessons;

-- Result 5: every physical Beginner activity. No submission or student data is returned.
select a.id as activity_uuid,m.level_module_number as module_number,a.title,a.activity_type,a.status,
       a.xp_type,a.xp_reward,a.required,a.passing_score,a.rubric,
       case
         when a.title='Breath Control Studio Challenge' and a.status='published'
              and jsonb_typeof(a.rubric->'criteria')='array'
              and jsonb_typeof((a.rubric->'criteria')->0)='string' then 'LEGACY PUBLISHED ACTIVITY'
         when a.status in('draft','review','approved') then 'E3 STAGED ACTIVITY'
         else 'CURRENT ACTIVITY'
       end as activity_classification
from public.activities a
join public.course_modules m on m.id=a.module_id
join public.course_levels cl on cl.id=m.course_level_id
join public.courses c on c.id=m.course_id
where c.slug='singing' and cl.level_number=1
order by m.level_module_number,a.required desc,a.title,a.id;

-- Result 6: all ten expected E3 Core Creative Challenges and rubric validation.
with expected(module_number,challenge_title) as(values
 (1,'Breath Control Studio Challenge'),(2,'Find Your Sound Challenge'),(3,'Nail the Melody'),
 (4,'Lock Into the Groove'),(5,'Three Colors of Your Voice'),(6,'Make Them Believe You'),
 (7,'Sing It Three Ways'),(8,'Studio Ready Take'),(9,'One Take Performance'),(10,'JPAC Beginner Showcase')
), beginner_modules as(
 select m.* from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=m.course_id
 where c.slug='singing' and cl.level_number=1
), matches as(
 select e.module_number,e.challenge_title,a.id,a.status,a.xp_type,a.xp_reward,a.required,a.passing_score,a.rubric
 from expected e left join beginner_modules m on m.level_module_number=e.module_number
 left join public.activities a on a.module_id=m.id and a.title=e.challenge_title and a.required and a.xp_type='core'
)
select x.module_number,x.challenge_title,x.id as activity_uuid,x.status,x.xp_reward,x.required,x.passing_score,
       case when jsonb_typeof(x.rubric->'criteria')='array' then
         (select sum(case when jsonb_typeof(r)='object' and r ? 'weight' then (r->>'weight')::numeric else null end)
          from jsonb_array_elements(x.rubric->'criteria') r) end as rubric_total,
       case when jsonb_typeof(x.rubric->'criteria')='array' then jsonb_array_length(x.rubric->'criteria') else 0 end as criterion_count,
       case when x.id is null then 'MISSING'
            when x.xp_reward=350 and x.passing_score=70 and
                 (select coalesce(sum(case when jsonb_typeof(r)='object' and r ? 'weight' then (r->>'weight')::numeric else null end),0)
                  from jsonb_array_elements(coalesce(x.rubric->'criteria','[]'::jsonb)) r)=100 then 'VALID'
            else 'PRESENT_BUT_INVALID' end as audit_result
from matches x order by x.module_number,x.id;

-- Result 7: all twenty expected E3 Bonus practices. Missing rows remain visible.
with expected(module_number,practice_kind,practice_title) as(values
 (1,'REAL','Before-and-After Breath Challenge'),(1,'LAB','Breath Cycle Comparison Lab'),
 (2,'REAL','Three Versions, One Authentic Voice'),(2,'LAB','Natural Tone Comparison Lab'),
 (3,'REAL','First Take / Final Take Melody'),(3,'LAB','Pitch Match Lab'),
 (4,'REAL','Lock Into the Backing Track'),(4,'LAB','Rhythm Match Lab'),
 (5,'REAL','Three Colors of One Phrase'),(5,'LAB','Tone Color Lab'),
 (6,'REAL','Tell the Lyric Story'),(6,'LAB','Lyric Clarity Lab'),
 (7,'REAL','Three Dynamic Interpretations'),(7,'LAB','Dynamics Comparison Lab'),
 (8,'REAL','Phone or Microphone Placement Test'),(8,'LAB','Recording Setup Lab'),
 (9,'REAL','No-Stop Performance Run'),(9,'LAB','Performance Review Lab'),
 (10,'REAL','Showcase Dress Rehearsal'),(10,'LAB','Showcase Review Lab')
), beginner_modules as(
 select m.* from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=m.course_id
 where c.slug='singing' and cl.level_number=1
)
select e.module_number,e.practice_kind,e.practice_title,a.id as activity_uuid,a.status,a.xp_type,a.xp_reward,a.required,
       case when a.id is null then 'MISSING'
            when a.xp_type='bonus' and a.xp_reward=50 and not a.required then 'VALID'
            else 'PRESENT_BUT_INVALID' end as audit_result
from expected e left join beginner_modules m on m.level_module_number=e.module_number
left join public.activities a on a.module_id=m.id and a.title=e.practice_title
order by e.module_number,e.practice_kind,a.id;

-- Result 8: non-publication authoring metadata coverage.
select m.level_module_number as module_number,m.title,m.status,
       nullif(trim(m.short_intro),'') is not null as mission_brief_populated,
       nullif(trim(m.video_brief),'') is not null as video_brief_populated,
       case when jsonb_typeof(m.aria_coaching_targets->'evidence_targets')='array'
         then jsonb_array_length(m.aria_coaching_targets->'evidence_targets')>0 else false end as aria_evidence_targets_populated,
       nullif(trim(m.career_connection),'') is not null as career_connection_populated,
       case when jsonb_typeof(m.career_mission_ideas)='array' then jsonb_array_length(m.career_mission_ideas)>0 else false end as career_mission_ideas_populated,
       (m.portfolio_ready_threshold is not null or m.portfolio_moment) as portfolio_configuration_populated,
       m.jpac_tool_activity<>'{}'::jsonb as jpac_lab_authoring_metadata_populated,
       m.lab_tool_id is not null as real_lab_tool_assigned,
       m.primary_video_url is not null as real_video_url_assigned
from public.course_modules m
join public.course_levels cl on cl.id=m.course_level_id
join public.courses c on c.id=m.course_id
where c.slug='singing' and cl.level_number=1
order by m.level_module_number;

-- Result 9: aggregate historical safety counts only; no PII or evidence content.
select (select count(*) from public.lesson_progress) as lesson_progress_rows,
       (select count(*) from public.submissions) as submission_rows,
       (select count(*) from public.xp_ledger) as xp_ledger_rows,
       (select count(*) from public.enrollments) as enrollment_rows;

-- Result 10 (final): exactly one database-state classification.
with expected_lessons(module_number,title) as(values
 (1,'Singer Alignment and Breath'),(1,'Healthy Warm-Up Routine'),(1,'Vocal Health for Real Creators'),(2,'Speaking Into Song'),(2,'Comfortable Range and Tension Awareness'),(2,'Natural Tone and Healthy Onset'),(3,'Listen Before You Sing'),(3,'Stable Notes and Simple Intervals'),(3,'Correct Your Own Melody'),(4,'Find the Pulse'),(4,'Entrances, Durations and Releases'),(4,'Build the Groove'),(5,'Where Tone Resonates'),(5,'Bright, Dark and Balanced Color'),(5,'Choose Tone for the Lyric'),(6,'Clear Words Without Overworking'),(6,'Phrase the Story'),(6,'Make Them Believe You'),(7,'Control Soft and Strong Singing'),(7,'Shape a Phrase With Dynamics'),(7,'Interpret One Chorus Three Ways'),(8,'Microphone and Phone Placement'),(8,'Prepare a Clean Recording Space'),(8,'Record, Review and Choose a Take'),(9,'Prepare to Perform'),(9,'Presence, Focus and Connection'),(9,'Recover and Keep Going'),(10,'Plan Your Beginner Showcase'),(10,'Dress Rehearsal and Self-Review'),(10,'Record the JPAC Beginner Showcase')
), expected_activities(module_number,title,kind) as(values
 (1,'Before-and-After Breath Challenge','bonus'),(1,'Breath Cycle Comparison Lab','bonus'),(1,'Breath Control Studio Challenge','core'),(2,'Three Versions, One Authentic Voice','bonus'),(2,'Natural Tone Comparison Lab','bonus'),(2,'Find Your Sound Challenge','core'),(3,'First Take / Final Take Melody','bonus'),(3,'Pitch Match Lab','bonus'),(3,'Nail the Melody','core'),(4,'Lock Into the Backing Track','bonus'),(4,'Rhythm Match Lab','bonus'),(4,'Lock Into the Groove','core'),(5,'Three Colors of One Phrase','bonus'),(5,'Tone Color Lab','bonus'),(5,'Three Colors of Your Voice','core'),(6,'Tell the Lyric Story','bonus'),(6,'Lyric Clarity Lab','bonus'),(6,'Make Them Believe You','core'),(7,'Three Dynamic Interpretations','bonus'),(7,'Dynamics Comparison Lab','bonus'),(7,'Sing It Three Ways','core'),(8,'Phone or Microphone Placement Test','bonus'),(8,'Recording Setup Lab','bonus'),(8,'Studio Ready Take','core'),(9,'No-Stop Performance Run','bonus'),(9,'Performance Review Lab','bonus'),(9,'One Take Performance','core'),(10,'Showcase Dress Rehearsal','bonus'),(10,'Showcase Review Lab','bonus'),(10,'JPAC Beginner Showcase','core')
), beginner_modules as(
 select m.* from public.course_modules m join public.course_levels cl on cl.id=m.course_level_id join public.courses c on c.id=m.course_id where c.slug='singing' and cl.level_number=1
), evidence as(
 select
   (select count(*) from expected_lessons e join beginner_modules m on m.level_module_number=e.module_number join public.lessons l on l.module_id=m.id and l.title=e.title) as lesson_matches,
   (select count(*) from expected_activities e join beginner_modules m on m.level_module_number=e.module_number join public.activities a on a.module_id=m.id and a.title=e.title and a.xp_type=e.kind and a.status in('draft','review','approved')) as activity_matches,
   (select count(*) from beginner_modules where nullif(trim(video_brief),'') is not null) as video_brief_matches,
   (select count(*) from beginner_modules where case when jsonb_typeof(aria_coaching_targets->'evidence_targets')='array' then jsonb_array_length(aria_coaching_targets->'evidence_targets')>0 else false end) as aria_matches
)
select case
  when lesson_matches=30 and activity_matches=30 and video_brief_matches=10 and aria_matches=10 then 'E3_FULLY_STAGED'
  when lesson_matches>2 or activity_matches>0 or video_brief_matches>0 or aria_matches>0 then 'E3_PARTIALLY_STAGED'
  else 'E3_NOT_STAGED'
end as database_state_classification,
lesson_matches||'/30 expected E3 lessons; '||activity_matches||'/30 expected E3 activities; '||video_brief_matches||'/10 video briefs; '||aria_matches||'/10 ARIA evidence targets.' as evidence
from evidence;

rollback;
