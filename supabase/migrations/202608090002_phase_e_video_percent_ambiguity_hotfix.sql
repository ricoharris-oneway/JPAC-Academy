begin;

-- Qualify every completion fact in the final projection. In PL/pgSQL,
-- RETURNS TABLE output columns are variables, so the former unqualified
-- video_percent reference conflicted with facts.video_percent.
create or replace function public.jpac_module_completion(target_student uuid,target_module uuid)
returns table(video_percent numeric,assignment_score numeric,core_xp_earned integer,core_xp_available integer,core_xp_threshold integer,intro_complete boolean,assignment_submitted boolean,assessment_passed boolean,mastery_awarded boolean,is_complete boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  if target_student<>auth.uid() and not public.is_staff() then raise exception 'Not authorized'; end if;
  return query with facts as(
    select coalesce(v.percent_watched,0) video_percent,
      coalesce((select max(s.score) from public.submissions s join public.activities a on a.id=s.activity_id where s.student_id=target_student and a.module_id=target_module and a.required and a.activity_type in('assignment','performance','quiz')),0) assignment_score,
      coalesce((select sum(x.amount) from public.xp_ledger x where x.student_id=target_student and x.module_id=target_module and x.xp_type='core'),0)::integer core_earned,
      m.core_xp core_available,
      m.core_unlock_threshold core_threshold,
      exists(select 1 from public.xp_ledger x where x.student_id=target_student and x.module_id=target_module and x.xp_type='core' and x.metadata->>'component'='intro') intro_done,
      exists(select 1 from public.submissions s join public.activities a on a.id=s.activity_id where s.student_id=target_student and a.module_id=target_module and a.required and a.activity_type in('assignment','performance','quiz')) submitted,
      exists(select 1 from public.activities a where a.module_id=target_module and a.required and a.activity_type in('assignment','performance','quiz')) and not exists(select 1 from public.activities a where a.module_id=target_module and a.required and a.activity_type in('assignment','performance','quiz') and not exists(select 1 from public.submissions s where s.activity_id=a.id and s.student_id=target_student and s.status='approved' and s.score>=a.passing_score)) assessment_ok,
      exists(select 1 from public.xp_ledger x where x.student_id=target_student and x.module_id=target_module and x.xp_type='core' and x.metadata->>'component'='mastery') mastery_done
    from public.course_modules m left join public.module_video_progress v on v.module_id=m.id and v.student_id=target_student where m.id=target_module
  ) select facts.video_percent,facts.assignment_score,facts.core_earned,facts.core_available,facts.core_threshold,facts.intro_done,facts.submitted,facts.assessment_ok,facts.mastery_done,
    facts.video_percent>=90 and facts.intro_done and facts.submitted and facts.assessment_ok and facts.core_earned>=facts.core_threshold and facts.mastery_done from facts;
end;
$$;

revoke all on function public.jpac_module_completion(uuid,uuid) from public,anon;
grant execute on function public.jpac_module_completion(uuid,uuid) to authenticated;

commit;
