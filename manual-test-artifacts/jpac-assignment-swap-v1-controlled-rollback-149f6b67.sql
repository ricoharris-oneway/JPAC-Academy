-- ONE-USE CONTROLLED TEST: Assignment Swap v1 rollback validation.
-- Review the fixed identities and baseline counts before manual execution.
-- Do not run more than once. Any failed assertion aborts the transaction.
begin;

select set_config('request.jwt.claim.sub','0bb601f4-4ffc-4e53-a8eb-4cff71f9439f',true);
select set_config('request.jwt.claim.role','authenticated',true);

do $$
declare
  v_swap constant uuid := '149f6b67-a615-4d17-b2ac-75879e0467dc';
  v_module constant uuid := 'b94c8524-9715-4020-8075-5588b6fcce62';
  v_activity constant uuid := '8daf80a4-a451-4eeb-bffc-3b18504175a0';
  v_operation public.curriculum_assignment_swap_operations%rowtype;
  v_activity_row public.activities%rowtype;
  v_module_row public.course_modules%rowtype;
begin
  if auth.uid() is distinct from '0bb601f4-4ffc-4e53-a8eb-4cff71f9439f'::uuid or not public.is_admin() then
    raise exception 'STOP: authenticated admin/developer identity is not available';
  end if;
  select * into v_operation from public.curriculum_assignment_swap_operations where id=v_swap and operation_kind='swap' and rollback_of is null;
  if v_operation.id is null or v_operation.target_module_id<>v_module or v_operation.target_activity_id<>v_activity or v_operation.status<>'applied' then raise exception 'STOP: fixed swap operation is missing or mismatched'; end if;
  if exists(select 1 from public.curriculum_assignment_swap_operations where rollback_of=v_swap) or (select count(*) from public.curriculum_assignment_swap_operations)<>1 then raise exception 'STOP: rollback already exists or audit baseline is not exactly one row'; end if;
  select * into v_activity_row from public.activities where id=v_activity and module_id=v_module for update;
  select * into v_module_row from public.course_modules where id=v_module for update;
  if v_activity_row.id is null or v_activity_row.status<>'draft' or jsonb_build_object('title',v_activity_row.title,'description',v_activity_row.description,'instructions',v_activity_row.instructions,'submission_type',v_activity_row.submission_type,'passing_score',v_activity_row.passing_score,'allows_resubmission',v_activity_row.allows_resubmission,'rubric',v_activity_row.rubric)<>v_operation.after_payload then raise exception 'STOP: current activity does not match the audited swapped payload'; end if;
  if v_module_row.id is null or v_module_row.status<>'draft' or v_module_row.level_module_number<>13 or v_module_row.sort_order<>49 or v_module_row.title<>'Save Draft Test Module' then raise exception 'STOP: Module 13 identity changed'; end if;
  if v_module_row.core_xp<>625 or v_module_row.intro_core_xp<>50 or v_module_row.video_core_xp<>100 or v_module_row.assignment_core_xp<>350 or v_module_row.mastery_core_xp<>125 or v_module_row.core_unlock_threshold<>438 then raise exception 'STOP: protected module XP changed'; end if;
  if (select count(*) from public.lessons where module_id=v_module)<>3 or (select count(*) from public.activities where module_id=v_module)<>2 then raise exception 'STOP: module structure changed'; end if;
  if exists(select 1 from public.submissions where activity_id=v_activity)
    or exists(select 1 from public.activity_progress where activity_id=v_activity)
    or exists(select 1 from public.practice_logs where activity_id=v_activity)
    or exists(select 1 from public.portfolio_projects where activity_id=v_activity)
    or exists(select 1 from public.lesson_progress p join public.lessons l on l.id=p.lesson_id where l.module_id=v_module)
    or exists(select 1 from public.xp_ledger where module_id=v_module or source_id=v_activity) then raise exception 'STOP: evidence or progress now references the controlled module'; end if;
  if (select count(*) from public.xp_ledger)<>5 or (select count(*) from public.enrollments)<>1 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>5 then raise exception 'STOP: global student-state baseline changed'; end if;
end $$;

select public.curriculum_rollback_assignment_swap_v1('149f6b67-a615-4d17-b2ac-75879e0467dc'::uuid) as rollback_result;

do $$
declare
  v_swap constant uuid := '149f6b67-a615-4d17-b2ac-75879e0467dc';
  v_module constant uuid := 'b94c8524-9715-4020-8075-5588b6fcce62';
  v_activity constant uuid := '8daf80a4-a451-4eeb-bffc-3b18504175a0';
  v_original jsonb;
begin
  select before_payload into v_original from public.curriculum_assignment_swap_operations where id=v_swap;
  if (select count(*) from public.curriculum_assignment_swap_operations)<>2 or (select count(*) from public.curriculum_assignment_swap_operations where operation_kind='rollback' and rollback_of=v_swap and target_activity_id=v_activity)<>1 then raise exception 'STOP: expected linked rollback audit row was not created'; end if;
  if not exists(select 1 from public.activities a where a.id=v_activity and a.module_id=v_module and a.title=v_original->>'title' and a.description=v_original->>'description' and a.instructions=v_original->>'instructions' and a.submission_type=v_original->>'submission_type' and a.passing_score=(v_original->>'passing_score')::numeric and a.allows_resubmission=(v_original->>'allows_resubmission')::boolean and a.rubric=v_original->'rubric') then raise exception 'STOP: original activity payload was not restored exactly'; end if;
  if not exists(select 1 from public.course_modules where id=v_module and level_module_number=13 and sort_order=49 and title='Save Draft Test Module' and status='draft' and core_xp=625 and intro_core_xp=50 and video_core_xp=100 and assignment_core_xp=350 and mastery_core_xp=125 and core_unlock_threshold=438) then raise exception 'STOP: module identity or XP changed during rollback'; end if;
  if (select count(*) from public.lessons where module_id=v_module)<>3 or (select count(*) from public.activities where module_id=v_module)<>2 then raise exception 'STOP: module structure changed during rollback'; end if;
  if (select count(*) from public.xp_ledger)<>5 or (select count(*) from public.enrollments)<>1 or (select count(*) from public.submissions)<>1 or (select count(*) from public.certificates)<>0 or (select count(*) from public.lesson_progress)<>5 then raise exception 'STOP: global student-state changed during rollback'; end if;
end $$;

commit;

select 'ROLLBACK_OPERATION' as report_section,id::text as identifier,'PASS' as result,concat('rollback_of=',rollback_of,'; activity=',target_activity_id) as details from public.curriculum_assignment_swap_operations where rollback_of='149f6b67-a615-4d17-b2ac-75879e0467dc'::uuid
union all select 'ACTIVITY_RESTORED',a.id::text,'PASS',a.title from public.activities a where a.id='8daf80a4-a451-4eeb-bffc-3b18504175a0'::uuid
union all select 'MODULE_PRESERVED',m.id::text,'PASS',concat('lessons=',(select count(*) from public.lessons where module_id=m.id),'; activities=',(select count(*) from public.activities where module_id=m.id),'; core_xp=',m.core_xp) from public.course_modules m where m.id='b94c8524-9715-4020-8075-5588b6fcce62'::uuid
union all select 'STUDENT_STATE','global','PASS','xp_ledger=5; enrollments=1; submissions=1; certificates=0; lesson_progress=5';
