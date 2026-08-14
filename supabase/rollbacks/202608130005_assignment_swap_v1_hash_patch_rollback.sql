begin;

do $$
begin
  if to_regclass('public.curriculum_assignment_swap_operations') is null
     or exists(select 1 from public.curriculum_assignment_swap_operations) then
    raise exception 'Rollback requires the Assignment Swap foundation and zero audit rows';
  end if;
end $$;

create or replace function public.curriculum_swap_module_assignment_v1(swap_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_course public.courses%rowtype; v_level public.course_levels%rowtype; v_module public.course_modules%rowtype; v_activity public.activities%rowtype;
  v_target uuid; v_role text; v_expected jsonb; v_replacement jsonb; v_before jsonb; v_after jsonb;
  v_before_hash text; v_after_hash text; v_changed text[]; v_operation uuid; v_rubric jsonb; v_total numeric;
begin
  if not public.is_admin() then raise exception 'Administrator or developer access required'; end if;
  if (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname='public' and c.relname='activities' and not t.tgisinternal)<>1 or not exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname='public' and c.relname='activities' and not t.tgisinternal and t.tgname='set_updated_at' and p.proname='set_updated_at' and t.tgenabled<>'D') then raise exception 'Unexpected activities trigger baseline'; end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('jpac_sync_enrollment_progress','jpac_enforce_canonical_enrollment_progress') and (select count(*) from regexp_matches(regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g'),'m\.status=''published''','g'))=2 and regexp_replace(lower(pg_get_functiondef(p.oid)),'\s+','','g') not like '%m.status<>''archived''%')<>2 then raise exception 'Safe Draft Isolation is missing'; end if;
  if jsonb_typeof(swap_payload) is distinct from 'object' or swap_payload->>'contract' is distinct from 'jpac-assignment-swap' or swap_payload->>'contract_version' is distinct from '1.0.0' then raise exception 'Unsupported Assignment Swap contract'; end if;
  if exists(select 1 from jsonb_object_keys(swap_payload) k where k not in('contract','contract_version','target_course_id','target_module_id','target_activity_id','assignment_role','expected_current','replacement','acknowledged_warning_codes','confirmation')) then raise exception 'Unsupported top-level field'; end if;
  v_target:=(swap_payload->>'target_activity_id')::uuid; v_role:=swap_payload->>'assignment_role'; v_expected:=swap_payload->'expected_current'; v_replacement:=swap_payload->'replacement';
  if v_role not in('practice','core_challenge') or jsonb_typeof(v_expected) is distinct from 'object' or jsonb_typeof(v_replacement) is distinct from 'object' then raise exception 'Invalid role or payload'; end if;
  if jsonb_typeof(swap_payload->'acknowledged_warning_codes') is distinct from 'array' or jsonb_typeof(swap_payload->'confirmation') is distinct from 'object' or (swap_payload#>>'{confirmation,draft_only}')::boolean is distinct from true or (swap_payload#>>'{confirmation,preserve_activity_identity}')::boolean is distinct from true or (swap_payload#>>'{confirmation,no_student_evidence}')::boolean is distinct from true then raise exception 'Warning acknowledgement and confirmation are required'; end if;
  if exists(select 1 from jsonb_object_keys(v_expected) k where k not in('course_slug','level_number','module_number','module_title','module_sort_order','module_status','activity_snapshot')) then raise exception 'Expected-current contains unsupported fields'; end if;
  if exists(select 1 from jsonb_object_keys(v_replacement) k where k not in('title','description','instructions','submission_type','passing_score','allows_resubmission','rubric')) then raise exception 'Replacement contains prohibited fields'; end if;
  if v_role='practice' and v_replacement ? 'rubric' then raise exception 'Practice rubric replacement is not supported'; end if;
  if nullif(trim(v_replacement->>'title'),'') is null or nullif(trim(v_replacement->>'instructions'),'') is null or v_replacement->>'submission_type' not in('none','text','audio','video','file','link','teacher_verification') or (v_replacement->>'passing_score')::numeric is distinct from 70 or (v_replacement->>'allows_resubmission')::boolean is distinct from true then raise exception 'Replacement content is incomplete or unsupported'; end if;

  select * into v_course from public.courses where id=(swap_payload->>'target_course_id')::uuid for update;
  if v_course.id is null or v_course.slug is distinct from v_expected->>'course_slug' or v_course.slug='singing' then raise exception 'Target course mismatch or protected course'; end if;
  select * into v_module from public.course_modules where id=(swap_payload->>'target_module_id')::uuid and course_id=v_course.id for update;
  if v_module.id is null then raise exception 'Target module not found'; end if;
  select * into v_level from public.course_levels where id=v_module.course_level_id for update;
  if v_level.level_number is distinct from (v_expected->>'level_number')::integer or v_module.level_module_number is distinct from (v_expected->>'module_number')::integer or v_module.sort_order is distinct from (v_expected->>'module_sort_order')::integer or v_module.title is distinct from v_expected->>'module_title' or v_module.status<>'draft' or v_module.core_xp<>625 or v_module.intro_core_xp<>50 or v_module.video_core_xp<>100 or v_module.assignment_core_xp<>350 or v_module.mastery_core_xp<>125 or v_module.core_unlock_threshold<>438 then raise exception 'Target module identity, state, or XP mismatch'; end if;
  perform id from public.activities where module_id=v_module.id order by id for update;
  select * into v_activity from public.activities where id=v_target and module_id=v_module.id and course_id=v_course.id;
  if v_activity.id is null or v_activity.status<>'draft' then raise exception 'Target activity missing or not draft'; end if;
  if v_activity.lesson_id is not null then raise exception 'Lesson-linked activities are outside v1'; end if;
  if v_role='core_challenge' and not(v_activity.activity_type='performance' and v_activity.required and v_activity.xp_reward=350 and v_activity.xp_type='core' and v_activity.passing_score=70 and v_activity.allows_resubmission and not v_activity.portfolio_candidate and not coalesce(v_activity.certificate_eligible,false)) then raise exception 'Core Challenge identity/settings mismatch'; end if;
  if v_role='practice' and not(v_activity.activity_type='practice' and not v_activity.required and v_activity.xp_reward=0 and v_activity.xp_type='bonus' and v_activity.passing_score=70 and v_activity.allows_resubmission and not v_activity.portfolio_candidate and not coalesce(v_activity.certificate_eligible,false)) then raise exception 'Practice identity/settings mismatch'; end if;
  if (select count(*) from public.activities where module_id=v_module.id and required and xp_type='core')<>1 or (select count(*) from public.activities where module_id=v_module.id and activity_type='practice')>1 then raise exception 'Module activity cardinality mismatch'; end if;

  if exists(select 1 from public.submissions s join public.activities a on a.id=s.activity_id where a.module_id=v_module.id)
    or exists(select 1 from public.activity_progress p join public.activities a on a.id=p.activity_id where a.module_id=v_module.id)
    or exists(select 1 from public.practice_logs p join public.activities a on a.id=p.activity_id where a.module_id=v_module.id)
    or exists(select 1 from public.portfolio_projects p join public.activities a on a.id=p.activity_id where a.module_id=v_module.id)
    or exists(select 1 from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where l.module_id=v_module.id)
    or exists(select 1 from public.xp_ledger x where x.module_id=v_module.id or x.source_id in(select id from public.activities where module_id=v_module.id) or x.source_id in(select id from public.lessons where module_id=v_module.id))
    or exists(select 1 from public.xp_ledger x where x.module_id=v_module.id and x.xp_type='core' and x.metadata->>'component'='mastery')
    or exists(select 1 from public.module_video_progress p where p.module_id=v_module.id)
    or exists(select 1 from public.module_instructional_media p where p.module_id=v_module.id)
    or exists(select 1 from public.course_progress p where p.current_module_id=v_module.id or p.current_lesson_id in(select id from public.lessons where module_id=v_module.id))
    or exists(select 1 from public.curriculum_module_revisions r where r.module_id=v_module.id)
    or exists(select 1 from public.curriculum_change_requests r where r.module_id=v_module.id or r.activity_id in(select id from public.activities where module_id=v_module.id) or r.lesson_id in(select id from public.lessons where module_id=v_module.id))
    or exists(select 1 from public.curriculum_proposals p join public.curriculum_change_requests r on r.id=p.request_id where r.module_id=v_module.id or r.activity_id in(select id from public.activities where module_id=v_module.id) or r.lesson_id in(select id from public.lessons where module_id=v_module.id))
    or exists(select 1 from public.certificates c where c.course_id=v_course.id)
  then raise exception 'Target module has evidence or administrative dependencies'; end if;

  v_before:=jsonb_build_object('title',v_activity.title,'description',v_activity.description,'instructions',v_activity.instructions,'submission_type',v_activity.submission_type,'passing_score',v_activity.passing_score,'allows_resubmission',v_activity.allows_resubmission,'rubric',v_activity.rubric);
  v_before_hash:=encode(digest(convert_to(v_before::text,'UTF8'),'sha256'),'hex');
  if jsonb_typeof(v_expected->'activity_snapshot') is distinct from 'object' or v_expected->'activity_snapshot'<>v_before or v_expected->>'module_status'<>'draft' then raise exception 'Expected-current snapshot mismatch'; end if;
  if v_role='core_challenge' then
    v_rubric:=v_replacement->'rubric';
    if jsonb_typeof(v_rubric) is distinct from 'object' or jsonb_typeof(v_rubric->'criteria') is distinct from 'array' or jsonb_array_length(v_rubric->'criteria')<>5 then raise exception 'Core rubric shape invalid'; end if;
    select sum((c->>'weight')::numeric) into v_total from jsonb_array_elements(v_rubric->'criteria') c;
    if coalesce(v_total,-1)<>100 or (select count(distinct trim(c->>'name')) from jsonb_array_elements(v_rubric->'criteria') c)<>5 or exists(select 1 from jsonb_array_elements(v_rubric->'criteria') c where nullif(trim(c->>'name'),'') is null or (c->>'weight')::numeric<=0 or jsonb_typeof(c->'bands')<>'object' or (select count(*) from jsonb_object_keys(c->'bands'))<>4 or not(c->'bands' ?& array['Exceeds','Meets','Developing','Not Yet']) or exists(select 1 from jsonb_each_text(c->'bands') b where nullif(trim(b.value),'') is null)) then raise exception 'Core rubric contract invalid'; end if;
  else v_rubric:=v_activity.rubric; end if;
  v_after:=jsonb_build_object('title',trim(v_replacement->>'title'),'description',coalesce(v_replacement->>'description',''),'instructions',v_replacement->>'instructions','submission_type',v_replacement->>'submission_type','passing_score',70,'allows_resubmission',true,'rubric',v_rubric);
  if v_after=v_before then raise exception 'Replacement makes no change'; end if;
  v_after_hash:=encode(digest(convert_to(v_after::text,'UTF8'),'sha256'),'hex');
  select array_agg(keys.key order by keys.key) into v_changed from jsonb_object_keys(v_after) as keys(key) where v_after->keys.key is distinct from v_before->keys.key;
  insert into public.curriculum_assignment_swap_operations(target_course_id,target_module_id,target_activity_id,assignment_role,before_payload,after_payload,before_hash,after_hash,changed_fields,requested_by) values(v_course.id,v_module.id,v_activity.id,v_role,v_before,v_after,v_before_hash,v_after_hash,v_changed,auth.uid()) returning id into v_operation;
  update public.activities set title=v_after->>'title',description=v_after->>'description',instructions=v_after->>'instructions',submission_type=v_after->>'submission_type',passing_score=70,allows_resubmission=true,rubric=v_after->'rubric' where id=v_activity.id;
  if not found then raise exception 'Activity update failed'; end if;
  return jsonb_build_object('operation_id',v_operation,'target_module_id',v_module.id,'target_activity_id',v_activity.id,'role',v_role,'status','applied','before_hash',v_before_hash,'after_hash',v_after_hash,'changed_fields',to_jsonb(v_changed),'preserved',jsonb_build_object('activity_id',true,'module_identity',true,'xp',true,'student_state',true));
end $$;

create or replace function public.curriculum_rollback_assignment_swap_v1(operation_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_op public.curriculum_assignment_swap_operations%rowtype; v_course public.courses%rowtype; v_module public.course_modules%rowtype; v_activity public.activities%rowtype; v_current jsonb; v_hash text; v_rollback uuid;
begin
  if not public.is_admin() then raise exception 'Administrator or developer access required'; end if;
  if (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname='public' and c.relname='activities' and not t.tgisinternal)<>1 or not exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname='public' and c.relname='activities' and not t.tgisinternal and t.tgname='set_updated_at' and p.proname='set_updated_at' and t.tgenabled<>'D') then raise exception 'Unexpected activities trigger baseline'; end if;
  select * into v_op from public.curriculum_assignment_swap_operations where id=operation_id and operation_kind='swap' for update;
  if v_op.id is null or exists(select 1 from public.curriculum_assignment_swap_operations where rollback_of=v_op.id) then raise exception 'Operation missing or already rolled back'; end if;
  select * into v_course from public.courses where id=v_op.target_course_id for update;
  select * into v_module from public.course_modules where id=v_op.target_module_id for update;
  perform id from public.activities where module_id=v_module.id order by id for update;
  select * into v_activity from public.activities where id=v_op.target_activity_id;
  if v_course.slug='singing' or v_module.status<>'draft' or v_activity.status<>'draft' or v_module.course_id<>v_course.id or v_activity.course_id<>v_course.id or v_activity.module_id<>v_module.id or v_activity.lesson_id is not null or v_module.core_xp<>625 or v_module.intro_core_xp<>50 or v_module.video_core_xp<>100 or v_module.assignment_core_xp<>350 or v_module.mastery_core_xp<>125 or v_module.core_unlock_threshold<>438 then raise exception 'Protected identity, draft state, or XP changed'; end if;
  if v_op.assignment_role='core_challenge' and not(v_activity.activity_type='performance' and v_activity.required and v_activity.xp_reward=350 and v_activity.xp_type='core' and v_activity.passing_score=70 and v_activity.allows_resubmission and not v_activity.portfolio_candidate and not coalesce(v_activity.certificate_eligible,false)) then raise exception 'Core Challenge settings changed'; end if;
  if v_op.assignment_role='practice' and not(v_activity.activity_type='practice' and not v_activity.required and v_activity.xp_reward=0 and v_activity.xp_type='bonus' and v_activity.passing_score=70 and v_activity.allows_resubmission and not v_activity.portfolio_candidate and not coalesce(v_activity.certificate_eligible,false)) then raise exception 'Practice settings changed'; end if;
  if exists(select 1 from public.submissions s join public.activities a on a.id=s.activity_id where a.module_id=v_module.id) or exists(select 1 from public.activity_progress p join public.activities a on a.id=p.activity_id where a.module_id=v_module.id) or exists(select 1 from public.practice_logs p join public.activities a on a.id=p.activity_id where a.module_id=v_module.id) or exists(select 1 from public.portfolio_projects p join public.activities a on a.id=p.activity_id where a.module_id=v_module.id) or exists(select 1 from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where l.module_id=v_module.id) or exists(select 1 from public.xp_ledger x where x.module_id=v_module.id or x.source_id in(select id from public.activities where module_id=v_module.id) or x.source_id in(select id from public.lessons where module_id=v_module.id)) or exists(select 1 from public.xp_ledger x where x.module_id=v_module.id and x.xp_type='core' and x.metadata->>'component'='mastery') or exists(select 1 from public.module_video_progress p where p.module_id=v_module.id) or exists(select 1 from public.module_instructional_media p where p.module_id=v_module.id) or exists(select 1 from public.course_progress p where p.current_module_id=v_module.id or p.current_lesson_id in(select id from public.lessons where module_id=v_module.id)) or exists(select 1 from public.curriculum_module_revisions r where r.module_id=v_module.id) or exists(select 1 from public.curriculum_change_requests r where r.module_id=v_module.id or r.activity_id in(select id from public.activities where module_id=v_module.id) or r.lesson_id in(select id from public.lessons where module_id=v_module.id)) or exists(select 1 from public.curriculum_proposals p join public.curriculum_change_requests r on r.id=p.request_id where r.module_id=v_module.id or r.activity_id in(select id from public.activities where module_id=v_module.id) or r.lesson_id in(select id from public.lessons where module_id=v_module.id)) or exists(select 1 from public.certificates c where c.course_id=v_op.target_course_id) then raise exception 'Evidence now blocks rollback'; end if;
  v_current:=jsonb_build_object('title',v_activity.title,'description',v_activity.description,'instructions',v_activity.instructions,'submission_type',v_activity.submission_type,'passing_score',v_activity.passing_score,'allows_resubmission',v_activity.allows_resubmission,'rubric',v_activity.rubric); v_hash:=encode(digest(convert_to(v_current::text,'UTF8'),'sha256'),'hex');
  if v_hash<>v_op.after_hash then raise exception 'Activity changed after swap'; end if;
  update public.activities set title=v_op.before_payload->>'title',description=v_op.before_payload->>'description',instructions=v_op.before_payload->>'instructions',submission_type=v_op.before_payload->>'submission_type',passing_score=(v_op.before_payload->>'passing_score')::numeric,allows_resubmission=(v_op.before_payload->>'allows_resubmission')::boolean,rubric=v_op.before_payload->'rubric' where id=v_activity.id;
  insert into public.curriculum_assignment_swap_operations(target_course_id,target_module_id,target_activity_id,assignment_role,operation_kind,before_payload,after_payload,before_hash,after_hash,changed_fields,requested_by,rollback_of) values(v_op.target_course_id,v_op.target_module_id,v_op.target_activity_id,v_op.assignment_role,'rollback',v_op.after_payload,v_op.before_payload,v_op.after_hash,v_op.before_hash,v_op.changed_fields,auth.uid(),v_op.id) returning id into v_rollback;
  return jsonb_build_object('operation_id',v_rollback,'rollback_of',v_op.id,'target_module_id',v_module.id,'target_activity_id',v_activity.id,'status','rolled_back','restored_hash',v_op.before_hash,'preserved',jsonb_build_object('activity_id',true,'module_identity',true,'xp',true,'student_state',true));
end $$;

revoke execute on function public.curriculum_swap_module_assignment_v1(jsonb) from public, anon, service_role;
revoke execute on function public.curriculum_rollback_assignment_swap_v1(uuid) from public, anon, service_role;
grant execute on function public.curriculum_swap_module_assignment_v1(jsonb) to authenticated;
grant execute on function public.curriculum_rollback_assignment_swap_v1(uuid) to authenticated;

comment on function public.curriculum_swap_module_assignment_v1(jsonb) is 'Emergency restoration of the known-broken unqualified pgcrypto hash implementation; not recommended for normal operation.';
comment on function public.curriculum_rollback_assignment_swap_v1(uuid) is 'Emergency restoration of the known-broken unqualified pgcrypto hash implementation; not recommended for normal operation.';

commit;
