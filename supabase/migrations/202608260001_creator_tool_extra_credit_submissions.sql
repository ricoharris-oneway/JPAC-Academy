begin;

create table if not exists public.creator_tool_extra_credit_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null constraint creator_tool_extra_credit_submissions_student_id_fkey references public.profiles(id) on delete cascade,
  tool_slug text not null check (tool_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  tool_name text not null check (char_length(tool_name) between 1 and 120),
  project_title text not null check (char_length(project_title) between 1 and 160),
  project_summary text not null check (char_length(project_summary) between 1 and 20000),
  project_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(project_snapshot) = 'object'),
  student_notes text check (student_notes is null or char_length(student_notes) <= 2000),
  status text not null default 'pending_review' check (status in ('pending_review','needs_revision','approved','rejected','withdrawn')),
  teacher_feedback text check (teacher_feedback is null or char_length(teacher_feedback) <= 4000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status in ('pending_review','withdrawn') and reviewed_by is null and reviewed_at is null) or (status in ('needs_revision','approved','rejected') and reviewed_by is not null and reviewed_at is not null)),
  check (status not in ('needs_revision','rejected') or nullif(btrim(teacher_feedback),'') is not null)
);

create table if not exists public.creator_tool_extra_credit_submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.creator_tool_extra_credit_submissions(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('submitted','withdrawn','approved','requested_revision','rejected')),
  note text check (note is null or char_length(note) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists creator_tool_extra_credit_student_idx on public.creator_tool_extra_credit_submissions(student_id,submitted_at desc);
create index if not exists creator_tool_extra_credit_queue_idx on public.creator_tool_extra_credit_submissions(status,submitted_at) where status in ('pending_review','needs_revision');
create index if not exists creator_tool_extra_credit_events_idx on public.creator_tool_extra_credit_submission_events(submission_id,created_at);

drop trigger if exists creator_tool_extra_credit_updated_at on public.creator_tool_extra_credit_submissions;
create trigger creator_tool_extra_credit_updated_at before update on public.creator_tool_extra_credit_submissions for each row execute function public.set_updated_at();

create function public.creator_tool_extra_credit_log_submission() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin insert into public.creator_tool_extra_credit_submission_events(submission_id,actor_id,event_type) values(new.id,new.student_id,'submitted');return new;end$$;
revoke all on function public.creator_tool_extra_credit_log_submission() from public,anon,authenticated;
drop trigger if exists creator_tool_extra_credit_log_submission on public.creator_tool_extra_credit_submissions;
create trigger creator_tool_extra_credit_log_submission after insert on public.creator_tool_extra_credit_submissions for each row execute function public.creator_tool_extra_credit_log_submission();

create function public.creator_tool_extra_credit_withdraw(submission_target uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$declare row_student uuid;row_status text;begin select student_id,status into row_student,row_status from public.creator_tool_extra_credit_submissions where id=submission_target for update;if row_student is null then raise exception 'Submission not found';end if;if row_student<>auth.uid() then raise exception 'You may withdraw only your own submission';end if;if row_status not in ('pending_review','needs_revision') then raise exception 'This submission can no longer be withdrawn';end if;update public.creator_tool_extra_credit_submissions set status='withdrawn',teacher_feedback=null,reviewed_by=null,reviewed_at=null where id=submission_target;insert into public.creator_tool_extra_credit_submission_events(submission_id,actor_id,event_type) values(submission_target,auth.uid(),'withdrawn');end$$;
create function public.creator_tool_extra_credit_review(submission_target uuid,review_status text,review_feedback text default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$declare event_name text;begin if not public.is_staff() then raise exception 'Staff access required';end if;if review_status not in ('approved','needs_revision','rejected') then raise exception 'Invalid review status';end if;if review_status in ('needs_revision','rejected') and nullif(btrim(review_feedback),'') is null then raise exception 'Teacher feedback is required';end if;update public.creator_tool_extra_credit_submissions set status=review_status,teacher_feedback=nullif(btrim(review_feedback),''),reviewed_by=auth.uid(),reviewed_at=now() where id=submission_target and status in ('pending_review','needs_revision');if not found then raise exception 'Submission is not available for review';end if;event_name=case review_status when 'needs_revision' then 'requested_revision' else review_status end;insert into public.creator_tool_extra_credit_submission_events(submission_id,actor_id,event_type,note) values(submission_target,auth.uid(),event_name,review_feedback);end$$;
revoke all on function public.creator_tool_extra_credit_withdraw(uuid) from public,anon;
revoke all on function public.creator_tool_extra_credit_review(uuid,text,text) from public,anon;
grant execute on function public.creator_tool_extra_credit_withdraw(uuid) to authenticated;
grant execute on function public.creator_tool_extra_credit_review(uuid,text,text) to authenticated;

alter table public.creator_tool_extra_credit_submissions enable row level security;
alter table public.creator_tool_extra_credit_submission_events enable row level security;
revoke all on public.creator_tool_extra_credit_submissions,public.creator_tool_extra_credit_submission_events from public,anon,authenticated;
grant select,insert on public.creator_tool_extra_credit_submissions to authenticated;
grant select on public.creator_tool_extra_credit_submission_events to authenticated;
drop policy if exists creator_tool_extra_credit_select on public.creator_tool_extra_credit_submissions;
create policy creator_tool_extra_credit_select on public.creator_tool_extra_credit_submissions for select to authenticated using ((select auth.uid())=student_id or public.is_staff());
drop policy if exists creator_tool_extra_credit_insert on public.creator_tool_extra_credit_submissions;
create policy creator_tool_extra_credit_insert on public.creator_tool_extra_credit_submissions for insert to authenticated with check ((select auth.uid())=student_id and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='student') and status='pending_review' and teacher_feedback is null and reviewed_by is null and reviewed_at is null);
drop policy if exists creator_tool_extra_credit_events_select on public.creator_tool_extra_credit_submission_events;
create policy creator_tool_extra_credit_events_select on public.creator_tool_extra_credit_submission_events for select to authenticated using (public.is_staff() or exists(select 1 from public.creator_tool_extra_credit_submissions s where s.id=submission_id and s.student_id=(select auth.uid())));

commit;
