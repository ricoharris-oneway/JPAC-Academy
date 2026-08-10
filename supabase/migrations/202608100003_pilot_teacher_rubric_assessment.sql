begin;

alter table public.submissions
  add column if not exists rubric_assessment jsonb;

do $$
begin
  if not exists(
    select 1
    from pg_constraint
    where conrelid='public.submissions'::regclass
      and conname='submissions_rubric_assessment_object_check'
  ) then
    alter table public.submissions
      add constraint submissions_rubric_assessment_object_check
      check(rubric_assessment is null or jsonb_typeof(rubric_assessment)='object');
  end if;
end $$;

create or replace function public.jpac_protect_rubric_assessment_history()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if old.rubric_assessment is not distinct from new.rubric_assessment then
    return new;
  end if;

  if old.rubric_assessment is not null then
    raise exception 'Completed rubric assessment history cannot be overwritten';
  end if;

  if current_user in('anon','authenticated') then
    raise exception 'Rubric assessments must be written through the authoritative assessment workflow';
  end if;

  return new;
end;
$$;

drop trigger if exists submissions_protect_rubric_assessment_history on public.submissions;
create trigger submissions_protect_rubric_assessment_history
before update of rubric_assessment on public.submissions
for each row execute function public.jpac_protect_rubric_assessment_history();

create or replace function public.jpac_assess_module_submission(
  submission_target uuid,
  criterion_scores jsonb,
  review_feedback text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  submission_row public.submissions%rowtype;
  activity_row public.activities%rowtype;
  canonical_criteria jsonb;
  expected_count integer;
  expected_unique_count integer;
  supplied_count integer;
  supplied_unique_count integer;
  rubric_total numeric;
  calculated_score numeric;
  assessment_result text;
  normalized_scores jsonb;
  review_result jsonb;
begin
  if not public.is_staff() then
    raise exception 'Teacher, Admin, or Developer access required';
  end if;

  if criterion_scores is null or jsonb_typeof(criterion_scores)<>'array' then
    raise exception 'Criterion scores must be a JSON array';
  end if;

  select * into submission_row
  from public.submissions
  where id=submission_target
  for update;

  if submission_row.id is null then
    raise exception 'Submission not found';
  end if;

  if submission_row.rubric_assessment is not null
    or submission_row.reviewed_at is not null
    or submission_row.status not in('submitted','under_review') then
    raise exception 'This submission attempt already has a completed review or is not reviewable';
  end if;

  select * into activity_row
  from public.activities
  where id=submission_row.activity_id;

  if activity_row.id is null then
    raise exception 'Canonical activity not found';
  end if;

  if activity_row.passing_score is null or activity_row.passing_score<0 or activity_row.passing_score>100 then
    raise exception 'Canonical activity passing score is invalid';
  end if;

  canonical_criteria:=activity_row.rubric->'criteria';
  if canonical_criteria is null or jsonb_typeof(canonical_criteria)<>'array' then
    raise exception 'Canonical activity rubric must contain a criteria array';
  end if;

  if exists(
    select 1
    from jsonb_array_elements(canonical_criteria) criterion
    where jsonb_typeof(criterion)<>'object'
      or nullif(trim(criterion->>'name'),'') is null
      or jsonb_typeof(criterion->'weight')<>'number'
      or (criterion->>'weight')::numeric<=0
  ) then
    raise exception 'Canonical rubric contains an invalid criterion';
  end if;

  select count(*),count(distinct criterion->>'name'),sum((criterion->>'weight')::numeric)
  into expected_count,expected_unique_count,rubric_total
  from jsonb_array_elements(canonical_criteria) criterion;

  if expected_count=0 or expected_unique_count<>expected_count then
    raise exception 'Canonical rubric criterion names must be unique';
  end if;

  if rubric_total<>100 then
    raise exception 'Canonical rubric weights must total exactly 100';
  end if;

  if exists(
    select 1
    from jsonb_array_elements(criterion_scores) supplied
    where jsonb_typeof(supplied)<>'object'
      or nullif(trim(supplied->>'name'),'') is null
      or jsonb_typeof(supplied->'score')<>'number'
      or (supplied->>'score')::numeric<0
      or (supplied->>'score')::numeric>100
      or exists(
        select 1
        from jsonb_object_keys(supplied) as supplied_keys(key_name)
        where key_name not in('name','score')
      )
  ) then
    raise exception 'Every supplied criterion must contain only a canonical name and a score from 0 to 100';
  end if;

  select count(*),count(distinct supplied->>'name')
  into supplied_count,supplied_unique_count
  from jsonb_array_elements(criterion_scores) supplied;

  if supplied_count<>expected_count or supplied_unique_count<>supplied_count then
    raise exception 'Exactly one score is required for every canonical criterion';
  end if;

  if exists(
    select 1
    from jsonb_array_elements(criterion_scores) supplied
    where not exists(
      select 1
      from jsonb_array_elements(canonical_criteria) canonical
      where canonical->>'name'=supplied->>'name'
    )
  ) or exists(
    select 1
    from jsonb_array_elements(canonical_criteria) canonical
    where not exists(
      select 1
      from jsonb_array_elements(criterion_scores) supplied
      where supplied->>'name'=canonical->>'name'
    )
  ) then
    raise exception 'Criterion scores do not match the canonical rubric';
  end if;

  select
    jsonb_agg(
      jsonb_build_object(
        'name',canonical->>'name',
        'weight',(canonical->>'weight')::numeric,
        'score',(supplied->>'score')::numeric,
        'weighted_contribution',round((supplied->>'score')::numeric*(canonical->>'weight')::numeric/100,2)
      ) order by ordinal
    ),
    round(sum((supplied->>'score')::numeric*(canonical->>'weight')::numeric/100),2)
  into normalized_scores,calculated_score
  from jsonb_array_elements(canonical_criteria) with ordinality criteria(canonical,ordinal)
  join jsonb_array_elements(criterion_scores) supplied
    on supplied->>'name'=canonical->>'name';

  assessment_result:=case when calculated_score>=activity_row.passing_score then 'approved' else 'revision_requested' end;

  review_result:=public.jpac_review_module_submission(
    submission_target,
    calculated_score,
    coalesce(review_feedback,'')
  );

  update public.submissions
  set rubric_assessment=jsonb_build_object(
    'schema_version',1,
    'activity_id',activity_row.id,
    'rubric',jsonb_build_object('criteria',canonical_criteria),
    'criterion_scores',normalized_scores,
    'calculated_score',calculated_score,
    'passing_score',activity_row.passing_score,
    'result',assessment_result
  )
  where id=submission_target;

  return review_result||jsonb_build_object(
    'calculatedScore',calculated_score,
    'passingScore',activity_row.passing_score,
    'result',assessment_result,
    'rubricAssessmentPersisted',true
  );
end;
$$;

revoke all on function public.jpac_assess_module_submission(uuid,jsonb,text) from public,anon;
grant execute on function public.jpac_assess_module_submission(uuid,jsonb,text) to authenticated;

revoke all on function public.jpac_protect_rubric_assessment_history() from public,anon,authenticated;

comment on function public.jpac_assess_module_submission(uuid,jsonb,text) is
  'Staff-only canonical rubric assessment. Recalculates score, preserves an immutable rubric snapshot, and delegates approval, XP, and mastery to the established Phase E review chain.';

comment on function public.jpac_protect_rubric_assessment_history() is
  'Prevents authenticated clients from writing rubric evidence directly and prevents completed assessment snapshots from being overwritten.';

commit;
