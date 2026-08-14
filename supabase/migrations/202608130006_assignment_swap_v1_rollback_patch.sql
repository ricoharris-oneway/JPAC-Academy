begin;

do $$
begin
  if to_regprocedure('public.curriculum_rollback_assignment_swap_v1(uuid)') is null
     or to_regprocedure('public.curriculum_swap_module_assignment_v1(jsonb)') is null
     or to_regclass('public.curriculum_assignment_swap_operations') is null then
    raise exception 'Assignment Swap v1 foundation is missing';
  end if;
  if exists(select 1 from public.curriculum_assignment_swap_operations where rollback_of='149f6b67-a615-4d17-b2ac-75879e0467dc'::uuid) then
    raise exception 'Controlled operation is already rolled back';
  end if;
  if (select count(*) from public.curriculum_assignment_swap_operations where id='149f6b67-a615-4d17-b2ac-75879e0467dc'::uuid and operation_kind='swap')<>1 then
    raise exception 'Controlled swap operation is missing';
  end if;
end $$;

create or replace function public.curriculum_rollback_assignment_swap_v1(operation_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_op public.curriculum_assignment_swap_operations%rowtype; v_course public.courses%rowtype; v_module public.course_modules%rowtype; v_activity public.activities%rowtype; v_current jsonb; v_audit_hash text; v_current_hash text; v_rollback uuid;
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
  v_current:=jsonb_build_object('title',v_activity.title,'description',v_activity.description,'instructions',v_activity.instructions,'submission_type',v_activity.submission_type,'passing_score',v_activity.passing_score::integer,'allows_resubmission',v_activity.allows_resubmission,'rubric',v_activity.rubric);
  v_audit_hash:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_op.after_payload::text,'UTF8')),'hex');
  v_current_hash:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_current::text,'UTF8')),'hex');
  if v_audit_hash<>v_op.after_hash or v_current is distinct from v_op.after_payload or v_current_hash<>v_op.after_hash then raise exception 'Activity changed after swap'; end if;
  update public.activities set title=v_op.before_payload->>'title',description=v_op.before_payload->>'description',instructions=v_op.before_payload->>'instructions',submission_type=v_op.before_payload->>'submission_type',passing_score=(v_op.before_payload->>'passing_score')::numeric,allows_resubmission=(v_op.before_payload->>'allows_resubmission')::boolean,rubric=v_op.before_payload->'rubric' where id=v_activity.id;
  insert into public.curriculum_assignment_swap_operations(target_course_id,target_module_id,target_activity_id,assignment_role,operation_kind,before_payload,after_payload,before_hash,after_hash,changed_fields,requested_by,rollback_of) values(v_op.target_course_id,v_op.target_module_id,v_op.target_activity_id,v_op.assignment_role,'rollback',v_op.after_payload,v_op.before_payload,v_op.after_hash,v_op.before_hash,v_op.changed_fields,auth.uid(),v_op.id) returning id into v_rollback;
  return jsonb_build_object('operation_id',v_rollback,'rollback_of',v_op.id,'target_module_id',v_module.id,'target_activity_id',v_activity.id,'status','rolled_back','restored_hash',v_op.before_hash,'preserved',jsonb_build_object('activity_id',true,'module_identity',true,'xp',true,'student_state',true));
end $$;

revoke execute on function public.curriculum_rollback_assignment_swap_v1(uuid) from public, anon, service_role;
grant execute on function public.curriculum_rollback_assignment_swap_v1(uuid) to authenticated;
comment on function public.curriculum_rollback_assignment_swap_v1(uuid) is 'Assignment Swap v1 rollback with canonical activity snapshot and stored-audit hash integrity verification.';

commit;
