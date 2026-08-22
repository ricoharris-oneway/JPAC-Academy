-- JPAC Digital AI Creator 48-module draft rollout. Run only after preflight PASS and explicit approval.
begin;
do $$
declare
 v_course uuid; v_level uuid; v_module uuid; v_lesson_title text; v_rubric jsonb; v_module_created boolean; r record; i int; v_review text;
 v_marker constant text := 'Digital AI Creator full draft rollout 202608140009';
 v_levels constant text[] := array['AI Explorer','AI Creator','AI Creative Director','AI Production Master'];
 v_certificates constant text[] := array['JPAC AI Explorer Certificate','JPAC AI Creator Certificate','JPAC AI Creative Director Certificate','JPAC Master Digital AI Creator Certificate'];
begin
 if (select count(*) from public.courses where slug='digital-ai-creator')<>1 then raise exception 'Expected exactly one canonical digital-ai-creator course'; end if;
 select id into v_course from public.courses where slug='digital-ai-creator' for share;
 if not exists(select 1 from public.courses where id=v_course and title='Digital AI Creator') then raise exception 'Existing digital-ai-creator course title is incompatible with rollout'; end if;
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
 then raise exception 'Digital AI Creator student/evidence dependencies block rollout'; end if;
 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress') and (select count(*) from regexp_matches(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m\.status=''published''','g'))=2 and strpos(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m.status<>''archived''')=0)<>2 then raise exception 'Safe Draft Isolation is not active'; end if;
 if (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='enrollments' and t.tgname='enrollments_enforce_canonical_progress' and not t.tgisinternal and t.tgenabled<>'D')<>1 then raise exception 'Canonical enrollment progress trigger missing'; end if;

 v_rubric:=jsonb_build_object('criteria',jsonb_build_array(
  jsonb_build_object('name','Creative Concept, Originality & Intent','weight',20,'bands',jsonb_build_object('Exceeds','Creative concept, originality, and intent consistently exceed the approved standard.','Meets','Creative concept, originality, and intent meet the approved standard.','Developing','Creative concept, originality, and intent partially meet the standard.','Not Yet','Creative concept, originality, and intent do not yet meet the standard.')),
  jsonb_build_object('name','Prompt Engineering, References & Iteration','weight',20,'bands',jsonb_build_object('Exceeds','Prompt engineering, references, and iteration consistently exceed the approved standard.','Meets','Prompt engineering, references, and iteration meet the approved standard.','Developing','Prompt engineering, references, and iteration partially meet the standard.','Not Yet','Prompt engineering, references, and iteration do not yet meet the standard.')),
  jsonb_build_object('name','Visual Direction, Continuity & Production Quality','weight',20,'bands',jsonb_build_object('Exceeds','Visual direction, continuity, and production quality consistently exceed the approved standard.','Meets','Visual direction, continuity, and production quality meet the approved standard.','Developing','Visual direction, continuity, and production quality partially meet the standard.','Not Yet','Visual direction, continuity, and production quality do not yet meet the standard.')),
  jsonb_build_object('name','Responsible AI Use, Privacy & Rights Awareness','weight',20,'bands',jsonb_build_object('Exceeds','Responsible AI use, privacy, and rights awareness consistently exceed the approved standard.','Meets','Responsible AI use, privacy, and rights awareness meet the approved standard.','Developing','Responsible AI use, privacy, and rights awareness partially meet the standard.','Not Yet','Responsible AI use, privacy, and rights awareness do not yet meet the standard.')),
  jsonb_build_object('name','Professional Delivery, Documentation & Reflection','weight',20,'bands',jsonb_build_object('Exceeds','Professional delivery, documentation, and reflection consistently exceed the approved standard.','Meets','Professional delivery, documentation, and reflection meet the approved standard.','Developing','Professional delivery, documentation, and reflection partially meet the standard.','Not Yet','Professional delivery, documentation, and reflection do not yet meet the standard.'))
 ));

 for r in select * from jsonb_to_recordset('[
 {"level":1,"num":1,"sort":1,"title":"Welcome to Your AI Creative Studio"},
 {"level":1,"num":2,"sort":2,"title":"Prompting: Learning to Talk to AI"},
 {"level":1,"num":3,"sort":3,"title":"Creating AI Images"},
 {"level":1,"num":4,"sort":4,"title":"Camera Shots & Composition"},
 {"level":1,"num":5,"sort":5,"title":"Lighting, Color & Mood"},
 {"level":1,"num":6,"sort":6,"title":"Designing Characters"},
 {"level":1,"num":7,"sort":7,"title":"Character Consistency"},
 {"level":1,"num":8,"sort":8,"title":"Creating Environments & Worlds"},
 {"level":1,"num":9,"sort":9,"title":"From Image to Video"},
 {"level":1,"num":10,"sort":10,"title":"Camera Movement in Veo"},
 {"level":1,"num":11,"sort":11,"title":"Sound, Dialogue & Atmosphere"},
 {"level":1,"num":12,"sort":12,"title":"Level 1 Showcase: My First AI Mini Story"},
 {"level":2,"num":1,"sort":13,"title":"Writing Cinematic Prompts"},
 {"level":2,"num":2,"sort":14,"title":"Story Ideas With Gemini"},
 {"level":2,"num":3,"sort":15,"title":"AI Storyboarding"},
 {"level":2,"num":4,"sort":16,"title":"Frames-to-Video"},
 {"level":2,"num":5,"sort":17,"title":"Ingredients & Visual References"},
 {"level":2,"num":6,"sort":18,"title":"Character Performance"},
 {"level":2,"num":7,"sort":19,"title":"Dialogue Scenes"},
 {"level":2,"num":8,"sort":20,"title":"AI Commercials"},
 {"level":2,"num":9,"sort":21,"title":"AI Music Visuals"},
 {"level":2,"num":10,"sort":22,"title":"Social Media Content Creation"},
 {"level":2,"num":11,"sort":23,"title":"Editing & Refining AI Video"},
 {"level":2,"num":12,"sort":24,"title":"Level 2 Showcase: AI Commercial or Music Campaign"},
 {"level":3,"num":1,"sort":25,"title":"Creative Direction"},
 {"level":3,"num":2,"sort":26,"title":"Advanced Veo Cinematography"},
 {"level":3,"num":3,"sort":27,"title":"Advanced Character Continuity"},
 {"level":3,"num":4,"sort":28,"title":"Scene Continuity"},
 {"level":3,"num":5,"sort":29,"title":"AI Acting & Performance Direction"},
 {"level":3,"num":6,"sort":30,"title":"Advanced Audio Direction"},
 {"level":3,"num":7,"sort":31,"title":"Flow Agent as a Creative Partner"},
 {"level":3,"num":8,"sort":32,"title":"AI Advertising Campaigns"},
 {"level":3,"num":9,"sort":33,"title":"AI Music Video Production"},
 {"level":3,"num":10,"sort":34,"title":"AI Short Film Production"},
 {"level":3,"num":11,"sort":35,"title":"Fixing Failed AI Generations"},
 {"level":3,"num":12,"sort":36,"title":"Level 3 Showcase: AI Director Project"},
 {"level":4,"num":1,"sort":37,"title":"Building an AI Production Pipeline"},
 {"level":4,"num":2,"sort":38,"title":"Advanced Multimodal Prompting"},
 {"level":4,"num":3,"sort":39,"title":"AI Production Bibles"},
 {"level":4,"num":4,"sort":40,"title":"Advanced Flow Scene Building"},
 {"level":4,"num":5,"sort":41,"title":"AI Video Editing & Transformation"},
 {"level":4,"num":6,"sort":42,"title":"AI Creative Problem Solving"},
 {"level":4,"num":7,"sort":43,"title":"Responsible AI & Digital Ethics"},
 {"level":4,"num":8,"sort":44,"title":"AI for Client Work"},
 {"level":4,"num":9,"sort":45,"title":"Building an AI Creator Brand"},
 {"level":4,"num":10,"sort":46,"title":"AI Creator Portfolio"},
 {"level":4,"num":11,"sort":47,"title":"Professional AI Creator Pitch"},
 {"level":4,"num":12,"sort":48,"title":"Master''s Magnum Opus: The JPAC AI Production"}
 ]'::jsonb) as x(level int,num int,sort int,title text) order by sort loop
  select id into v_level from public.course_levels where course_id=v_course and level_number=r.level;
  if v_level is null then
   insert into public.course_levels(id,course_id,level_number,title,description,learning_objectives,status,core_xp_target,review_notes)
   values(gen_random_uuid(),v_course,r.level,v_levels[r.level],'Draft Digital AI Creator level; Program PDF source review only.',array['Develop source-aligned creative direction, prompting, visual production, continuity, responsible AI use, documentation, and professional delivery skills safely.'],'draft',7500,v_marker||'; batch-created level; canonical 12-module level; inactive certificate intent: '||v_certificates[r.level]||'.') returning id into v_level;
  elsif not exists(select 1 from public.course_levels where id=v_level and title=v_levels[r.level] and description='Draft Digital AI Creator level; Program PDF source review only.' and learning_objectives=array['Develop source-aligned creative direction, prompting, visual production, continuity, responsible AI use, documentation, and professional delivery skills safely.'] and status='draft' and core_xp_target=7500 and review_notes like '%inactive certificate intent: '||v_certificates[r.level]||'.%' and approved_by is null and approved_at is null) then raise exception 'Incompatible Digital AI Creator level %',r.level; end if;

  v_review:=v_marker||'; source-aligned module. MEDIA NEEDS REVIEW; NEEDS CATALOG REVIEW; AI SAFETY REVIEW; MINOR ACCESS REVIEW; PRIVACY/CONSENT REVIEW; LIKENESS/PERMISSION REVIEW; COPYRIGHT/IP REVIEW; DECEPTIVE MEDIA REVIEW; DISCLOSURE REVIEW; PLATFORM POLICY REVIEW; SCOPE REVIEW; no media or tool records are created; Google Flow, Gemini, Veo, Nano Banana, Flow Agent, Gemini Omni, and future Google AI models are ecosystem references only; no external account is required; students under 18 must not use age-restricted tools independently; Instructor-Guided AI Lab where needed; do not upload private, copyrighted, or unauthorized likeness material; no safeguard bypassing, impersonation, deceptive media, misinformation, or unauthorized real-person likeness use; preserve disclosure, privacy, copyright, consent, and responsible-use safeguards; JPAC-native private submission only.';
  if r.num=12 then v_review:=v_review||' Approved level capstone; certificate intent is documented but inactive.'; end if;

  select id into v_module from public.course_modules where course_id=v_course and (sort_order=r.sort or (course_level_id=v_level and level_module_number=r.num));
  if v_module is null then
   insert into public.course_modules(id,course_id,course_level_id,level_module_number,title,description,short_intro,sort_order,xp_value,core_xp,intro_core_xp,video_core_xp,assignment_core_xp,mastery_core_xp,core_unlock_threshold,bonus_xp_available,jpac_tool_activity,real_world_activity,career_connection,portfolio_moment,status,video_brief,aria_coaching_targets,career_mission_ideas,review_notes)
   values(gen_random_uuid(),v_course,v_level,r.num,r.title,'Develop and demonstrate source-aligned Digital AI Creator skills for '||r.title||'.','Draft source-aligned Digital AI Creator module.',r.sort,625,625,50,100,350,125,438,0,'{}'::jsonb,jsonb_build_object('title',r.title||' Instructor-Guided AI Lab','instructions','Practice creative direction, prompting, references, iteration, continuity, production, and documentation in a teacher-approved private or simulated workflow. No external account, public posting, or independent use of age-restricted tools is required.'),'',false,'draft','MEDIA NEEDS REVIEW: no media is activated.',jsonb_build_object('advisory_only',true,'targets',jsonb_build_array('creative concept and intent','prompt engineering and iteration','visual direction and continuity','production quality','responsible AI use','privacy and consent','copyright and source awareness','likeness permission','AI disclosure','professional documentation','reflection and next steps'),'prohibited',jsonb_build_array('create submitted work','request private or copyrighted uploads','use unauthorized real-person likenesses','bypass platform safeguards','enable impersonation, deceptive media, or misinformation','direct minors to use age-restricted tools independently','assess','approve','award XP','grant mastery','unlock','publish')),'[]'::jsonb,v_review) returning id into v_module;
   v_module_created:=true;
  elsif not exists(select 1 from public.course_modules where id=v_module and course_level_id=v_level and level_module_number=r.num and sort_order=r.sort and title=r.title and description='Develop and demonstrate source-aligned Digital AI Creator skills for '||r.title||'.' and short_intro='Draft source-aligned Digital AI Creator module.' and status='draft' and xp_value=625 and core_xp=625 and intro_core_xp=50 and video_core_xp=100 and assignment_core_xp=350 and mastery_core_xp=125 and core_unlock_threshold=438 and bonus_xp_available=0 and jpac_tool_activity='{}'::jsonb and real_world_activity=jsonb_build_object('title',r.title||' Instructor-Guided AI Lab','instructions','Practice creative direction, prompting, references, iteration, continuity, production, and documentation in a teacher-approved private or simulated workflow. No external account, public posting, or independent use of age-restricted tools is required.') and career_connection='' and not portfolio_moment and video_brief='MEDIA NEEDS REVIEW: no media is activated.' and review_notes=v_review and lab_tool_id is null and active_instructional_media_id is null and primary_video_url is null and approved_by is null and approved_at is null) then raise exception 'Incompatible Digital AI Creator module L% M%',r.level,r.num; end if;

  if v_module_created is distinct from true then
   if (select count(*) from public.lessons where module_id=v_module)<>3
   or (select count(*) from public.lessons where module_id=v_module and status='draft' and xp_value=0 and title in(r.title||': Creative Direction Foundations and AI Safety',r.title||': Guided AI Production and Iteration',r.title||': Professional Delivery and Reflection'))<>3
   or (select count(*) from public.activities where module_id=v_module)<>2
   or (select count(*) from public.activities where module_id=v_module and title=r.title||' Guided Practice' and status='draft' and activity_type='practice' and not required and xp_reward=0 and xp_type='bonus')<>1
   or (select count(*) from public.activities where module_id=v_module and title=r.title||' Core Challenge' and status='draft' and activity_type='performance' and required and xp_reward=350 and xp_type='core' and passing_score=70 and allows_resubmission and rubric=v_rubric)<>1
   then raise exception 'Existing Digital AI Creator module children are not exact-compatible L% M%',r.level,r.num; end if;
  else
   for i in 1..3 loop
    v_lesson_title:=case i when 1 then r.title||': Creative Direction Foundations and AI Safety' when 2 then r.title||': Guided AI Production and Iteration' else r.title||': Professional Delivery and Reflection' end;
    insert into public.lessons(id,module_id,title,description,lesson_type,duration_minutes,sort_order,xp_value,status,short_summary,learning_objective,content_blocks,technique_cues,common_mistakes,self_check,resource_brief)
    values(gen_random_uuid(),v_module,v_lesson_title,'Study and apply '||v_lesson_title||'.','interactive',25,i,0,'draft','Source-aligned Digital AI Creator lesson; draft review only.','Study and apply '||v_lesson_title||'.',jsonb_build_array('Plan the creative objective, references, prompt strategy, permissions, disclosure, privacy boundary, and safe workflow.','Iterate in an Instructor-Guided AI Lab or accessible private simulation without requiring an external account or independent use of age-restricted tools.','Review concept, prompt iterations, continuity, production quality, responsible-use decisions, documentation, and one next step.'),array['Use only teacher-approved, licensed, original, or permissioned references','Protect private information and real-person likenesses','Document AI assistance, sources, permissions, and meaningful iterations'],array['Uploading private, copyrighted, or unauthorized likeness material','Bypassing platform safeguards or age/access rules','Creating impersonation, deceptive media, misinformation, or undisclosed AI output'],'Can you demonstrate the objective and explain one creative decision and one responsible-AI safeguard?','AI-PROPOSED lesson details and accessibility alternatives require Digital AI Creator teacher review.');
   end loop;
   insert into public.activities(id,course_id,module_id,title,description,activity_type,instructions,submission_type,xp_reward,estimated_minutes,required,status,rubric,skill_tags,ai_summary,xp_type,passing_score,allows_resubmission,portfolio_candidate,certificate_eligible) values
   (gen_random_uuid(),v_course,v_module,r.title||' Guided Practice','Optional source-aligned Digital AI Creator preparation.','practice','Complete an Instructor-Guided AI Lab or accessible private simulation using teacher-approved, licensed, original, or permissioned references. Document prompts and iterations. No external account, public posting, or independent use of age-restricted tools is required.','none',0,20,false,'draft','{}'::jsonb,'{}'::text[],'AI-PROPOSED; optional, non-progressive, non-assessed; teacher review required.','bonus',70,true,false,false),
   (gen_random_uuid(),v_course,v_module,r.title||' Core Challenge','Required source-aligned Digital AI Creator Core Challenge.','performance','Submit a private creative brief, prompt-and-iteration record, storyboard, image/video artifact, production bible, campaign, pitch, reflection, or accessible equivalent through the existing JPAC submission and teacher-review workflow. Use only teacher-approved, licensed, original, or permissioned references; document AI assistance, sources, consent, likeness permissions, and disclosure; do not upload private or unauthorized material, bypass safeguards, impersonate real people, create deceptive media or misinformation, open external accounts, publish, or use age-restricted tools independently.','file',350,30,true,'draft',v_rubric,'{}'::text[],'AI-PROPOSED; teacher review required; Aria advisory only.','core',70,true,false,false);
  end if;
  v_level:=null; v_module:=null; v_module_created:=false;
 end loop;
end $$;
commit;
