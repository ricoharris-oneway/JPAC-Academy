-- PREPARED ONLY. Do not apply without explicit production-write approval.
-- Completes missing non-video metadata for nine non-Singing courses.
-- Does not publish curriculum or touch video, XP, access, or academic records.

begin;

do $preflight$
declare
  target_slugs constant text[] := array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'];
  excluded_module constant uuid := 'b94c8524-9715-4020-8075-5588b6fcce62';
  actual bigint;
  actual_hash text;
begin
  select count(*) into actual from public.courses where slug=any(target_slugs);
  if actual<>9 then raise exception 'Wave 1 expected 9 target courses; found %',actual; end if;
  select count(*) into actual from public.courses where slug=any(target_slugs) and status<>'published';
  if actual<>0 then raise exception 'Wave 1 course status baseline changed'; end if;
  if not exists(select 1 from public.course_modules where id=excluded_module and title='Save Draft Test Module' and status='draft') then raise exception 'Excluded Piano test module baseline changed'; end if;

  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(target_slugs) and m.id<>excluded_module;
  if actual<>432 then raise exception 'Wave 1 expected 432 included modules; found %',actual; end if;
  select count(*) into actual from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where c.slug=any(target_slugs) and m.id<>excluded_module;
  if actual<>1296 then raise exception 'Wave 1 expected 1296 included lessons; found %',actual; end if;
  select count(*) into actual from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id where c.slug=any(target_slugs) and m.id<>excluded_module;
  if actual<>864 then raise exception 'Wave 1 expected 864 included activities; found %',actual; end if;

  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(target_slugs) and m.id<>excluded_module and m.status<>'draft';
  if actual<>0 then raise exception 'Wave 1 included modules must remain draft'; end if;
  select count(*) into actual from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where c.slug=any(target_slugs) and m.id<>excluded_module and l.status<>'draft';
  if actual<>0 then raise exception 'Wave 1 included lessons must remain draft'; end if;
  select count(*) into actual from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id where c.slug=any(target_slugs) and m.id<>excluded_module and a.status<>'draft';
  if actual<>0 then raise exception 'Wave 1 included activities must remain draft'; end if;

  select count(*) into actual from public.courses where slug=any(target_slugs) and (nullif(trim(description),'') is null or nullif(trim(ai_summary),'') is not null or cardinality(learning_objectives)<>0 or cardinality(career_tags)<>0);
  if actual<>0 then raise exception 'Wave 1 course completion baseline changed'; end if;
  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(target_slugs) and m.id<>excluded_module and cardinality(m.learning_objectives)=0;
  if actual<>432 then raise exception 'Wave 1 expected 432 empty module objective arrays; found %',actual; end if;
  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(target_slugs) and m.id<>excluded_module and nullif(trim(m.career_connection),'') is null;
  if actual<>432 then raise exception 'Wave 1 expected 432 empty career connections; found %',actual; end if;

  select count(*) into actual from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id
  where c.slug=any(target_slugs) and m.id<>excluded_module and (nullif(trim(l.title),'') is null or nullif(trim(l.description),'') is null or nullif(trim(l.short_summary),'') is null or nullif(trim(l.learning_objective),'') is null or l.duration_minutes is null or jsonb_typeof(l.content_blocks)<>'array' or jsonb_array_length(l.content_blocks)=0 or cardinality(l.technique_cues)=0 or cardinality(l.common_mistakes)=0 or nullif(trim(l.self_check),'') is null);
  if actual<>0 then raise exception 'Wave 1 lesson content is no longer complete'; end if;
  select count(*) into actual from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id
  where c.slug=any(target_slugs) and m.id<>excluded_module and (nullif(trim(a.title),'') is null or nullif(trim(a.description),'') is null or nullif(trim(a.instructions),'') is null or nullif(trim(a.activity_type),'') is null or nullif(trim(a.submission_type),'') is null);
  if actual<>0 then raise exception 'Wave 1 activity content is no longer complete'; end if;
  select count(*) into actual from public.activities a join public.course_modules m on m.id=a.module_id join public.courses c on c.id=m.course_id
  where c.slug=any(target_slugs) and m.id<>excluded_module and a.required and a.xp_type='core' and (
    jsonb_typeof(a.rubric->'criteria')<>'array' or jsonb_array_length(a.rubric->'criteria')=0 or
    (select coalesce(sum((criterion->>'weight')::numeric),0) from jsonb_array_elements(a.rubric->'criteria') criterion)<>100 or
    a.xp_reward<>350 or a.passing_score<>70 or not a.allows_resubmission);
  if actual<>0 then raise exception 'Wave 1 Core Challenge rubric or XP contract changed'; end if;

  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(target_slugs) and m.id<>excluded_module and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null);
  if actual<>0 then raise exception 'Wave 1 target unexpectedly contains video projections'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) into actual_hash
  from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null);
  if actual_hash<>'59cc00f5ebf4997aaa2d2b79884be900' then raise exception 'Protected Singing video baseline changed: %',actual_hash; end if;

  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Protected academic counts changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules;
  if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Curriculum status baseline changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,course_id::text,core_xp::text,intro_core_xp::text,video_core_xp::text,assignment_core_xp::text,mastery_core_xp::text,core_unlock_threshold::text),E'\n' order by id),'')) into actual_hash from public.course_modules;
  if actual_hash<>'fe5066455650e47c94e72f3cb3f9f6ac' then raise exception 'Module identity or XP baseline changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,module_id::text,xp_value::text),E'\n' order by id),'')) into actual_hash from public.lessons;
  if actual_hash<>'bc805ba34679ae3d2f4e33862c2423a1' then raise exception 'Lesson identity or XP baseline changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,coalesce(course_id::text,''),coalesce(module_id::text,''),coalesce(lesson_id::text,''),xp_reward::text,passing_score::text),E'\n' order by id),'')) into actual_hash from public.activities;
  if actual_hash<>'e46580d9f35006238965e4dacb05a0ae' then raise exception 'Activity identity, XP, or mastery baseline changed'; end if;
