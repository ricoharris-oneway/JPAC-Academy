begin;

drop function if exists public.jpac_assess_module_submission(uuid,jsonb,text);

drop trigger if exists submissions_protect_rubric_assessment_history on public.submissions;
drop function if exists public.jpac_protect_rubric_assessment_history();

do $$
begin
  if exists(select 1 from public.submissions where rubric_assessment is not null) then
    raise exception 'Rollback blocked: rubric assessment history exists and must not be destroyed';
  end if;
end $$;

alter table public.submissions
  drop constraint if exists submissions_rubric_assessment_object_check;

alter table public.submissions
  drop column if exists rubric_assessment;

commit;
