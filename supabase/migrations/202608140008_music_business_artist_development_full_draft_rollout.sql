-- JPAC Music Business / Artist Development 48-module draft rollout. Run only after preflight PASS and explicit approval.
begin;
do $$
declare
 v_course uuid; v_level uuid; v_module uuid; v_lesson_title text; v_rubric jsonb; v_module_created boolean; r record; i int; v_review text;
 v_marker constant text := 'Music Business / Artist Development full draft rollout 202608140008';
 v_levels constant text[] := array['Beginner / Artist Explorer','Intermediate / Artist Builder','Advanced / Artist Strategist','Master / Creative Entrepreneur'];
 v_certificates constant text[] := array['JPAC Artist Explorer Certificate','JPAC Artist Builder Certificate','JPAC Artist Strategist Certificate','JPAC Master Artist Entrepreneur Certificate'];
begin
 if (select count(*) from public.courses where slug='music-business')<>1 then raise exception 'Expected exactly one canonical music-business course'; end if;
 select id into v_course from public.courses where slug='music-business' for share;
 if not exists(select 1 from public.courses where id=v_course and title in('Music Business','Music Business / Artist Development')) then raise exception 'Existing music-business course title is incompatible with rollout'; end if;
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
 then raise exception 'Music Business / Artist Development student/evidence dependencies block rollout'; end if;
 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress') and (select count(*) from regexp_matches(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m\.status=''published''','g'))=2 and strpos(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m.status<>''archived''')=0)<>2 then raise exception 'Safe Draft Isolation is not active'; end if;
 if (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='enrollments' and t.tgname='enrollments_enforce_canonical_progress' and not t.tgisinternal and t.tgenabled<>'D')<>1 then raise exception 'Canonical enrollment progress trigger missing'; end if;

 update public.courses set title='Music Business / Artist Development' where id=v_course and slug='music-business' and title='Music Business';

 v_rubric:=jsonb_build_object('criteria',jsonb_build_array(
  jsonb_build_object('name','Artist Identity, Brand & Audience Strategy','weight',20,'bands',jsonb_build_object('Exceeds','Artist identity, brand, and audience strategy consistently exceed the approved standard.','Meets','Artist identity, brand, and audience strategy meet the approved standard.','Developing','Artist identity, brand, and audience strategy partially meet the standard.','Not Yet','Artist identity, brand, and audience strategy do not yet meet the standard.')),
  jsonb_build_object('name','Business, Rights & Revenue Understanding','weight',20,'bands',jsonb_build_object('Exceeds','Business, rights, and revenue understanding consistently exceed the approved standard.','Meets','Business, rights, and revenue understanding meet the approved standard.','Developing','Business, rights, and revenue understanding partially meet the standard.','Not Yet','Business, rights, and revenue understanding do not yet meet the standard.')),
  jsonb_build_object('name','Marketing, Content & Campaign Planning','weight',20,'bands',jsonb_build_object('Exceeds','Marketing, content, and campaign planning consistently exceed the approved standard.','Meets','Marketing, content, and campaign planning meet the approved standard.','Developing','Marketing, content, and campaign planning partially meet the standard.','Not Yet','Marketing, content, and campaign planning do not yet meet the standard.')),
  jsonb_build_object('name','Professional Communication, Teamwork & Leadership','weight',20,'bands',jsonb_build_object('Exceeds','Professional communication, teamwork, and leadership consistently exceed the approved standard.','Meets','Professional communication, teamwork, and leadership meet the approved standard.','Developing','Professional communication, teamwork, and leadership partially meet the standard.','Not Yet','Professional communication, teamwork, and leadership do not yet meet the standard.')),
  jsonb_build_object('name','Professional Delivery, Presentation & Reflection','weight',20,'bands',jsonb_build_object('Exceeds','Professional delivery, presentation, and reflection consistently exceed the approved standard.','Meets','Professional delivery, presentation, and reflection meet the approved standard.','Developing','Professional delivery, presentation, and reflection partially meet the standard.','Not Yet','Professional delivery, presentation, and reflection do not yet meet the standard.'))
 ));

 for r in select * from jsonb_to_recordset('[
 {"level":1,"num":1,"sort":1,"title":"Welcome to the Music Business"},
 {"level":1,"num":2,"sort":2,"title":"Who Is an Artist?"},
 {"level":1,"num":3,"sort":3,"title":"Artist Names & First Impressions"},
 {"level":1,"num":4,"sort":4,"title":"Discovering Your Audience"},
 {"level":1,"num":5,"sort":5,"title":"Colors, Images & Artist Branding"},
 {"level":1,"num":6,"sort":6,"title":"Your Artist Story"},
 {"level":1,"num":7,"sort":7,"title":"Singles, EPs & Albums"},
 {"level":1,"num":8,"sort":8,"title":"Streaming & Digital Music"},
 {"level":1,"num":9,"sort":9,"title":"Social Media for Artists"},
 {"level":1,"num":10,"sort":10,"title":"Writing Your Artist Bio"},
 {"level":1,"num":11,"sort":11,"title":"Goals & Your Artist Roadmap"},
 {"level":1,"num":12,"sort":12,"title":"Beginner Showcase: My Artist Starter Kit"},
 {"level":2,"num":1,"sort":13,"title":"Brand Strategy & Consistency"},
 {"level":2,"num":2,"sort":14,"title":"Content Strategy"},
 {"level":2,"num":3,"sort":15,"title":"Planning a Single Release"},
 {"level":2,"num":4,"sort":16,"title":"Music Distribution"},
 {"level":2,"num":5,"sort":17,"title":"How Music Makes Money"},
 {"level":2,"num":6,"sort":18,"title":"Copyright & Ownership Basics"},
 {"level":2,"num":7,"sort":19,"title":"Performing & Live Shows"},
 {"level":2,"num":8,"sort":20,"title":"Music Marketing"},
 {"level":2,"num":9,"sort":21,"title":"Networking & Professional Communication"},
 {"level":2,"num":10,"sort":22,"title":"Building Your Artist Team"},
 {"level":2,"num":11,"sort":23,"title":"Creating an Artist Campaign"},
 {"level":2,"num":12,"sort":24,"title":"Intermediate Showcase: The Mock Single Release"},
 {"level":3,"num":1,"sort":25,"title":"The Artist as a Business"},
 {"level":3,"num":2,"sort":26,"title":"Revenue Streams & Artist Economics"},
 {"level":3,"num":3,"sort":27,"title":"Publishing & Songwriting Royalties"},
 {"level":3,"num":4,"sort":28,"title":"Record Deals & Agreements"},
 {"level":3,"num":5,"sort":29,"title":"Building & Managing an Artist Team"},
 {"level":3,"num":6,"sort":30,"title":"Artist Budgeting"},
 {"level":3,"num":7,"sort":31,"title":"Advanced Fan Development"},
 {"level":3,"num":8,"sort":32,"title":"Public Relations & Media"},
 {"level":3,"num":9,"sort":33,"title":"Sponsorships & Brand Partnerships"},
 {"level":3,"num":10,"sort":34,"title":"EPKs & Professional Materials"},
 {"level":3,"num":11,"sort":35,"title":"Career Planning & Goal Setting"},
 {"level":3,"num":12,"sort":36,"title":"Advanced Showcase: JPAC Artist Launch"},
 {"level":4,"num":1,"sort":37,"title":"Developing Your Signature Artist Position"},
 {"level":4,"num":2,"sort":38,"title":"Advanced Audience Strategy"},
 {"level":4,"num":3,"sort":39,"title":"Artist Data & Performance Metrics"},
 {"level":4,"num":4,"sort":40,"title":"Professional Negotiation & Communication"},
 {"level":4,"num":5,"sort":41,"title":"Advanced Copyright & Rights Management"},
 {"level":4,"num":6,"sort":42,"title":"Royalty Systems & Registration Concepts"},
 {"level":4,"num":7,"sort":43,"title":"Artist Management & Leadership"},
 {"level":4,"num":8,"sort":44,"title":"Partnerships, Sponsorship & Strategic Growth"},
 {"level":4,"num":9,"sort":45,"title":"Touring, Events & Experience Design"},
 {"level":4,"num":10,"sort":46,"title":"Building a Sustainable Artist Career"},
 {"level":4,"num":11,"sort":47,"title":"Professional Artist Portfolio & Pitch"},
 {"level":4,"num":12,"sort":48,"title":"Master''s Magnum Opus: The JPAC Artist Enterprise"}
 ]'::jsonb) as x(level int,num int,sort int,title text) order by sort loop
  select id into v_level from public.course_levels where course_id=v_course and level_number=r.level;
  if v_level is null then
   insert into public.course_levels(id,course_id,level_number,title,description,learning_objectives,status,core_xp_target,review_notes)
   values(gen_random_uuid(),v_course,r.level,v_levels[r.level],'Draft Music Business / Artist Development level; Program PDF source review only.',array['Develop source-aligned artist identity, business, rights, revenue, marketing, communication, leadership, and professional delivery skills safely.'],'draft',7500,v_marker||'; batch-created level; canonical 12-module level; inactive certificate intent: '||v_certificates[r.level]||'.') returning id into v_level;
  elsif not exists(select 1 from public.course_levels where id=v_level and title=v_levels[r.level] and description='Draft Music Business / Artist Development level; Program PDF source review only.' and learning_objectives=array['Develop source-aligned artist identity, business, rights, revenue, marketing, communication, leadership, and professional delivery skills safely.'] and status='draft' and core_xp_target=7500 and review_notes like '%inactive certificate intent: '||v_certificates[r.level]||'.%' and approved_by is null and approved_at is null) then raise exception 'Incompatible Music Business / Artist Development level %',r.level; end if;

  v_review:=v_marker||'; source-aligned module. MEDIA NEEDS REVIEW; NEEDS CATALOG REVIEW; RIGHTS/LEGAL REVIEW; FINANCIAL LITERACY REVIEW; CONTRACT/AGREEMENT REVIEW; MINOR SAFETY/PRIVACY REVIEW; COLLABORATION/CONSENT REVIEW; BRAND/SPONSORSHIP REVIEW; TOURING/EVENT SAFETY REVIEW; SCOPE REVIEW; no media or tool records are created; platforms, distributors, PROs, streaming services, social platforms, sponsors, venues, brands, and third-party tools are conceptual examples only; no external accounts or private contact with unknown adults; no individualized legal, contract, tax, investment, or financial advice; JPAC-native private submission only.';
  if r.num=12 then v_review:=v_review||' Approved level capstone; certificate intent is documented but inactive.'; end if;

  select id into v_module from public.course_modules where course_id=v_course and (sort_order=r.sort or (course_level_id=v_level and level_module_number=r.num));
  if v_module is null then
   insert into public.course_modules(id,course_id,course_level_id,level_module_number,title,description,short_intro,sort_order,xp_value,core_xp,intro_core_xp,video_core_xp,assignment_core_xp,mastery_core_xp,core_unlock_threshold,bonus_xp_available,jpac_tool_activity,real_world_activity,career_connection,portfolio_moment,status,video_brief,aria_coaching_targets,career_mission_ideas,review_notes)
   values(gen_random_uuid(),v_course,v_level,r.num,r.title,'Develop and demonstrate source-aligned Music Business / Artist Development skills for '||r.title||'.','Draft source-aligned Music Business / Artist Development module.',r.sort,625,625,50,100,350,125,438,0,'{}'::jsonb,jsonb_build_object('title',r.title||' Guided Practice','instructions','Practice the approved objective using teacher-approved private simulations, supplied scenarios, written plans, presentations, or accessible alternatives. Platforms and third-party services are conceptual examples only; no external account is required.'),'',false,'draft','MEDIA NEEDS REVIEW: no media is activated.',jsonb_build_object('advisory_only',true,'targets',jsonb_build_array('artist identity and ethical audience strategy','business and revenue literacy','rights and ownership literacy','marketing and content planning','campaign design','professional communication','teamwork and leadership','safe collaboration and consent','minor privacy and safety','professional presentation','reflection and next steps'),'prohibited',jsonb_build_array('create submitted work','provide individualized legal or financial advice','direct minors to contact unknown adults','assess','approve','award XP','grant mastery','unlock','publish')),'[]'::jsonb,v_review) returning id into v_module;
   v_module_created:=true;
  elsif not exists(select 1 from public.course_modules where id=v_module and course_level_id=v_level and level_module_number=r.num and sort_order=r.sort and title=r.title and description='Develop and demonstrate source-aligned Music Business / Artist Development skills for '||r.title||'.' and short_intro='Draft source-aligned Music Business / Artist Development module.' and status='draft' and xp_value=625 and core_xp=625 and intro_core_xp=50 and video_core_xp=100 and assignment_core_xp=350 and mastery_core_xp=125 and core_unlock_threshold=438 and bonus_xp_available=0 and jpac_tool_activity='{}'::jsonb and real_world_activity=jsonb_build_object('title',r.title||' Guided Practice','instructions','Practice the approved objective using teacher-approved private simulations, supplied scenarios, written plans, presentations, or accessible alternatives. Platforms and third-party services are conceptual examples only; no external account is required.') and career_connection='' and not portfolio_moment and video_brief='MEDIA NEEDS REVIEW: no media is activated.' and review_notes=v_review and lab_tool_id is null and active_instructional_media_id is null and primary_video_url is null and approved_by is null and approved_at is null) then raise exception 'Incompatible Music Business / Artist Development module L% M%',r.level,r.num; end if;

  if v_module_created is distinct from true then
   if (select count(*) from public.lessons where module_id=v_module)<>3
   or (select count(*) from public.lessons where module_id=v_module and status='draft' and xp_value=0 and title in(r.title||': Artist Strategy Foundations and Safety',r.title||': Guided Business and Campaign Application',r.title||': Professional Delivery and Reflection'))<>3
   or (select count(*) from public.activities where module_id=v_module)<>2
   or (select count(*) from public.activities where module_id=v_module and title=r.title||' Guided Practice' and status='draft' and activity_type='practice' and not required and xp_reward=0 and xp_type='bonus')<>1
   or (select count(*) from public.activities where module_id=v_module and title=r.title||' Core Challenge' and status='draft' and activity_type='performance' and required and xp_reward=350 and xp_type='core' and passing_score=70 and allows_resubmission and rubric=v_rubric)<>1
   then raise exception 'Existing Music Business / Artist Development module children are not exact-compatible L% M%',r.level,r.num; end if;
  else
   for i in 1..3 loop
    v_lesson_title:=case i when 1 then r.title||': Artist Strategy Foundations and Safety' when 2 then r.title||': Guided Business and Campaign Application' else r.title||': Professional Delivery and Reflection' end;
    insert into public.lessons(id,module_id,title,description,lesson_type,duration_minutes,sort_order,xp_value,status,short_summary,learning_objective,content_blocks,technique_cues,common_mistakes,self_check,resource_brief)
    values(gen_random_uuid(),v_module,v_lesson_title,'Study and apply '||v_lesson_title||'.','interactive',25,i,0,'draft','Source-aligned Music Business / Artist Development lesson; draft review only.','Study and apply '||v_lesson_title||'.',jsonb_build_array('Plan the artist-development objective, audience, rights, privacy, financial-literacy boundary, and safe workflow.','Apply the concept through a teacher-approved private simulation, supplied scenario, written plan, presentation, or accessible alternative.','Review identity and audience fit, business and rights reasoning, campaign planning, communication, professional delivery, reflection, and one next step.'),array['Protect student privacy and identity','Use educational examples rather than individualized legal or financial advice','Use accessible private or simulated alternatives'],array['Requiring public posting or external accounts','Giving individualized legal, contract, tax, investment, or financial advice','Private outreach to unknown adults or unapproved external collaboration'],'Can you demonstrate the objective and explain one strategic and one safety-conscious decision?','AI-PROPOSED lesson details and accessibility alternatives require Music Business / Artist Development teacher review.');
   end loop;
   insert into public.activities(id,course_id,module_id,title,description,activity_type,instructions,submission_type,xp_reward,estimated_minutes,required,status,rubric,skill_tags,ai_summary,xp_type,passing_score,allows_resubmission,portfolio_candidate,certificate_eligible) values
   (gen_random_uuid(),v_course,v_module,r.title||' Guided Practice','Optional source-aligned Music Business / Artist Development preparation.','practice','Practice through a teacher-approved private simulation, supplied scenario, written plan, presentation, or accessible alternative. Platforms and third-party services are conceptual examples only; no external account or public posting is required.','none',0,20,false,'draft','{}'::jsonb,'{}'::text[],'AI-PROPOSED; optional, non-progressive, non-assessed; teacher review required.','bonus',70,true,false,false),
   (gen_random_uuid(),v_course,v_module,r.title||' Core Challenge','Required source-aligned Music Business / Artist Development Core Challenge.','performance','Submit a private artist-development plan, brand or audience artifact, business or rights analysis, mock campaign, professional communication, presentation, reflection, or equivalent accessible evidence through the existing JPAC submission and teacher-review workflow. Use fictional or teacher-approved participants and examples; identify permissions and sources; do not publish, distribute, open external accounts, contact unknown adults, or act on legal or financial matters.','file',350,30,true,'draft',v_rubric,'{}'::text[],'AI-PROPOSED; teacher review required; Aria advisory only.','core',70,true,false,false);
  end if;
  v_level:=null; v_module:=null; v_module_created:=false;
 end loop;
end $$;
commit;