end $preflight$;

with course_completion(slug,ai_summary,learning_objectives,career_tags) as (values
  ('acting','A student-centered pathway through acting technique, character development, ensemble work, audition preparation, and stage performance for young developing artists.',array['Build safe and repeatable acting, voice, and movement technique.','Analyze scripts and make specific, believable character choices.','Rehearse and perform collaboratively using professional habits.','Prepare audition and portfolio work through reflection and feedback.']::text[],array['actor','director','voice artist','teaching artist','casting and production']::text[]),
  ('audio-engineering','A practical pathway through recording, editing, mixing, critical listening, and responsible sound production for young creators.',array['Capture clean and safe audio with appropriate recording technique.','Edit and organize sessions using clear production workflows.','Balance, process, and evaluate mixes through critical listening.','Document and present audio work using professional collaboration habits.']::text[],array['recording engineer','mix engineer','sound editor','live sound','audio production']::text[]),
  ('dance','A progressive pathway through movement technique, musicality, choreography, collaboration, and performance confidence for young dancers.',array['Build safe alignment, coordination, strength, and movement technique.','Apply musicality, timing, spacing, and performance quality.','Create and refine choreography through rehearsal and feedback.','Collaborate and present dance work with professional habits.']::text[],array['dancer','choreographer','dance educator','movement director','performance production']::text[]),
  ('digital-ai-creator','A responsible creative pathway through AI-assisted ideation, visual storytelling, digital production, critique, and portfolio presentation.',array['Use AI tools responsibly to support original creative decisions.','Plan and produce clear digital stories for an intended audience.','Evaluate outputs for quality, accuracy, bias, safety, and attribution.','Refine and present portfolio-ready work through feedback and iteration.']::text[],array['creative technologist','digital content creator','art director','AI production','visual storytelling']::text[]),
  ('guitar','A progressive pathway through guitar technique, rhythm, chords, musicianship, creativity, and confident performance for young musicians.',array['Build safe, efficient fretting, picking, chord, and rhythm technique.','Apply musical vocabulary in songs, accompaniment, and improvisation.','Listen, rehearse, and perform with accurate timing and expression.','Prepare collaborative and portfolio work through reflection and feedback.']::text[],array['guitarist','songwriter','session musician','music educator','live performance']::text[]),
  ('music-business','A practical artist-development pathway through branding, rights, release planning, audience growth, budgeting, and ethical creative entrepreneurship.',array['Explain core music-industry roles, rights, revenue, and agreements.','Develop an authentic artist brand and audience strategy.','Plan releases, budgets, promotion, and professional communication.','Make ethical, evidence-based career decisions and present an artist plan.']::text[],array['artist manager','music marketer','A&R','creative entrepreneur','music publishing']::text[]),
  ('music-production-songwriting','A creator pathway through songwriting, beat making, arranging, recording, revision, collaboration, and release-ready presentation.',array['Develop original song ideas using structure, melody, rhythm, and lyrics.','Build and arrange productions with intentional sound choices.','Record, edit, and revise creative work through critical listening.','Collaborate and present polished songs using professional workflow habits.']::text[],array['songwriter','music producer','beat maker','recording artist','creative collaborator']::text[]),
  ('piano','A progressive pathway through piano technique, reading, rhythm, harmony, creativity, and confident solo and collaborative performance.',array['Build safe posture, coordination, fingering, and keyboard technique.','Read and interpret rhythm, melody, harmony, and musical form.','Rehearse and perform with accuracy, expression, and steady timing.','Create, collaborate, and prepare portfolio work through reflection and feedback.']::text[],array['pianist','keyboardist','composer','accompanist','music educator']::text[]),
  ('video-production','A hands-on pathway through visual storytelling, camera work, sound, editing, production planning, collaboration, and responsible publishing.',array['Plan age-appropriate visual stories for a clear audience and purpose.','Capture intentional image and sound using safe production practices.','Edit picture, audio, pacing, and graphics into a coherent final piece.','Collaborate, critique, revise, and present portfolio-ready video work.']::text[],array['video producer','cinematographer','editor','director','digital storyteller']::text[])
)
update public.courses c set
  ai_summary=case when nullif(trim(c.ai_summary),'') is null then cc.ai_summary else c.ai_summary end,
  learning_objectives=case when cardinality(c.learning_objectives)=0 then cc.learning_objectives else c.learning_objectives end,
  career_tags=case when cardinality(c.career_tags)=0 then cc.career_tags else c.career_tags end
