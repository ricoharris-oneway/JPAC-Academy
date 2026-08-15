-- JPAC Music Production/Songwriting 48-module draft rollout. Run only after preflight PASS and explicit approval.
begin;
do $$
declare
 v_course uuid; v_level uuid; v_module uuid; v_lesson_title text; v_rubric jsonb; v_module_created boolean; r record; i int; v_review text;
 v_marker constant text := 'Music Production/Songwriting full draft rollout 202608140006';
 v_levels constant text[] := array['Beginner','Intermediate','Advanced','Master'];
 v_certificates constant text[] := array['JPAC Music Creator Certificate','JPAC Song Builder Certificate','JPAC Producer & Songwriter Certificate','JPAC Master Creative Producer Certificate'];
begin
 if (select count(*) from public.courses where slug='music-production-songwriting')<>1 then raise exception 'Expected exactly one canonical music-production-songwriting course'; end if;
 select id into v_course from public.courses where slug='music-production-songwriting' for share;
 if exists(select 1 from public.enrollments where course_id=v_course)
 or exists(select 1 from public.submissions s join public.activities a on a.id=s.activity_id where a.course_id=v_course)
 or exists(select 1 from public.lesson_progress p join public.lessons l on l.id=p.lesson_id join public.course_modules m on m.id=l.module_id where m.course_id=v_course)
 or exists(select 1 from public.activity_progress p join public.activities a on a.id=p.activity_id where a.course_id=v_course)
 or exists(select 1 from public.practice_logs p join public.activities a on a.id=p.activity_id where a.course_id=v_course)
 or exists(select 1 from public.xp_ledger where course_id=v_course)
 or exists(select 1 from public.certificates where course_id=v_course)
 or exists(select 1 from public.portfolio_projects p join public.activities a on a.id=p.activity_id where a.course_id=v_course)
 or exists(select 1 from public.module_instructional_media mi join public.course_modules m on m.id=mi.module_id where m.course_id=v_course)
 or exists(select 1 from public.lab_tool_courses where course_id=v_course)
 then raise exception 'Music Production/Songwriting student/evidence dependencies block rollout'; end if;
 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress') and (select count(*) from regexp_matches(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m\.status=''published''','g'))=2 and strpos(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m.status<>''archived''')=0)<>2 then raise exception 'Safe Draft Isolation is not active'; end if;
 if (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='enrollments' and t.tgname='enrollments_enforce_canonical_progress' and not t.tgisinternal and t.tgenabled<>'D')<>1 then raise exception 'Canonical enrollment progress trigger missing'; end if;

 v_rubric:=jsonb_build_object('criteria',jsonb_build_array(
  jsonb_build_object('name','Creative Concept & Songwriting','weight',20,'bands',jsonb_build_object('Exceeds','Creative concept and songwriting consistently exceed the approved standard.','Meets','Creative concept and songwriting meet the approved standard.','Developing','Creative concept and songwriting partially meet the standard.','Not Yet','Creative concept and songwriting do not yet meet the standard.')),
  jsonb_build_object('name','Rhythm, Melody, Harmony & Arrangement','weight',20,'bands',jsonb_build_object('Exceeds','Musical elements and arrangement consistently exceed the approved standard.','Meets','Musical elements and arrangement meet the approved standard.','Developing','Musical elements and arrangement partially meet the standard.','Not Yet','Musical elements and arrangement do not yet meet the standard.')),
  jsonb_build_object('name','Production / Sound Selection / DAW Workflow','weight',20,'bands',jsonb_build_object('Exceeds','Production choices and workflow consistently exceed the approved standard.','Meets','Production choices and workflow meet the approved standard.','Developing','Production choices and workflow partially meet the standard.','Not Yet','Production choices and workflow do not yet meet the standard.')),
  jsonb_build_object('name','Recording, Mixing & Technical Quality','weight',20,'bands',jsonb_build_object('Exceeds','Recording, mixing, and technical quality consistently exceed the approved standard.','Meets','Recording, mixing, and technical quality meet the approved standard.','Developing','Recording, mixing, and technical quality partially meet the standard.','Not Yet','Recording, mixing, and technical quality do not yet meet the standard.')),
  jsonb_build_object('name','Professional Delivery, Credits & Reflection','weight',20,'bands',jsonb_build_object('Exceeds','Delivery, credits, and reflection consistently exceed the approved standard.','Meets','Delivery, credits, and reflection meet the approved standard.','Developing','Delivery, credits, and reflection partially meet the standard.','Not Yet','Delivery, credits, and reflection do not yet meet the standard.'))
 ));

 for r in select * from jsonb_to_recordset('[
 {"level":1,"num":1,"sort":1,"title":"Welcome to Music Production"},
 {"level":1,"num":2,"sort":2,"title":"Rhythm, Tempo & BPM"},
 {"level":1,"num":3,"sort":3,"title":"Build Your First Drum Beat"},
 {"level":1,"num":4,"sort":4,"title":"Melody Maker"},
 {"level":1,"num":5,"sort":5,"title":"Chords & Musical Mood"},
 {"level":1,"num":6,"sort":6,"title":"Understanding Song Structure"},
 {"level":1,"num":7,"sort":7,"title":"Writing Hooks That Stick"},
 {"level":1,"num":8,"sort":8,"title":"Lyrics, Rhyme & Wordplay"},
 {"level":1,"num":9,"sort":9,"title":"Verse + Chorus"},
 {"level":1,"num":10,"sort":10,"title":"Recording Your Voice"},
 {"level":1,"num":11,"sort":11,"title":"Arranging Your First Song"},
 {"level":1,"num":12,"sort":12,"title":"Beginner Showcase: My First Original Song"},
 {"level":2,"num":1,"sort":13,"title":"Stronger Drum Programming"},
 {"level":2,"num":2,"sort":14,"title":"Basslines & Low-End Groove"},
 {"level":2,"num":3,"sort":15,"title":"Harmony & Chord Progressions"},
 {"level":2,"num":4,"sort":16,"title":"Melody Development"},
 {"level":2,"num":5,"sort":17,"title":"Advanced Lyric Writing"},
 {"level":2,"num":6,"sort":18,"title":"Song Concepts & Development"},
 {"level":2,"num":7,"sort":19,"title":"Vocal Production"},
 {"level":2,"num":8,"sort":20,"title":"Arrangement & Transitions"},
 {"level":2,"num":9,"sort":21,"title":"Introduction to Mixing"},
 {"level":2,"num":10,"sort":22,"title":"Producing Across Genres"},
 {"level":2,"num":11,"sort":23,"title":"Collaboration"},
 {"level":2,"num":12,"sort":24,"title":"Intermediate Showcase: Complete Song Production"},
 {"level":3,"num":1,"sort":25,"title":"Developing Your Producer Identity"},
 {"level":3,"num":2,"sort":26,"title":"Advanced Drum Programming"},
 {"level":3,"num":3,"sort":27,"title":"Advanced Harmony & Melody"},
 {"level":3,"num":4,"sort":28,"title":"Advanced Songwriting & Story Architecture"},
 {"level":3,"num":5,"sort":29,"title":"Advanced Vocal Arrangement"},
 {"level":3,"num":6,"sort":30,"title":"Sound Design"},
 {"level":3,"num":7,"sort":31,"title":"Advanced Mixing"},
 {"level":3,"num":8,"sort":32,"title":"Producing for Another Artist"},
 {"level":3,"num":9,"sort":33,"title":"Leading a Recording Session"},
 {"level":3,"num":10,"sort":34,"title":"Revision & Professional Feedback"},
 {"level":3,"num":11,"sort":35,"title":"Preparing Music for Delivery"},
 {"level":3,"num":12,"sort":36,"title":"Advanced Showcase: Artist Production Project"},
 {"level":4,"num":1,"sort":37,"title":"Developing Your Signature Sound"},
 {"level":4,"num":2,"sort":38,"title":"Producing From a Creative Brief"},
 {"level":4,"num":3,"sort":39,"title":"Writing for Another Artist"},
 {"level":4,"num":4,"sort":40,"title":"Professional Session Leadership"},
 {"level":4,"num":5,"sort":41,"title":"Advanced Vocal Production & Direction"},
 {"level":4,"num":6,"sort":42,"title":"Master Arrangement & Production"},
 {"level":4,"num":7,"sort":43,"title":"Mixing for Professional Delivery"},
 {"level":4,"num":8,"sort":44,"title":"Credits, Copyright & Split Sheets"},
 {"level":4,"num":9,"sort":45,"title":"Publishing & Songwriter Revenue"},
 {"level":4,"num":10,"sort":46,"title":"Building Your Producer/Songwriter Catalog"},
 {"level":4,"num":11,"sort":47,"title":"Producer Portfolio & Professional Presentation"},
 {"level":4,"num":12,"sort":48,"title":"Master''s Magnum Opus: The JPAC Record"}
 ]'::jsonb) as x(level int,num int,sort int,title text) order by sort loop
  select id into v_level from public.course_levels where course_id=v_course and level_number=r.level;
  if v_level is null then
   insert into public.course_levels(id,course_id,level_number,title,description,learning_objectives,status,core_xp_target,review_notes)
   values(gen_random_uuid(),v_course,r.level,v_levels[r.level],'Draft Music Production/Songwriting level; Program PDF source review only.',array['Develop source-aligned songwriting, arrangement, production, recording, mixing, collaboration, ownership, and professional delivery skills safely.'],'draft',7500,v_marker||'; batch-created level; canonical 12-module level; inactive certificate intent: '||v_certificates[r.level]||'.') returning id into v_level;
  elsif not exists(select 1 from public.course_levels where id=v_level and title=v_levels[r.level] and description='Draft Music Production/Songwriting level; Program PDF source review only.' and learning_objectives=array['Develop source-aligned songwriting, arrangement, production, recording, mixing, collaboration, ownership, and professional delivery skills safely.'] and status='draft' and core_xp_target=7500 and review_notes like '%inactive certificate intent: '||v_certificates[r.level]||'.%' and approved_by is null and approved_at is null) then raise exception 'Incompatible Music Production/Songwriting level %',r.level; end if;

  v_review:=v_marker||'; source-aligned module. MEDIA NEEDS REVIEW; NEEDS CATALOG REVIEW; RIGHTS/LEGAL REVIEW; COLLABORATION/CONSENT REVIEW; THIRD-PARTY TOOL REVIEW; COPYRIGHT/OWNERSHIP REVIEW; SCOPE REVIEW; no media or tool records are created; external submission language is replaced by JPAC-native submission.';
  if r.num=12 then v_review:=v_review||' Approved level capstone; certificate intent is documented but inactive.'; end if;

  select id into v_module from public.course_modules where course_id=v_course and (sort_order=r.sort or (course_level_id=v_level and level_module_number=r.num));
  if v_module is null then
   insert into public.course_modules(id,course_id,course_level_id,level_module_number,title,description,short_intro,sort_order,xp_value,core_xp,intro_core_xp,video_core_xp,assignment_core_xp,mastery_core_xp,core_unlock_threshold,bonus_xp_available,jpac_tool_activity,real_world_activity,career_connection,portfolio_moment,status,video_brief,aria_coaching_targets,career_mission_ideas,review_notes)
   values(gen_random_uuid(),v_course,v_level,r.num,r.title,'Develop and demonstrate source-aligned Music Production/Songwriting skills for '||r.title||'.','Draft source-aligned Music Production/Songwriting module.',r.sort,625,625,50,100,350,125,438,0,'{}'::jsonb,jsonb_build_object('title',r.title||' Guided Practice','instructions','Practice the approved creative objective using teacher-approved DAW-neutral, instrument-neutral, written, performed, or supplied-material alternatives. Named products and external accounts are optional examples only.'),'',false,'draft','MEDIA NEEDS REVIEW: no media is activated.',jsonb_build_object('advisory_only',true,'targets',jsonb_build_array('original creative concept','rhythm and groove','melody and harmony','lyrics and storytelling','arrangement','DAW workflow','recording and vocal production','mixing and delivery','critical listening','credits and ownership','safe collaboration','project completion'),'prohibited',jsonb_build_array('create submitted work','imitate copyrighted work','assess','approve','award XP','grant mastery','unlock','publish')),'[]'::jsonb,v_review) returning id into v_module;
   v_module_created:=true;
  elsif not exists(select 1 from public.course_modules where id=v_module and course_level_id=v_level and level_module_number=r.num and sort_order=r.sort and title=r.title and description='Develop and demonstrate source-aligned Music Production/Songwriting skills for '||r.title||'.' and short_intro='Draft source-aligned Music Production/Songwriting module.' and status='draft' and xp_value=625 and core_xp=625 and intro_core_xp=50 and video_core_xp=100 and assignment_core_xp=350 and mastery_core_xp=125 and core_unlock_threshold=438 and bonus_xp_available=0 and jpac_tool_activity='{}'::jsonb and real_world_activity=jsonb_build_object('title',r.title||' Guided Practice','instructions','Practice the approved creative objective using teacher-approved DAW-neutral, instrument-neutral, written, performed, or supplied-material alternatives. Named products and external accounts are optional examples only.') and career_connection='' and not portfolio_moment and video_brief='MEDIA NEEDS REVIEW: no media is activated.' and review_notes=v_review and lab_tool_id is null and active_instructional_media_id is null and primary_video_url is null and approved_by is null and approved_at is null) then raise exception 'Incompatible Music Production/Songwriting module L% M%',r.level,r.num; end if;

  if v_module_created is distinct from true then
   if (select count(*) from public.lessons where module_id=v_module)<>3
   or (select count(*) from public.lessons where module_id=v_module and status='draft' and xp_value=0 and title in(r.title||': Creative Foundations and Safety',r.title||': Guided Production Application',r.title||': Professional Delivery and Reflection'))<>3
   or (select count(*) from public.activities where module_id=v_module)<>2
   or (select count(*) from public.activities where module_id=v_module and title=r.title||' Guided Practice' and status='draft' and activity_type='practice' and not required and xp_reward=0 and xp_type='bonus')<>1
   or (select count(*) from public.activities where module_id=v_module and title=r.title||' Core Challenge' and status='draft' and activity_type='performance' and required and xp_reward=350 and xp_type='core' and passing_score=70 and allows_resubmission and rubric=v_rubric)<>1
   then raise exception 'Existing Music Production/Songwriting module children are not exact-compatible L% M%',r.level,r.num; end if;
  else
   for i in 1..3 loop
    v_lesson_title:=case i when 1 then r.title||': Creative Foundations and Safety' when 2 then r.title||': Guided Production Application' else r.title||': Professional Delivery and Reflection' end;
    insert into public.lessons(id,module_id,title,description,lesson_type,duration_minutes,sort_order,xp_value,status,short_summary,learning_objective,content_blocks,technique_cues,common_mistakes,self_check,resource_brief)
    values(gen_random_uuid(),v_module,v_lesson_title,'Study and apply '||v_lesson_title||'.','interactive',25,i,0,'draft','Source-aligned Music Production/Songwriting lesson; draft review only.','Study and apply '||v_lesson_title||'.',jsonb_build_array('Plan the original concept, musical objective, authorized source material, credits, and safe workflow.','Apply the technique with teacher-approved DAW-neutral tools, instruments, voice, written work, or supplied material.','Review creative intent, musical development, technical quality, credits, delivery, reflection, and one next step.'),array['Protect student originality','Credit every contributor and authorized source','Use accessible tool-neutral alternatives'],array['Submitting copied or uncredited work','Treating optional software or accounts as mandatory','Publishing or collaborating externally without approval'],'Can you demonstrate the objective and explain one creative and one technical decision?','AI-PROPOSED lesson details and accessibility alternatives require Music Production/Songwriting teacher review.');
   end loop;
   insert into public.activities(id,course_id,module_id,title,description,activity_type,instructions,submission_type,xp_reward,estimated_minutes,required,status,rubric,skill_tags,ai_summary,xp_type,passing_score,allows_resubmission,portfolio_candidate,certificate_eligible) values
   (gen_random_uuid(),v_course,v_module,r.title||' Guided Practice','Optional source-aligned Music Production/Songwriting preparation.','practice','Practice using a teacher-approved DAW-neutral, instrument-neutral, written, performed, or supplied-material alternative. Named products and external accounts are optional examples only.','none',0,20,false,'draft','{}'::jsonb,'{}'::text[],'AI-PROPOSED; optional, non-progressive, non-assessed; teacher review required.','bonus',70,true,false,false),
   (gen_random_uuid(),v_course,v_module,r.title||' Core Challenge','Required source-aligned Music Production/Songwriting Core Challenge.','performance','Submit original authorized song, production, recording, session export, arrangement, mix, analysis, credits, reflection, or equivalent accessible evidence through the existing JPAC submission and teacher-review workflow. Identify contributors and authorized sources; do not publish or distribute externally.','file',350,30,true,'draft',v_rubric,'{}'::text[],'AI-PROPOSED; teacher review required; Aria advisory only.','core',70,true,false,false);
  end if;
  v_level:=null; v_module:=null; v_module_created:=false;
 end loop;
end $$;
commit;
