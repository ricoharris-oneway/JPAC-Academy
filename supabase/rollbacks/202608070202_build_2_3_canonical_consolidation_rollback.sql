-- Build 2.3 canonical consolidation rollback.
-- Intentionally retains the lab_tool_id repair and all table comments/data.
-- Reintroducing title-derived mappings or duplicate XP writes is unsafe and is
-- not automated. Roll back the application/trigger consumers instead, then use
-- the pre-Build 2.3 function from a separately reviewed emergency script only.

revoke all on function public.jpac_refresh_student_learning_state(uuid) from public,anon,authenticated;
grant execute on function public.jpac_refresh_student_learning_state(uuid) to service_role;

comment on function public.jpac_refresh_student_learning_state(uuid) is
  'Build 2.3 explicit-ID learning-state worker retained during rollback for data safety.';