from course_completion cc where c.slug=cc.slug;

with target_modules as (
  select m.id,m.title,c.slug
  from public.course_modules m join public.courses c on c.id=m.course_id
  where c.slug=any(array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'])
    and m.id<>'b94c8524-9715-4020-8075-5588b6fcce62'
), objectives as (
  select l.module_id,array_agg(trim(l.learning_objective) order by l.sort_order,l.id)::text[] objectives
  from public.lessons l join target_modules tm on tm.id=l.module_id
  where nullif(trim(l.learning_objective),'') is not null group by l.module_id
)
update public.course_modules m set
  learning_objectives=case when cardinality(m.learning_objectives)=0 then o.objectives else m.learning_objectives end,
  career_connection=case when nullif(trim(m.career_connection),'') is null then
    case tm.slug
      when 'acting' then format('Skills from "%s" support pathways in acting, directing, voice performance, teaching artistry, and collaborative production.',m.title)
      when 'audio-engineering' then format('Skills from "%s" support pathways in recording, mixing, sound editing, live sound, and audio production.',m.title)
      when 'dance' then format('Skills from "%s" support pathways in dance performance, choreography, movement direction, teaching, and live production.',m.title)
      when 'digital-ai-creator' then format('Skills from "%s" support pathways in responsible AI production, digital content, creative technology, art direction, and visual storytelling.',m.title)
      when 'guitar' then format('Skills from "%s" support pathways in live performance, session work, songwriting, accompaniment, and music education.',m.title)
      when 'music-business' then format('Skills from "%s" support pathways in artist management, marketing, music publishing, A&R, and creative entrepreneurship.',m.title)
      when 'music-production-songwriting' then format('Skills from "%s" support pathways in songwriting, beat making, music production, recording artistry, and creative collaboration.',m.title)
      when 'piano' then format('Skills from "%s" support pathways in performance, accompaniment, composition, keyboard work, and music education.',m.title)
      when 'video-production' then format('Skills from "%s" support pathways in producing, directing, cinematography, editing, and digital storytelling.',m.title)
    end else m.career_connection end
from target_modules tm join objectives o on o.module_id=tm.id where m.id=tm.id;

do $postcheck$
declare
  target_slugs constant text[] := array['acting','audio-engineering','dance','digital-ai-creator','guitar','music-business','music-production-songwriting','piano','video-production'];
  excluded_module constant uuid := 'b94c8524-9715-4020-8075-5588b6fcce62';
  actual bigint;
  actual_hash text;
begin
  select count(*) into actual from public.courses where slug=any(target_slugs) and (nullif(trim(ai_summary),'') is null or cardinality(learning_objectives)=0 or cardinality(career_tags)=0);
  if actual<>0 then raise exception 'Wave 1 course completion failed for % courses',actual; end if;
  select count(*) into actual from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(target_slugs) and m.id<>excluded_module and (cardinality(m.learning_objectives)=0 or nullif(trim(m.career_connection),'') is null);
  if actual<>0 then raise exception 'Wave 1 module completion failed for % modules',actual; end if;
  select md5(string_agg(concat_ws('|',c.id::text,c.ai_summary,array_to_string(c.learning_objectives,E'\x1f'),array_to_string(c.career_tags,E'\x1f')),E'\n' order by c.id)) into actual_hash from public.courses c where c.slug=any(target_slugs);
  if actual_hash<>'2c68234b2376e8bb9185dfa3db724607' then raise exception 'Wave 1 course completion hash mismatch'; end if;
  select md5(string_agg(concat_ws('|',m.id::text,array_to_string(m.learning_objectives,E'\x1f'),m.career_connection),E'\n' order by m.id)) into actual_hash from public.course_modules m join public.courses c on c.id=m.course_id where c.slug=any(target_slugs) and m.id<>excluded_module;
  if actual_hash<>'a65b2435025575e199755d1800c28334' then raise exception 'Wave 1 module completion hash mismatch'; end if;
  if (select count(*) from public.xp_ledger)<>6 or (select count(*) from public.enrollments)<>2 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>7 then raise exception 'Protected academic counts changed'; end if;
  select md5(coalesce(string_agg(id::text||':'||status,E'\n' order by id),'')) into actual_hash from public.course_modules;
  if actual_hash<>'bfcf4c34a018228493ba741ffb984979' then raise exception 'Curriculum status changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,course_id::text,core_xp::text,intro_core_xp::text,video_core_xp::text,assignment_core_xp::text,mastery_core_xp::text,core_unlock_threshold::text),E'\n' order by id),'')) into actual_hash from public.course_modules;
  if actual_hash<>'fe5066455650e47c94e72f3cb3f9f6ac' then raise exception 'Module identity or XP fields changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,module_id::text,xp_value::text),E'\n' order by id),'')) into actual_hash from public.lessons;
  if actual_hash<>'bc805ba34679ae3d2f4e33862c2423a1' then raise exception 'Lesson identity or XP fields changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',id::text,coalesce(course_id::text,''),coalesce(module_id::text,''),coalesce(lesson_id::text,''),xp_reward::text,passing_score::text),E'\n' order by id),'')) into actual_hash from public.activities;
  if actual_hash<>'e46580d9f35006238965e4dacb05a0ae' then raise exception 'Activity identity, XP, or mastery fields changed'; end if;
  select md5(coalesce(string_agg(concat_ws('|',m.id::text,coalesce(m.primary_video_url,''),coalesce(m.video_title,''),coalesce(m.video_provider,''),coalesce(m.video_duration_seconds::text,''),coalesce(m.active_instructional_media_id::text,'')),E'\n' order by m.id),'')) into actual_hash
  from public.course_modules m join public.courses c on c.id=m.course_id where c.slug='singing' and (m.primary_video_url is not null or m.video_title is not null or m.video_provider is not null or m.video_duration_seconds is not null or m.active_instructional_media_id is not null);
  if actual_hash<>'59cc00f5ebf4997aaa2d2b79884be900' then raise exception 'Protected Singing video baseline changed'; end if;
end $postcheck$;

commit;
