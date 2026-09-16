begin;

-- The existing RPC remains the only write path. The previous implementation
-- accidentally capped every progress report at ten seconds, so 90% could
-- never be reached for normal-length videos.
create or replace function public.jpac_record_module_video_progress(target_module uuid,watched integer,duration integer)
returns numeric language plpgsql security definer set search_path=public as $$
declare pct numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if watched<0 or duration<=0 or watched>duration+5 then raise exception 'Invalid video progress'; end if;
  if not exists(select 1 from public.course_modules m where m.id=target_module and m.status='published' and public.jpac_student_has_course_access(m.course_id)) or not public.jpac_module_is_unlocked(target_module,auth.uid()) then raise exception 'Module access required'; end if;
  insert into public.module_video_progress(student_id,module_id,watched_seconds,duration_seconds)
  values(auth.uid(),target_module,least(watched,duration),duration)
  on conflict(student_id,module_id) do update set
    watched_seconds=greatest(module_video_progress.watched_seconds,least(excluded.watched_seconds,excluded.duration_seconds,floor(extract(epoch from now()-module_video_progress.started_at))::integer+10)),
    duration_seconds=excluded.duration_seconds,last_watched_at=now();
  update public.module_video_progress set completed_at=coalesce(completed_at,now()) where student_id=auth.uid() and module_id=target_module and percent_watched>=90;
  select percent_watched into pct from public.module_video_progress where student_id=auth.uid() and module_id=target_module;
  if pct>=90 then perform public.jpac_award_module_core_component(auth.uid(),target_module,'video');perform public.jpac_finalize_module_mastery(auth.uid(),target_module);end if;
  return pct;
end; $$;
revoke all on function public.jpac_record_module_video_progress(uuid,integer,integer) from public,anon;
grant execute on function public.jpac_record_module_video_progress(uuid,integer,integer) to authenticated;

comment on function public.jpac_record_module_video_progress(uuid,integer,integer) is
  'Server-authoritative, idempotent video progress. Credit is awarded once at 90 percent; replay cannot duplicate XP.';

create or replace function public.jpac_staff_approval_queue()
returns table (
  item_id uuid,
  student_name text,
  student_email text,
  item_type text,
  item_status text,
  item_date timestamptz,
  action_route text
)
language sql
security definer
set search_path = public
as $$
  select e.id, coalesce(p.display_name, 'Unnamed student'), coalesce(p.email, 'No email'),
    'Enrollment verification', e.status, e.enrolled_at, '/enrollment'
  from public.enrollments e
  join public.profiles p on p.id = e.student_id
  where public.is_academy_staff() and e.status in ('pending', 'awaiting_verification')
  union all
  select l.id, coalesce(p.display_name, 'Unnamed student'), coalesce(p.email, 'No email'),
    'Payment verification', l.payment_status, l.created_at, '/staff/payment-ledger'
  from public.student_payment_ledger l
  join public.profiles p on p.id = l.student_id
  where public.is_academy_staff() and l.payment_status = 'pending'
  union all
  select l.id, coalesce(p.display_name, 'Unnamed student'), coalesce(p.email, 'No email'),
    'Consent review', l.consent_status, l.updated_at, '/staff/consent-ledger'
  from public.student_consent_ledger l
  join public.profiles p on p.id = l.student_id
  where public.is_academy_staff() and l.consent_status in ('incomplete', 'needs_review')
  union all
  select s.id, coalesce(p.display_name, 'Unnamed student'), coalesce(p.email, 'No email'),
    'Assignment submission', s.status, s.submitted_at, '/teacher'
  from public.submissions s
  join public.profiles p on p.id = s.student_id
  where public.is_academy_staff() and s.status in ('submitted', 'under_review')
  union all
  select ps.id, trim(ps.first_name || ' ' || ps.last_name), coalesce(ps.email, 'No email'),
    'Admissions follow-up', ps.enrollment_status, ps.created_at, '/manual-student'
  from public.pending_students ps
  where public.is_academy_staff()
    and (ps.enrollment_status = 'pending' or ps.invitation_status in ('not_sent', 'queued', 'sent'))
  order by item_date desc;
$$;

revoke all on function public.jpac_staff_approval_queue() from public, anon;
grant execute on function public.jpac_staff_approval_queue() to authenticated;

commit;
