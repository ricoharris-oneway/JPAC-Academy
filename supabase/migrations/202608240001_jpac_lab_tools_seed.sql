-- Seed the reviewed JPAC Creative Studio tool catalog and Singing-only mappings.
-- Tools remain non-student-visible in testing and have no external launch URLs.
begin;

do $$
declare
  v_singing uuid;
  v_tools integer;
  v_expected integer;
begin
  select id into v_singing from public.courses where slug='singing' and title='Singing';
  if v_singing is null or (select count(*) from public.courses where slug='singing' and title='Singing')<>1 then
    raise exception 'Exactly one Singing course is required';
  end if;

  select count(*) into v_tools from public.lab_tools;
  select count(*) into v_expected from public.lab_tools where slug in(
    'vocal-practice-planner','performance-prep-checklist','assignment-practice-builder',
    'script-scene-rehearsal-tool','dance-rehearsal-tracker','songwriting-idea-pad',
    'video-shot-planner','portfolio-builder-checklist'
  ) and admin_notes='Seeded by 202608240001_jpac_lab_tools_seed';
  if not (v_tools=0 or (v_tools=8 and v_expected=8)) then
    raise exception 'Unexpected lab_tools baseline: total %, recognized seed rows %',v_tools,v_expected;
  end if;

  insert into public.lab_tools(
    slug,name,description,category,tool_type,launch_url,icon,xp_reward,status,sort_order,
    version,estimated_minutes,ai_recommended,student_instructions,admin_notes
  ) values
    ('vocal-practice-planner','Vocal Practice Planner','Plan a focused vocal warmup, technique goal, repertoire goal, and reflection.','Singing','built_in',null,'microphone',0,'testing',10,'1.0.0',15,false,'Use this guided planner to prepare a safe, focused vocal practice session.','Seeded by 202608240001_jpac_lab_tools_seed'),
    ('performance-prep-checklist','Performance Prep Checklist','Prepare repertoire, staging, materials, mindset, and final performance checks.','Performance','built_in',null,'clipboard-check',0,'testing',20,'1.0.0',15,false,'Review each preparation area before a rehearsal, recording, or showcase.','Seeded by 202608240001_jpac_lab_tools_seed'),
    ('assignment-practice-builder','Assignment Practice Builder','Break an approved assignment into small rehearsal steps and a final readiness check.','Practice','built_in',null,'list-checks',0,'testing',30,'1.0.0',20,false,'Build a practice sequence without changing the assignment or submitting evidence.','Seeded by 202608240001_jpac_lab_tools_seed'),
    ('script-scene-rehearsal-tool','Script & Scene Rehearsal Tool','Plan character choices, beats, objectives, and rehearsal notes for a scene.','Acting','built_in',null,'theater',0,'testing',40,'1.0.0',20,false,'Use approved scripts and record rehearsal notes without uploading copyrighted material.','Seeded by 202608240001_jpac_lab_tools_seed'),
    ('dance-rehearsal-tracker','Dance Rehearsal Tracker','Track choreography sections, musicality, technique focus, and rehearsal reflections.','Dance','built_in',null,'activity',0,'testing',50,'1.0.0',20,false,'Track rehearsal goals and reflections without collecting location or health data.','Seeded by 202608240001_jpac_lab_tools_seed'),
    ('songwriting-idea-pad','Songwriting Idea Pad','Organize an original song concept, hook, structure, lyrics, and revision notes.','Music','built_in',null,'music',0,'testing',60,'1.0.0',20,false,'Develop original ideas and avoid copying protected lyrics or recordings.','Seeded by 202608240001_jpac_lab_tools_seed'),
    ('video-shot-planner','Video Shot Planner','Plan scenes, shots, camera movement, audio needs, and an editing checklist.','Video','built_in',null,'video',0,'testing',70,'1.0.0',20,false,'Plan only approved productions and do not include private contact or location details.','Seeded by 202608240001_jpac_lab_tools_seed'),
    ('portfolio-builder-checklist','Portfolio Builder Checklist','Review approved work, presentation quality, reflection, permissions, and portfolio readiness.','Portfolio','built_in',null,'award',0,'testing',80,'1.0.0',15,false,'Use only approved work and confirm permission before including names, images, or media.','Seeded by 202608240001_jpac_lab_tools_seed')
  on conflict(slug) do nothing;

  if (select count(*) from public.lab_tools where slug in(
    'vocal-practice-planner','performance-prep-checklist','assignment-practice-builder',
    'script-scene-rehearsal-tool','dance-rehearsal-tracker','songwriting-idea-pad',
    'video-shot-planner','portfolio-builder-checklist'
  ) and status='testing' and tool_type='built_in' and launch_url is null and xp_reward=0
    and admin_notes='Seeded by 202608240001_jpac_lab_tools_seed')<>8 then
    raise exception 'Expected eight exact non-visible seeded lab tools';
  end if;

  insert into public.lab_tool_courses(lab_tool_id,course_id,recommended,required,sort_order)
  select t.id,v_singing,true,false,x.sort_order
  from (values
    ('vocal-practice-planner',10),
    ('performance-prep-checklist',20),
    ('assignment-practice-builder',30),
    ('portfolio-builder-checklist',40)
  ) x(slug,sort_order)
  join public.lab_tools t on t.slug=x.slug and t.admin_notes='Seeded by 202608240001_jpac_lab_tools_seed'
  on conflict(lab_tool_id,course_id) do nothing;

  if (select count(*) from public.lab_tool_courses ltc join public.lab_tools t on t.id=ltc.lab_tool_id
    where t.admin_notes='Seeded by 202608240001_jpac_lab_tools_seed')<>4 then
    raise exception 'Expected exactly four Singing-only seed mappings';
  end if;
  if exists(
    select 1 from public.lab_tool_courses ltc join public.lab_tools t on t.id=ltc.lab_tool_id
    join public.courses c on c.id=ltc.course_id
    where t.admin_notes='Seeded by 202608240001_jpac_lab_tools_seed' and c.slug<>'singing'
  ) then raise exception 'Seed tools must not be assigned outside Singing'; end if;
end;
$$;

commit;
