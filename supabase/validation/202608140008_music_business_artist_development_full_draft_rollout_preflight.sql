-- JPAC Music Business / Artist Development 48-module rollout preflight. READ ONLY.
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
 ]'::jsonb) as x(level int,num int,sort int,title text)), course_identity as (
 select count(*)::int n,(array_agg(id order by id::text))[1] id from public.courses where slug='music-business-artist-development'
), sdi as (
 select count(*) filter(where (select count(*) from regexp_matches(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m\.status=''published''','g'))=2 and strpos(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m.status<>''archived''')=0)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress')
), canonical_trigger as (
 select count(*)::int n from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='enrollments' and t.tgname='enrollments_enforce_canonical_progress' and not t.tgisinternal and t.tgenabled<>'D'
), level_conflicts as (
 select count(*)::int n from public.course_levels l join public.courses c on c.id=l.course_id where c.slug='music-business-artist-development' and (l.level_number not between 1 and 4 or l.title is distinct from (array['Beginner / Artist Explorer','Intermediate / Artist Builder','Advanced / Artist Strategist','Master / Creative Entrepreneur'])[l.level_number] or l.description is distinct from 'Draft Music Business / Artist Development level; Program PDF source review only.' or l.learning_objectives is distinct from array['Develop source-aligned artist identity, business, rights, revenue, marketing, communication, leadership, and professional delivery skills safely.'] or l.status<>'draft' or l.core_xp_target<>7500 or l.review_notes not like '%inactive certificate intent: '||(array['JPAC Artist Explorer Certificate','JPAC Artist Builder Certificate','JPAC Artist Strategist Certificate','JPAC Master Artist Entrepreneur Certificate'])[l.level_number]||'.%' or l.approved_by is not null or l.approved_at is not null)
), unexpected_modules as (
 select count(*)::int n from public.course_modules m join public.courses c on c.id=m.course_id join public.course_levels l on l.id=m.course_level_id left join manifest e on e.level=l.level_number and e.num=m.level_module_number and e.sort=m.sort_order and e.title=m.title where c.slug='music-business-artist-development' and e.num is null
), module_conflicts as (
 select count(*)::int n from manifest e join public.courses c on c.slug='music-business-artist-development' left join public.course_levels l on l.course_id=c.id and l.level_number=e.level join public.course_modules m on m.course_id=c.id and (m.sort_order=e.sort or (m.course_level_id=l.id and m.level_module_number=e.num))
 where m.course_level_id is distinct from l.id or m.level_module_number is distinct from e.num or m.sort_order is distinct from e.sort or m.title is distinct from e.title or m.description is distinct from 'Develop and demonstrate source-aligned Music Business / Artist Development skills for '||e.title||'.' or m.short_intro is distinct from 'Draft source-aligned Music Business / Artist Development module.' or m.status<>'draft' or m.xp_value<>625 or m.core_xp<>625 or m.intro_core_xp<>50 or m.video_core_xp<>100 or m.assignment_core_xp<>350 or m.mastery_core_xp<>125 or m.core_unlock_threshold<>438 or m.bonus_xp_available<>0 or m.jpac_tool_activity is distinct from '{}'::jsonb or m.real_world_activity is distinct from jsonb_build_object('title',e.title||' Guided Practice','instructions','Practice the approved objective using teacher-approved private simulations, supplied scenarios, written plans, presentations, or accessible alternatives. Platforms and third-party services are conceptual examples only; no external account is required.') or m.career_connection is distinct from '' or m.portfolio_moment or m.video_brief is distinct from 'MEDIA NEEDS REVIEW: no media is activated.' or m.review_notes not like '%MEDIA NEEDS REVIEW%' or m.review_notes not like '%NEEDS CATALOG REVIEW%' or m.review_notes not like '%RIGHTS/LEGAL REVIEW%' or m.review_notes not like '%FINANCIAL LITERACY REVIEW%' or m.review_notes not like '%CONTRACT/AGREEMENT REVIEW%' or m.review_notes not like '%MINOR SAFETY/PRIVACY REVIEW%' or m.review_notes not like '%COLLABORATION/CONSENT REVIEW%' or m.review_notes not like '%BRAND/SPONSORSHIP REVIEW%' or m.review_notes not like '%TOURING/EVENT SAFETY REVIEW%' or m.review_notes not like '%SCOPE REVIEW%' or m.review_notes not like '%JPAC-native private submission%' or (e.num=12 and m.review_notes not like '%Approved level capstone%') or m.lab_tool_id is not null or m.active_instructional_media_id is not null or m.primary_video_url is not null or m.approved_by is not null or m.approved_at is not null
), sort_conflicts as (
 select count(*)::int n from public.course_modules m join public.courses c on c.id=m.course_id left join manifest e on e.sort=m.sort_order where c.slug='music-business-artist-development' and m.sort_order between 1 and 48 and (e.sort is null or m.title is distinct from e.title)
), child_conflicts as (
 select count(*)::int n from manifest e join public.courses c on c.slug='music-business-artist-development' join public.course_levels l on l.course_id=c.id and l.level_number=e.level join public.course_modules m on m.course_level_id=l.id and m.level_module_number=e.num
 where (exists(select 1 from public.lessons where module_id=m.id) or exists(select 1 from public.activities where module_id=m.id)) and ((select count(*) from public.lessons where module_id=m.id)<>3 or (select count(*) from public.lessons where module_id=m.id and status='draft' and xp_value=0 and title in(e.title||': Artist Strategy Foundations and Safety',e.title||': Guided Business and Campaign Application',e.title||': Professional Delivery and Reflection'))<>3 or (select count(*) from public.activities where module_id=m.id)<>2 or (select count(*) from public.activities where module_id=m.id and title=e.title||' Guided Practice' and status='draft' and activity_type='practice' and not required and xp_reward=0 and xp_type='bonus')<>1 or (select count(*) from public.activities where module_id=m.id and title=e.title||' Core Challenge' and status='draft' and activity_type='performance' and required and xp_reward=350 and xp_type='core' and passing_score=70 and allows_resubmission and jsonb_array_length(rubric->'criteria')=5 and (select sum((x->>'weight')::int) from jsonb_array_elements(rubric->'criteria') x)=100)<>1)
), assets as (
 select (select count(*) from public.module_instructional_media mi join public.course_modules m on m.id=mi.module_id where m.course_id=(select id from course_identity))::int media,(select count(*) from public.lab_tool_courses where course_id=(select id from course_identity))::int tools
), deps as (
 select (select count(*) from public.enrollments where course_id=(select id from course_identity))+(select count(*) from public.submissions s join public.activities a on a.id=s.activity_id where a.course_id=(select id from course_identity))+(select count(*) from public.lesson_progress p join public.lessons l on l.id=p.lesson_id join public.course_modules m on m.id=l.module_id where m.course_id=(select id from course_identity))+(select count(*) from public.activity_progress p join public.activities a on a.id=p.activity_id where a.course_id=(select id from course_identity))+(select count(*) from public.practice_logs p join public.activities a on a.id=p.activity_id where a.course_id=(select id from course_identity))+(select count(*) from public.xp_ledger where course_id=(select id from course_identity))+(select count(*) from public.certificates where course_id=(select id from course_identity))+(select count(*) from public.portfolio_projects p join public.activities a on a.id=p.activity_id where a.course_id=(select id from course_identity)) n
), protected_counts as (
 select count(*) filter(where c.slug='singing' and m.id is not null)::int singing,count(*) filter(where c.slug='piano' and m.id is not null)::int piano,count(*) filter(where c.slug='guitar' and m.id is not null)::int guitar,count(*) filter(where c.slug='acting' and m.id is not null)::int acting,count(*) filter(where c.slug='dance' and m.id is not null)::int dance,count(*) filter(where c.slug='video-production' and m.id is not null)::int video_production,count(*) filter(where c.slug='audio-engineering' and m.id is not null)::int audio_engineering,count(*) filter(where c.slug='music-production-songwriting' and m.id is not null)::int music_production_songwriting from public.courses c left join public.course_modules m on m.course_id=c.id
), student_state as (
 select (select count(*) from public.xp_ledger)::int xp_ledger,(select count(*) from public.enrollments)::int enrollments,(select count(*) from public.submissions)::int submissions,(select count(*) from public.certificates)::int certificates,(select count(*) from public.lesson_progress)::int lesson_progress
), baselines as (
 select upper(c.slug)||'_CURRICULUM_BASELINE' code,md5(coalesce(string_agg(v,E'\n' order by v),'')) details from public.courses c cross join lateral (select m.id||':'||m.status||':'||m.title v from public.course_modules m where m.course_id=c.id union all select l.id||':'||l.status||':'||l.title from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_id=c.id union all select a.id||':'||a.status||':'||a.title from public.activities a where a.course_id=c.id) q where c.slug in('singing','piano','guitar','acting','dance','video-production','audio-engineering','music-production-songwriting') group by c.slug
 union all select 'STUDENT_STATE_BASELINE',jsonb_build_object('enrollments',(select count(*) from public.enrollments),'lesson_progress',(select count(*) from public.lesson_progress),'activity_progress',(select count(*) from public.activity_progress),'practice_logs',(select count(*) from public.practice_logs),'submissions',(select count(*) from public.submissions),'xp_ledger',(select count(*) from public.xp_ledger),'certificates',(select count(*) from public.certificates),'portfolio_projects',(select count(*) from public.portfolio_projects))::text
 union all select 'ASSIGNMENT_SWAP_BASELINE',jsonb_build_object('definition_hash',(select md5(coalesce(string_agg(p.proname||':'||pg_get_functiondef(p.oid),E'\n' order by p.proname),'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('curriculum_swap_module_assignment_v1','curriculum_rollback_assignment_swap_v1')),'audit_rows',(select count(*) from public.curriculum_assignment_swap_operations))::text
), findings as (
 select 'IDENTITY' section,'MUSIC_BUSINESS_ARTIST_DEVELOPMENT_IDENTITY' code,case when n=1 then 'PASS' else 'BLOCK' end result,format('canonical Music Business / Artist Development course rows=%s; id=%s',n,coalesce(id::text,'NULL')) details from course_identity
 union all select 'DRAFT_ISOLATION','SAFE_DRAFT_ISOLATION',case when s.n=2 and t.n=1 then 'PASS' else 'BLOCK' end,format('published-only functions=%s/2; trigger=%s',s.n,t.n) from sdi s cross join canonical_trigger t
 union all select 'COMPATIBILITY','LEVEL_COMPATIBILITY',case when n=0 then 'PASS' else 'BLOCK' end,format('incompatible levels=%s',n) from level_conflicts
 union all select 'CLASSIFICATION','ONLY_APPROVED_MANIFEST',case when n=0 then 'PASS' else 'BLOCK' end,format('unexpected/HOLD/OUT-OF-SCOPE/Tutor-only modules=%s',n) from unexpected_modules
 union all select 'COMPATIBILITY','MODULE_COMPATIBILITY',case when n=0 then 'PASS' else 'BLOCK' end,format('incompatible modules=%s',n) from module_conflicts
 union all select 'COMPATIBILITY','GLOBAL_SORT_ORDER',case when n=0 then 'PASS' else 'BLOCK' end,format('incompatible global sort rows=%s',n) from sort_conflicts
 union all select 'COMPATIBILITY','CHILD_COMPATIBILITY',case when n=0 then 'PASS' else 'BLOCK' end,format('incompatible populated module children=%s',n) from child_conflicts
 union all select 'EVIDENCE','MUSIC_BUSINESS_ARTIST_DEVELOPMENT_DEPENDENCIES',case when n=0 then 'PASS' else 'BLOCK' end,format('Music Business / Artist Development evidence/student dependencies=%s',n) from deps
 union all select 'ASSETS','MEDIA_TOOL_BINDINGS',case when media=0 and tools=0 then 'PASS' else 'BLOCK' end,format('instructional media rows=%s; Lab/tool course bindings=%s',media,tools) from assets
 union all select 'MANIFEST','MANIFEST_COUNTS',case when count(*)=48 and count(*) filter(where level=1)=12 and count(*) filter(where level=2)=12 and count(*) filter(where level=3)=12 and count(*) filter(where level=4)=12 and min(sort)=1 and max(sort)=48 and count(distinct sort)=48 then 'PASS' else 'BLOCK' end,format('modules=%s; L1=%s; L2=%s; L3=%s; L4=%s; sort=%s-%s',count(*),count(*) filter(where level=1),count(*) filter(where level=2),count(*) filter(where level=3),count(*) filter(where level=4),min(sort),max(sort)) from manifest
 union all select 'PRESERVATION','PROTECTED_COURSE_COUNTS',case when singing=40 and piano=49 and guitar=50 and acting=46 and dance=47 and video_production=49 and audio_engineering=48 and music_production_songwriting=48 then 'PASS' else 'BLOCK' end,format('Singing=%s/40; Piano=%s/49; Guitar=%s/50; Acting=%s/46; Dance=%s/47; Video Production=%s/49; Audio Engineering=%s/48; Music Production/Songwriting=%s/48',singing,piano,guitar,acting,dance,video_production,audio_engineering,music_production_songwriting) from protected_counts
 union all select 'PRESERVATION','STUDENT_STATE_COUNTS',case when xp_ledger=5 and enrollments=1 and submissions=1 and certificates=0 and lesson_progress=5 then 'PASS' else 'BLOCK' end,format('xp_ledger=%s/5; enrollments=%s/1; submissions=%s/1; certificates=%s/0; lesson_progress=%s/5',xp_ledger,enrollments,submissions,certificates,lesson_progress) from student_state
 union all select 'PRESERVATION',code,'INFO','Capture and compare after migration: '||details from baselines
), blockers as(select count(*) filter(where result='BLOCK')::int n from findings)
select section as report_section,code,result,details from findings
union all select 'READINESS','BLOCKERS',case when n=0 then 'PASS' else 'BLOCK' end,format('blocking findings=%s',n) from blockers
union all select 'READINESS','OVERALL',case when n=0 then 'PASS' else 'BLOCK' end,case when n=0 then 'PASS: READY FOR MUSIC BUSINESS / ARTIST DEVELOPMENT DRAFT ROLLOUT MIGRATION' else 'BLOCK: DO NOT RUN MIGRATION' end from blockers
order by report_section,code;
rollback;
