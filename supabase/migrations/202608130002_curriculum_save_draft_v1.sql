begin;

do $$
declare v_safe boolean;
begin
  with definitions as(
    select regexp_replace(pg_get_functiondef(p.oid),'\s+','','g') definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress')
  )
  select count(*)=2
    and bool_and((length(definition)-length(replace(definition,'m.status=''published''','')))/length('m.status=''published''')=2)
    and bool_and(strpos(definition,'m.status<>''archived''')=0)
  into v_safe from definitions;
  if not coalesce(v_safe,false) then raise exception 'Safe Draft Isolation is not active'; end if;
  if (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid
      where t.tgname='enrollments_enforce_canonical_progress' and c.oid='public.enrollments'::regclass
      and p.proname='jpac_enforce_canonical_enrollment_progress' and not t.tgisinternal and t.tgenabled<>'D')<>1 then
    raise exception 'Canonical enrollment progress trigger is missing or disabled';
  end if;
  if exists(select 1 from pg_trigger t where t.tgrelid in(
      'public.course_modules'::regclass,'public.lessons'::regclass,'public.activities'::regclass) and not t.tgisinternal) then
    raise exception 'Unexpected curriculum insert trigger requires review';
  end if;
end;
$$;

create function public.curriculum_save_module_as_draft_v1(import_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_operation_id uuid:=gen_random_uuid();
  v_course_id uuid;
  v_course_slug text;
  v_level_number integer;
  v_module_number integer;
  v_level_id uuid;
  v_module_id uuid:=gen_random_uuid();
  v_module jsonb;
  v_mission jsonb;
  v_xp jsonb;
  v_lesson jsonb;
  v_activity jsonb;
  v_practice jsonb;
  v_core jsonb;
  v_rubric jsonb;
  v_lesson_ids jsonb:='[]'::jsonb;
  v_activity_ids jsonb:='[]'::jsonb;
  v_created_id uuid;
  v_acknowledged jsonb;
  v_key text;
  v_rubric_total numeric;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator or developer access required';
  end if;

  if jsonb_typeof(import_payload) is distinct from 'object' then raise exception 'Import payload must be an object'; end if;
  if exists(select 1 from jsonb_object_keys(import_payload) as keys(key) where key not in(
    'target_course_id','contract','contract_version','export_scope','options','warnings','course','level','module','acknowledged_warning_codes'
  )) then raise exception 'Unsupported top-level import field'; end if;
  if import_payload->>'contract' is distinct from 'jpac-curriculum-export' or import_payload->>'contract_version' is distinct from '1.2.0' then
    raise exception 'Unsupported curriculum export contract or version';
  end if;
  if jsonb_typeof(import_payload->'export_scope') is distinct from 'object'
     or import_payload#>>'{export_scope,type}' is distinct from 'module' then raise exception 'Save as Draft v1 supports module scope only'; end if;
  if jsonb_typeof(import_payload->'options') is distinct from 'object'
     or (import_payload#>>'{options,include_database_ids}')::boolean is distinct from false
     or jsonb_path_exists(import_payload,'$.**.database_id') then raise exception 'Imported database IDs are not allowed'; end if;

  v_course_id:=nullif(import_payload->>'target_course_id','')::uuid;
  v_course_slug:=nullif(trim(import_payload#>>'{export_scope,course_slug}'),'');
  v_level_number:=nullif(import_payload#>>'{export_scope,level_number}','')::integer;
  v_module_number:=nullif(import_payload#>>'{export_scope,module_number}','')::integer;
  if v_course_id is null or v_course_slug is null or v_level_number is null or v_module_number is null
     or v_level_number<1 or v_module_number<1 then raise exception 'Target course, level, and module identity are required'; end if;
  if import_payload#>>'{course,course_slug}' is distinct from v_course_slug
     or nullif(import_payload#>>'{level,level_number}','')::integer is distinct from v_level_number
     or nullif(import_payload#>>'{module,module_number}','')::integer is distinct from v_module_number then
    raise exception 'Envelope and payload semantic identities do not match';
  end if;
  if (select count(*) from public.courses where id=v_course_id and slug=v_course_slug)<>1 then
    raise exception 'Target course identity is missing or mismatched';
  end if;
  if (select count(*) from public.course_levels where course_id=v_course_id and level_number=v_level_number)<>1 then
    raise exception 'Exact target course level is missing or ambiguous';
  end if;
  select id into v_level_id from public.course_levels
  where course_id=v_course_id and level_number=v_level_number for update;
  if exists(select 1 from public.course_modules where course_level_id=v_level_id and level_module_number=v_module_number) then
    raise exception 'Module identity already exists; overwrite and reuse are not supported';
  end if;

  if jsonb_typeof(import_payload->'warnings') is distinct from 'array'
     or jsonb_typeof(import_payload->'acknowledged_warning_codes') is distinct from 'array' then
    raise exception 'Warnings and acknowledged_warning_codes must be arrays';
  end if;
  v_acknowledged:=import_payload->'acknowledged_warning_codes';
  if exists(select 1 from jsonb_array_elements(import_payload->'warnings') w
    where jsonb_typeof(w) is distinct from 'object' or nullif(trim(w->>'code'),'') is null
       or not exists(select 1 from jsonb_array_elements_text(v_acknowledged) a(code) where a.code=w->>'code')) then
    raise exception 'Every source warning must have an explicit acknowledged code';
  end if;
  if exists(select 1 from jsonb_array_elements_text(v_acknowledged) a(code)
    where not exists(select 1 from jsonb_array_elements(import_payload->'warnings') w where w->>'code'=a.code)) then
    raise exception 'Acknowledged warning codes must correspond to supplied source warnings';
  end if;

  -- Reject identifiers, activation/configuration links, academic workflow inputs, and student evidence anywhere in the payload.
  foreach v_key in array array[
    'student_id','enrollment_id','submission_id','review_id','certificate_id','portfolio_project_id','evidence_id','xp_ledger_id',
    'approved_by','approved_at','published_at','completed_at','mastered_at','progress','unlock','award_xp','workflow_function',
    'lab_tool_id','tool_id','catalog_id','launch_url','active_instructional_media_id','media_id','provider_media_id','replaces_media_id'
  ] loop
    if jsonb_path_exists(import_payload,('$.'||'**.'||v_key)::jsonpath) then
      raise exception 'Prohibited import field: %',v_key;
    end if;
  end loop;

  v_module:=import_payload->'module'; v_mission:=v_module->'mission'; v_xp:=v_module->'xp';
  if jsonb_typeof(v_module) is distinct from 'object' or exists(select 1 from jsonb_object_keys(v_module) as keys(key) where key not in(
    'module_number','sort_order','title','description','status','mission','xp','lessons','activities','media','tool','career_path_attachments'
  )) then raise exception 'Malformed or unsupported module payload'; end if;
  if jsonb_typeof(v_mission) is distinct from 'object' or jsonb_typeof(v_xp) is distinct from 'object'
     or jsonb_typeof(v_module->'lessons') is distinct from 'array' or jsonb_array_length(v_module->'lessons')<>3
     or jsonb_typeof(v_module->'activities') is distinct from 'object' then raise exception 'Module containers do not match the v1 contract'; end if;
  if exists(select 1 from jsonb_object_keys(v_mission) as keys(key) where key not in(
    'short_intro','career_connection','real_world_activity','aria_coaching_targets','career_mission_ideas','portfolio_moment','portfolio_ready_threshold','review_notes'
  )) or exists(select 1 from jsonb_object_keys(v_xp) as keys(key) where key not in(
    'intro','instructional_media','core_challenge','mastery','module_total','unlock_threshold','passing_score'
  )) then raise exception 'Unsupported mission or XP field'; end if;
  if jsonb_typeof(v_mission->'real_world_activity') is distinct from 'object'
     or jsonb_typeof(v_mission->'aria_coaching_targets') is distinct from 'object'
     or jsonb_typeof(v_mission->'career_mission_ideas') is distinct from 'array'
     or (v_mission->>'portfolio_moment')::boolean is distinct from false then
    raise exception 'Mission review fields have unsupported types or active portfolio behavior';
  end if;
  if nullif(trim(v_module->>'title'),'') is null or nullif(trim(v_module->>'description'),'') is null
     or v_module->>'status' is distinct from 'draft' or (v_module->>'sort_order')::integer is null
     or (v_module->>'sort_order')::integer<1 then raise exception 'Module must be complete and draft'; end if;
  if (v_xp->>'intro')::integer is distinct from 50 or (v_xp->>'instructional_media')::integer is distinct from 100
     or (v_xp->>'core_challenge')::integer is distinct from 350 or (v_xp->>'mastery')::integer is distinct from 125
     or (v_xp->>'module_total')::integer is distinct from 625 or (v_xp->>'unlock_threshold')::integer is distinct from 438
     or (v_xp->>'passing_score')::numeric is distinct from 70 then raise exception 'JPAC XP and passing-score contract mismatch'; end if;
  if exists(select 1 from public.course_modules where course_id=v_course_id and sort_order=(v_module->>'sort_order')::integer) then
    raise exception 'Module sort order already exists in the target course';
  end if;

  if jsonb_typeof(v_module->'media') is distinct from 'object'
     or exists(select 1 from jsonb_object_keys(v_module->'media') as keys(key) where key not in('review_status','legacy_projection','versions'))
     or v_module#>>'{media,review_status}' is distinct from 'NEEDS_REVIEW'
     or jsonb_typeof(v_module#>'{media,versions}') is distinct from 'array' or jsonb_array_length(v_module#>'{media,versions}')<>0
     or coalesce(v_module#>>'{media,legacy_projection,url}','')<>'' then raise exception 'Media must remain inactive and NEEDS_REVIEW'; end if;
  if jsonb_typeof(v_module->'tool') is distinct from 'object'
     or exists(select 1 from jsonb_object_keys(v_module->'tool') as keys(key) where key not in('review_status','activity_configuration','catalog_reference'))
     or v_module#>>'{tool,review_status}' is distinct from 'NEEDS_CATALOG_REVIEW'
     or v_module#>'{tool,catalog_reference}' is distinct from 'null'::jsonb then raise exception 'Tool must remain unbound and NEEDS_CATALOG_REVIEW'; end if;
  if jsonb_typeof(v_module->'career_path_attachments') is distinct from 'object'
     or exists(select 1 from jsonb_object_keys(v_module->'career_path_attachments') as keys(key) where key not in('status','items'))
     or v_module#>>'{career_path_attachments,status}' is distinct from 'NOT_CONFIGURED'
     or jsonb_typeof(v_module#>'{career_path_attachments,items}') is distinct from 'array'
     or jsonb_array_length(v_module#>'{career_path_attachments,items}')<>0 then raise exception 'Career Path attachments are not allowed'; end if;

  if exists(select 1 from jsonb_array_elements(v_module->'lessons') l
    where jsonb_typeof(l) is distinct from 'object' or exists(select 1 from jsonb_object_keys(l) as keys(key) where key not in(
      'sort_order','title','description','status','duration_minutes','short_summary','learning_objective','content_blocks','technique_cues','common_mistakes','self_check','resource_url'
    )) or nullif(trim(l->>'title'),'') is null or nullif(trim(l->>'learning_objective'),'') is null
       or l->>'status' is distinct from 'draft' or jsonb_typeof(l->'content_blocks') is distinct from 'array'
       or jsonb_typeof(l->'technique_cues') is distinct from 'array' or jsonb_typeof(l->'common_mistakes') is distinct from 'array'
       or coalesce(l->>'resource_url','')<>'') then raise exception 'Lesson payload is incomplete, active, or unsupported'; end if;
  if (select count(distinct (l->>'sort_order')::integer) from jsonb_array_elements(v_module->'lessons') l)<>3
     or exists(select 1 from jsonb_array_elements(v_module->'lessons') l where (l->>'sort_order')::integer<1) then
    raise exception 'Lesson sort orders must be three distinct positive values';
  end if;

  if exists(select 1 from jsonb_object_keys(v_module->'activities') as keys(key) where key not in('practice','core_challenge','other'))
     or jsonb_typeof(v_module#>'{activities,practice}') is distinct from 'array'
     or jsonb_typeof(v_module#>'{activities,core_challenge}') is distinct from 'array'
     or jsonb_typeof(v_module#>'{activities,other}') is distinct from 'array'
     or jsonb_array_length(v_module#>'{activities,practice}')>1
     or jsonb_array_length(v_module#>'{activities,core_challenge}')<>1
     or jsonb_array_length(v_module#>'{activities,other}')<>0 then raise exception 'Exactly one Core Challenge, zero or one Practice, and no other activities are allowed'; end if;

  for v_activity in select value from jsonb_array_elements((v_module#>'{activities,practice}')||(v_module#>'{activities,core_challenge}')) loop
    if jsonb_typeof(v_activity) is distinct from 'object' or exists(select 1 from jsonb_object_keys(v_activity) as keys(key) where key not in(
      'role','title','description','instructions','activity_type','submission_type','status','required','xp_reward','xp_type','passing_score','allows_resubmission','portfolio_candidate','rubric'
    )) or nullif(trim(v_activity->>'title'),'') is null or nullif(trim(v_activity->>'instructions'),'') is null
       or v_activity->>'status' is distinct from 'draft' or (v_activity->>'passing_score')::numeric is distinct from 70
       or (v_activity->>'allows_resubmission')::boolean is distinct from true
       or (v_activity->>'portfolio_candidate')::boolean is distinct from false then raise exception 'Activity payload is incomplete, active, or unsupported'; end if;
  end loop;
  if jsonb_array_length(v_module#>'{activities,practice}')=1 then
    v_practice:=v_module#>'{activities,practice,0}';
    if v_practice->>'role' is distinct from 'practice' or v_practice->>'activity_type' is distinct from 'practice'
       or (v_practice->>'required')::boolean is distinct from false or (v_practice->>'xp_reward')::integer is distinct from 0 or v_practice->>'xp_type' is distinct from 'bonus'
     or coalesce(v_practice->'rubric','{}'::jsonb)<>'{}'::jsonb then raise exception 'Practice must be optional, non-assessed, and zero-XP bonus'; end if;
  end if;
  v_core:=v_module#>'{activities,core_challenge,0}'; v_rubric:=v_core->'rubric';
  if v_core->>'role' is distinct from 'core_challenge' or v_core->>'activity_type' is distinct from 'performance'
     or (v_core->>'required')::boolean is distinct from true or (v_core->>'xp_reward')::integer is distinct from 350 or v_core->>'xp_type' is distinct from 'core'
     or v_core->>'submission_type' is null or v_core->>'submission_type' not in('text','audio','video','file','link','teacher_verification')
     or jsonb_typeof(v_rubric) is distinct from 'object' or jsonb_typeof(v_rubric->'criteria') is distinct from 'array'
     or jsonb_array_length(v_rubric->'criteria')<>5 then raise exception 'Core Challenge or rubric contract mismatch'; end if;
  select sum((criterion->>'weight')::numeric) into v_rubric_total from jsonb_array_elements(v_rubric->'criteria') criterion;
  if coalesce(v_rubric_total,-1)<>100
     or (select count(distinct trim(criterion->>'name')) from jsonb_array_elements(v_rubric->'criteria') criterion)<>5
     or exists(select 1 from jsonb_array_elements(v_rubric->'criteria') criterion
    where nullif(trim(criterion->>'name'),'') is null or (criterion->>'weight')::numeric<=0
       or jsonb_typeof(criterion->'bands') is distinct from 'object'
       or (select count(*) from jsonb_object_keys(criterion->'bands'))<>4
       or not (criterion->'bands' ?& array['Exceeds','Meets','Developing','Not Yet'])
       or exists(select 1 from jsonb_each_text(criterion->'bands') band where nullif(trim(band.value),'') is null)) then
    raise exception 'Rubric must contain five named criteria, four non-empty bands, and total 100';
  end if;

  insert into public.course_modules(
    id,course_id,course_level_id,level_module_number,title,description,short_intro,sort_order,xp_value,core_xp,
    intro_core_xp,video_core_xp,assignment_core_xp,mastery_core_xp,core_unlock_threshold,bonus_xp_available,
    jpac_tool_activity,real_world_activity,career_connection,portfolio_moment,status,video_brief,aria_coaching_targets,
    career_mission_ideas,portfolio_ready_threshold,review_notes,primary_video_url,lab_tool_id,active_instructional_media_id,approved_by,approved_at
  ) values(
    v_module_id,v_course_id,v_level_id,v_module_number,trim(v_module->>'title'),v_module->>'description',v_mission->>'short_intro',
    (v_module->>'sort_order')::integer,625,625,50,100,350,125,438,0,coalesce(v_module#>'{tool,activity_configuration}','{}'::jsonb),
    coalesce(v_mission->'real_world_activity','{}'::jsonb),coalesce(v_mission->>'career_connection',''),coalesce((v_mission->>'portfolio_moment')::boolean,false),
    'draft',coalesce(v_module#>>'{media,legacy_projection,brief}',''),coalesce(v_mission->'aria_coaching_targets','{}'::jsonb),
    coalesce(v_mission->'career_mission_ideas','[]'::jsonb),nullif(v_mission->>'portfolio_ready_threshold','')::numeric,
    coalesce(v_mission->>'review_notes',''),null,null,null,null,null
  );

  for v_lesson in select value from jsonb_array_elements(v_module->'lessons') order by (value->>'sort_order')::integer loop
    v_created_id:=gen_random_uuid();
    insert into public.lessons(id,module_id,title,description,lesson_type,duration_minutes,sort_order,xp_value,status,short_summary,learning_objective,content_blocks,technique_cues,common_mistakes,self_check,resource_brief,wix_lesson_url)
    values(v_created_id,v_module_id,trim(v_lesson->>'title'),coalesce(v_lesson->>'description',''),'interactive',nullif(v_lesson->>'duration_minutes','')::integer,
      (v_lesson->>'sort_order')::integer,0,'draft',coalesce(v_lesson->>'short_summary',''),v_lesson->>'learning_objective',v_lesson->'content_blocks',
      array(select jsonb_array_elements_text(v_lesson->'technique_cues')),array(select jsonb_array_elements_text(v_lesson->'common_mistakes')),
      coalesce(v_lesson->>'self_check',''),'Imported draft; resources require review.',null);
    v_lesson_ids:=v_lesson_ids||jsonb_build_array(v_created_id);
  end loop;

  if v_practice is not null then
    v_created_id:=gen_random_uuid();
    insert into public.activities(id,course_id,module_id,title,description,activity_type,instructions,submission_type,xp_reward,required,status,rubric,skill_tags,ai_summary,xp_type,passing_score,allows_resubmission,portfolio_candidate,certificate_eligible)
    values(v_created_id,v_course_id,v_module_id,trim(v_practice->>'title'),coalesce(v_practice->>'description',''),'practice',v_practice->>'instructions',v_practice->>'submission_type',0,false,'draft','{}'::jsonb,'{}','Imported draft practice; non-assessed.','bonus',70,true,false,false);
    v_activity_ids:=v_activity_ids||jsonb_build_array(v_created_id);
  end if;
  v_created_id:=gen_random_uuid();
  insert into public.activities(id,course_id,module_id,title,description,activity_type,instructions,submission_type,xp_reward,required,status,rubric,skill_tags,ai_summary,xp_type,passing_score,allows_resubmission,portfolio_candidate,certificate_eligible)
  values(v_created_id,v_course_id,v_module_id,trim(v_core->>'title'),coalesce(v_core->>'description',''),'performance',v_core->>'instructions',v_core->>'submission_type',350,true,'draft',v_rubric,'{}','Imported draft Core Challenge; teacher review required.','core',70,true,false,false);
  v_activity_ids:=v_activity_ids||jsonb_build_array(v_created_id);

  return jsonb_build_object('operation_id',v_operation_id,'status','draft','course_id',v_course_id,'level_id',v_level_id,'module_id',v_module_id,
    'lesson_ids',v_lesson_ids,'activity_ids',v_activity_ids,'created_counts',jsonb_build_object('modules',1,'lessons',jsonb_array_length(v_lesson_ids),'activities',jsonb_array_length(v_activity_ids)),
    'unresolved_review_statuses',jsonb_build_array('MEDIA_NEEDS_REVIEW','TOOLS_NEED_CATALOG_REVIEW','CAREER_PATH_NOT_CONFIGURED'));
end;
$$;

revoke all on function public.curriculum_save_module_as_draft_v1(jsonb) from public,anon;
grant execute on function public.curriculum_save_module_as_draft_v1(jsonb) to authenticated;
comment on function public.curriculum_save_module_as_draft_v1(jsonb) is
  'Admin/developer-only transactional creation of one entirely new draft module, three draft lessons, optional draft practice, and one draft Core Challenge from JPAC export 1.2.0. No overwrite, publish, media/tool activation, student state, or workflow execution.';

commit;
