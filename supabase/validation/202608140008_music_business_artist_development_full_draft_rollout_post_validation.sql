-- JPAC Music Business / Artist Development 48-module rollout post-validation. READ ONLY.
begin transaction read only;
with manifest as (select * from jsonb_to_recordset('[
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
 ]'::jsonb) as x(level int,num int,sort int,title text)), course_identity as(
 select count(*)::int n,(array_agg(id order by id::text))[1] id,(array_agg(slug order by id::text))[1] slug,(array_agg(title order by id::text))[1] title from public.courses where slug='music-business'
), counts as (
 select (select count(*) from public.course_levels where course_id=(select id from course_identity))::int levels,(select count(*) from public.course_modules where course_id=(select id from course_identity))::int modules,(select count(*) from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_id=(select id from course_identity))::int lessons,(select count(*) from public.activities where course_id=(select id from course_identity) and activity_type='practice')::int practices,(select count(*) from public.activities where course_id=(select id from course_identity) and activity_type='performance' and required and xp_type='core')::int challenges
), level_counts as (
 select l.level_number,count(m.id)::int modules from public.course_levels l left join public.course_modules m on m.course_level_id=l.id where l.course_id=(select id from course_identity) group by l.level_number
), certificate_intent as (
 select count(*)::int n from public.course_levels l where l.course_id=(select id from course_identity) and l.level_number between 1 and 4 and l.review_notes like '%inactive certificate intent: '||(array['JPAC Artist Explorer Certificate','JPAC Artist Builder Certificate','JPAC Artist Strategist Certificate','JPAC Master Artist Entrepreneur Certificate'])[l.level_number]||'.%'
), exact_manifest as (
 select count(*)::int exact from manifest e join public.course_levels l on l.course_id=(select id from course_identity) and l.level_number=e.level join public.course_modules m on m.course_level_id=l.id and m.level_module_number=e.num and m.sort_order=e.sort and m.title=e.title
), rubrics as (
 select count(*)::int challenges,coalesce(sum(jsonb_array_length(rubric->'criteria')),0)::int criteria,count(*) filter(where jsonb_array_length(rubric->'criteria')=5 and (select count(distinct x->>'name') from jsonb_array_elements(rubric->'criteria') x)=5 and not exists(select 1 from jsonb_array_elements(rubric->'criteria') x where x->>'name' not in ('Artist Identity, Brand & Audience Strategy','Business, Rights & Revenue Understanding','Marketing, Content & Campaign Planning','Professional Communication, Teamwork & Leadership','Professional Delivery, Presentation & Reflection') or (x->>'weight')::int<>20 or jsonb_typeof(x->'bands')<>'object' or (select count(*) from jsonb_object_keys(x->'bands'))<>4 or exists(select 1 from jsonb_each_text(x->'bands') b where nullif(btrim(b.value),'') is null)))::int valid from public.activities where course_id=(select id from course_identity) and activity_type='performance' and required and xp_type='core'
), safety as (
 select (select count(*) from public.course_levels where course_id=(select id from course_identity) and status<>'draft')+(select count(*) from public.course_modules where course_id=(select id from course_identity) and status<>'draft')+(select count(*) from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_id=(select id from course_identity) and l.status<>'draft')+(select count(*) from public.activities where course_id=(select id from course_identity) and status<>'draft') nondraft,
 (select count(*) from public.course_modules where course_id=(select id from course_identity) and status='draft' and core_xp=625 and intro_core_xp=50 and video_core_xp=100 and assignment_core_xp=350 and mastery_core_xp=125 and core_unlock_threshold=438 and lab_tool_id is null and active_instructional_media_id is null and primary_video_url is null and video_brief='MEDIA NEEDS REVIEW: no media is activated.' and jpac_tool_activity='{}'::jsonb) payloads,
 (select count(*) from public.course_modules where course_id=(select id from course_identity) and (core_xp<>625 or intro_core_xp<>50 or video_core_xp<>100 or assignment_core_xp<>350 or mastery_core_xp<>125 or core_unlock_threshold<>438)) noncanonical_xp,
 (select count(*) from public.module_instructional_media mi join public.course_modules m on m.id=mi.module_id where m.course_id=(select id from course_identity)) media,
 (select count(*) from public.course_modules where course_id=(select id from course_identity) and (lab_tool_id is not null or active_instructional_media_id is not null or primary_video_url is not null))+(select count(*) from public.lab_tool_courses where course_id=(select id from course_identity)) active_bound_references,
 (select count(*) from public.certificates where course_id=(select id from course_identity)) certificate_rows
), capstones as (
 select (select count(*) from public.course_modules m join public.course_levels l on l.id=m.course_level_id where m.course_id=(select id from course_identity) and l.level_number=1 and m.level_module_number=12 and m.title='Beginner Showcase: My Artist Starter Kit' and m.review_notes like '%Approved level capstone%')::int beginner,
 (select count(*) from public.course_modules m join public.course_levels l on l.id=m.course_level_id where m.course_id=(select id from course_identity) and l.level_number=2 and m.level_module_number=12 and m.title='Intermediate Showcase: The Mock Single Release' and m.review_notes like '%Approved level capstone%')::int intermediate,
 (select count(*) from public.course_modules m join public.course_levels l on l.id=m.course_level_id where m.course_id=(select id from course_identity) and l.level_number=3 and m.level_module_number=12 and m.title='Advanced Showcase: JPAC Artist Launch' and m.review_notes like '%Approved level capstone%')::int advanced,
 (select count(*) from public.course_modules m join public.course_levels l on l.id=m.course_level_id where m.course_id=(select id from course_identity) and l.level_number=4 and m.level_module_number=12 and m.title='Master''s Magnum Opus: The JPAC Artist Enterprise' and m.review_notes like '%Approved level capstone%')::int master
), review_flags as (
 select count(*) filter(where review_notes like '%MEDIA NEEDS REVIEW%' and review_notes like '%NEEDS CATALOG REVIEW%' and review_notes like '%RIGHTS/LEGAL REVIEW%' and review_notes like '%FINANCIAL LITERACY REVIEW%' and review_notes like '%CONTRACT/AGREEMENT REVIEW%' and review_notes like '%MINOR SAFETY/PRIVACY REVIEW%' and review_notes like '%COLLABORATION/CONSENT REVIEW%' and review_notes like '%BRAND/SPONSORSHIP REVIEW%' and review_notes like '%TOURING/EVENT SAFETY REVIEW%' and review_notes like '%SCOPE REVIEW%' and review_notes like '%JPAC-native private submission%')::int complete_flags
 from public.course_modules where course_id=(select id from course_identity)
), excluded as (
 select (select count(*) from public.course_modules where course_id=(select id from course_identity))-(select exact from exact_manifest) n
), deps as (
 select (select count(*) from public.enrollments where course_id=(select id from course_identity))+(select count(*) from public.submissions s join public.activities a on a.id=s.activity_id where a.course_id=(select id from course_identity))+(select count(*) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id join public.course_modules m on m.id=l.module_id where m.course_id=(select id from course_identity))+(select count(*) from public.activity_progress p join public.activities a on a.id=p.activity_id where a.course_id=(select id from course_identity))+(select count(*) from public.practice_logs p join public.activities a on a.id=p.activity_id where a.course_id=(select id from course_identity))+(select count(*) from public.xp_ledger where course_id=(select id from course_identity))+(select count(*) from public.certificates where course_id=(select id from course_identity))+(select count(*) from public.portfolio_projects p join public.activities a on a.id=p.activity_id where a.course_id=(select id from course_identity)) n
), draft_isolation as (
 select (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress') and (select count(*) from regexp_matches(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m\.status=''published''','g'))=2 and strpos(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m.status<>''archived''')=0)::int functions,(select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='enrollments' and t.tgname='enrollments_enforce_canonical_progress' and not t.tgisinternal and t.tgenabled<>'D')::int triggers
), protected_counts as (
 select count(*) filter(where c.slug='singing' and m.id is not null)::int singing,count(*) filter(where c.slug='piano' and m.id is not null)::int piano,count(*) filter(where c.slug='guitar' and m.id is not null)::int guitar,count(*) filter(where c.slug='acting' and m.id is not null)::int acting,count(*) filter(where c.slug='dance' and m.id is not null)::int dance,count(*) filter(where c.slug='video-production' and m.id is not null)::int video_production,count(*) filter(where c.slug='audio-engineering' and m.id is not null)::int audio_engineering,count(*) filter(where c.slug='music-production-songwriting' and m.id is not null)::int music_production_songwriting from public.courses c left join public.course_modules m on m.course_id=c.id
), student_state as (
 select (select count(*) from public.xp_ledger)::int xp_ledger,(select count(*) from public.enrollments)::int enrollments,(select count(*) from public.submissions)::int submissions,(select count(*) from public.certificates)::int certificates,(select count(*) from public.lesson_progress)::int lesson_progress
), assignment_swap as (
 select (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('curriculum_swap_module_assignment_v1','curriculum_rollback_assignment_swap_v1'))::int rpc_count,
 (select count(*) from public.curriculum_assignment_swap_operations)::int audit_rows
), baselines as (
 select upper(c.slug)||'_CURRICULUM_BASELINE' code,md5(coalesce(string_agg(v,E'\n' order by v),'')) details from public.courses c cross join lateral (select m.id||':'||m.status||':'||m.title v from public.course_modules m where m.course_id=c.id union all select l.id||':'||l.status||':'||l.title from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_id=c.id union all select a.id||':'||a.status||':'||a.title from public.activities a where a.course_id=c.id) q where c.slug in('singing','piano','guitar','acting','dance','video-production','audio-engineering','music-production-songwriting') group by c.slug
 union all select 'STUDENT_STATE_BASELINE',jsonb_build_object('enrollments',(select count(*) from public.enrollments),'lesson_progress',(select count(*) from public.lesson_progress),'activity_progress',(select count(*) from public.activity_progress),'practice_logs',(select count(*) from public.practice_logs),'submissions',(select count(*) from public.submissions),'xp_ledger',(select count(*) from public.xp_ledger),'certificates',(select count(*) from public.certificates),'portfolio_projects',(select count(*) from public.portfolio_projects))::text
 union all select 'ASSIGNMENT_SWAP_BASELINE',jsonb_build_object('definition_hash',(select md5(coalesce(string_agg(p.proname||':'||pg_get_functiondef(p.oid),E'\n' order by p.proname),'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('curriculum_swap_module_assignment_v1','curriculum_rollback_assignment_swap_v1')),'audit_rows',(select count(*) from public.curriculum_assignment_swap_operations))::text
), findings as (
 select 'IDENTITY' section,'MUSIC_BUSINESS_SHELL_IDENTITY' code,case when n=1 and slug='music-business' and title='Music Business / Artist Development' then 'PASS' else 'BLOCK' end result,format('rows=%s/1; slug=%s; title=%s',n,coalesce(slug,'NULL'),coalesce(title,'NULL')) details from course_identity
 union all select 'STRUCTURE','LEVELS',case when levels=4 then 'PASS' else 'BLOCK' end,format('levels=%s/4',levels) from counts
 union all select 'STRUCTURE','MODULES',case when modules=48 then 'PASS' else 'BLOCK' end,format('modules=%s/48',modules) from counts
 union all select 'STRUCTURE','LEVEL_MODULE_COUNTS',case when coalesce((select modules from level_counts where level_number=1),0)=12 and coalesce((select modules from level_counts where level_number=2),0)=12 and coalesce((select modules from level_counts where level_number=3),0)=12 and coalesce((select modules from level_counts where level_number=4),0)=12 then 'PASS' else 'BLOCK' end,(select coalesce(jsonb_object_agg(level_number,modules order by level_number),'{}'::jsonb)::text from level_counts)
 union all select 'STRUCTURE','CERTIFICATE_INTENT',case when n=4 then 'PASS' else 'BLOCK' end,format('inactive approved certificate intents=%s/4; certificate rows are not created',n) from certificate_intent
 union all select 'STRUCTURE','EXACT_MANIFEST',case when exact=48 then 'PASS' else 'BLOCK' end,format('exact canonical modules=%s/48',exact) from exact_manifest
 union all select 'STRUCTURE','LESSONS',case when lessons=144 then 'PASS' else 'BLOCK' end,format('lessons=%s/144',lessons) from counts
 union all select 'STRUCTURE','PRACTICES',case when practices=48 then 'PASS' else 'BLOCK' end,format('practices=%s/48',practices) from counts
 union all select 'STRUCTURE','CORE_CHALLENGES',case when challenges=48 then 'PASS' else 'BLOCK' end,format('Core Challenges=%s/48',challenges) from counts
 union all select 'ASSESSMENT','RUBRICS',case when challenges=48 and criteria=240 and valid=48 then 'PASS' else 'BLOCK' end,format('challenges=%s; criteria=%s/240; exact rubrics=%s/48',challenges,criteria,valid) from rubrics
 union all select 'SAFETY','DRAFT_ONLY',case when nondraft=0 then 'PASS' else 'BLOCK' end,format('non-draft records=%s',nondraft) from safety
 union all select 'SAFETY','CANONICAL_PAYLOAD',case when payloads=48 then 'PASS' else 'BLOCK' end,format('canonical draft modules=%s/48',payloads) from safety
 union all select 'SAFETY','NONCANONICAL_XP_MODULES',case when noncanonical_xp=0 then 'PASS' else 'BLOCK' end,format('noncanonical XP modules=%s',noncanonical_xp) from safety
 union all select 'SAFETY','MEDIA_TOOLS',case when media=0 and active_bound_references=0 then 'PASS' else 'BLOCK' end,format('media rows=%s; active/bound tool or media references=%s',media,active_bound_references) from safety
 union all select 'SAFETY','CERTIFICATE_ROWS',case when certificate_rows=0 then 'PASS' else 'BLOCK' end,format('certificate rows for course=%s',certificate_rows) from safety
 union all select 'SAFETY','MUSIC_BUSINESS_ARTIST_DEVELOPMENT_DEPENDENCIES',case when n=0 then 'PASS' else 'BLOCK' end,format('student/evidence dependencies=%s',n) from deps
 union all select 'CLASSIFICATION','EXCLUDED_ITEMS_ABSENT',case when n=0 then 'PASS' else 'BLOCK' end,format('HOLD/OUT-OF-SCOPE standalone modules=%s',n) from excluded
 union all select 'CAPSTONES','APPROVED_CAPSTONES',case when beginner=1 and intermediate=1 and advanced=1 and master=1 then 'PASS' else 'BLOCK' end,format('Beginner=%s/1; Intermediate=%s/1; Advanced=%s/1; Master=%s/1',beginner,intermediate,advanced,master) from capstones
 union all select 'CLASSIFICATION','REVIEW_FLAGS',case when complete_flags=48 then 'PASS' else 'BLOCK' end,format('modules with all required review flags=%s/48',complete_flags) from review_flags
 union all select 'SAFETY','SAFE_DRAFT_ISOLATION',case when functions=2 and triggers=1 then 'PASS' else 'BLOCK' end,format('published-only functions=%s/2; canonical trigger=%s',functions,triggers) from draft_isolation
 union all select 'PRESERVATION','PROTECTED_COURSE_COUNTS',case when singing=40 and piano=49 and guitar=50 and acting=46 and dance=47 and video_production=49 and audio_engineering=48 and music_production_songwriting=48 then 'PASS' else 'BLOCK' end,format('Singing=%s/40; Piano=%s/49; Guitar=%s/50; Acting=%s/46; Dance=%s/47; Video Production=%s/49; Audio Engineering=%s/48; Music Production/Songwriting=%s/48',singing,piano,guitar,acting,dance,video_production,audio_engineering,music_production_songwriting) from protected_counts
 union all select 'PRESERVATION','STUDENT_STATE_COUNTS',case when xp_ledger=5 and enrollments=1 and submissions=1 and certificates=0 and lesson_progress=5 then 'PASS' else 'BLOCK' end,format('xp_ledger=%s/5; enrollments=%s/1; submissions=%s/1; certificates=%s/0; lesson_progress=%s/5',xp_ledger,enrollments,submissions,certificates,lesson_progress) from student_state
 union all select 'PRESERVATION','ASSIGNMENT_SWAP_CONTRACT',case when rpc_count=2 and audit_rows=2 then 'PASS' else 'BLOCK' end,format('expected RPCs curriculum_swap_module_assignment_v1 + curriculum_rollback_assignment_swap_v1: found=%s/2; operations audit rows=%s/2',rpc_count,audit_rows) from assignment_swap
 union all select 'PRESERVATION',code,'INFO','Compare exactly with preflight: '||details from baselines
), blockers as(select count(*) filter(where result='BLOCK')::int n from findings)
select section as report_section,code,result,details from findings
union all select 'READINESS','BLOCKERS',case when n=0 then 'PASS' else 'BLOCK' end,format('blocking findings=%s',n) from blockers
union all select 'READINESS','OVERALL',case when n=0 then 'PASS' else 'BLOCK' end,case when n=0 then 'PASS: MUSIC BUSINESS / ARTIST DEVELOPMENT FULL DRAFT ROLLOUT VALID; COMPARE PRESERVATION BASELINES' else 'BLOCK: REVIEW MUSIC BUSINESS / ARTIST DEVELOPMENT ROLLOUT' end from blockers
order by report_section,code;
rollback;
