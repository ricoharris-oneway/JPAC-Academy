-- Block A6: automatic certificate issuance, graduation records, portfolio documents,
-- notifications, public verification, and next-course recommendation signals.

create extension if not exists pgcrypto;

-- Make automatic issuance idempotent for a student/course completion.
create unique index if not exists certificates_student_course_unique
  on public.certificates(student_id,course_id)
  where course_id is not null and status in ('issued','active');

create unique index if not exists certificates_verification_token_unique
  on public.certificates(verification_token);

create table if not exists public.graduation_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  wix_program_id text not null,
  course_id uuid references public.courses(id) on delete set null,
  certificate_id uuid references public.certificates(id) on delete set null,
  source_learning_state_id uuid references public.student_learning_state(id) on delete set null,
  status text not null default 'completed' check(status in ('completed','certificate_issued','notification_queued','error')),
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id,wix_program_id)
);

create table if not exists public.student_portfolio_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check(document_type in ('certificate','transcript','portfolio_export')),
  title text not null,
  certificate_id uuid references public.certificates(id) on delete cascade,
  verification_url text,
  document_url text,
  status text not null default 'available' check(status in ('queued','available','error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id,document_type,certificate_id)
);

create table if not exists public.certificate_email_queue (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  recipient_type text not null check(recipient_type in ('student','guardian','teacher','admin')),
  recipient_email text,
  template_key text not null default 'jpac_certificate_issued',
  payload jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'pending' check(delivery_status in ('pending','processing','sent','retry','failed','skipped')),
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(certificate_id,recipient_type,recipient_email)
);

create table if not exists public.aria_completion_recommendations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  wix_program_id text not null,
  completed_course_id uuid references public.courses(id) on delete set null,
  recommendation_type text not null default 'next_course',
  recommended_course_id uuid references public.courses(id) on delete set null,
  recommendation_text text not null,
  status text not null default 'active' check(status in ('active','accepted','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id,wix_program_id,recommendation_type)
);

create index if not exists graduation_events_student_idx on public.graduation_events(student_id,created_at desc);
create index if not exists portfolio_documents_student_idx on public.student_portfolio_documents(student_id,created_at desc);
create index if not exists certificate_email_queue_ready_idx on public.certificate_email_queue(delivery_status,next_attempt_at);
create index if not exists aria_completion_recommendations_student_idx on public.aria_completion_recommendations(student_id,status,created_at desc);

alter table public.graduation_events enable row level security;
alter table public.student_portfolio_documents enable row level security;
alter table public.certificate_email_queue enable row level security;
alter table public.aria_completion_recommendations enable row level security;

drop policy if exists "students read own graduation events" on public.graduation_events;
create policy "students read own graduation events" on public.graduation_events
  for select to authenticated using(student_id=auth.uid());

drop policy if exists "students read own portfolio documents" on public.student_portfolio_documents;
create policy "students read own portfolio documents" on public.student_portfolio_documents
  for select to authenticated using(student_id=auth.uid());

drop policy if exists "staff read certificate email queue" on public.certificate_email_queue;
create policy "staff read certificate email queue" on public.certificate_email_queue
  for select to authenticated using(
    exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','developer'))
  );

drop policy if exists "students read own completion recommendations" on public.aria_completion_recommendations;
create policy "students read own completion recommendations" on public.aria_completion_recommendations
  for select to authenticated using(student_id=auth.uid());

create or replace function public.jpac_issue_completion_certificate(target_learning_state uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  state_row public.student_learning_state%rowtype;
  student_row public.profiles%rowtype;
  course_row public.courses%rowtype;
  last_submission public.submissions%rowtype;
  reviewer_name text;
  certificate_id uuid;
  certificate_number text;
  verification_token text;
  credential_title text;
  verification_url text;
  next_course uuid;
  next_course_title text;
  existing_certificate uuid;
  passing_score numeric:=70;
begin
  select * into state_row from public.student_learning_state where id=target_learning_state for update;
  if state_row.id is null then raise exception 'Learning state not found'; end if;

  if state_row.completion_status<>'complete' or state_row.progress<100 then
    return jsonb_build_object('ok',true,'issued',false,'reason','Program is not complete');
  end if;

  if state_row.total_assignments<=0 or state_row.approved_assignments<state_row.total_assignments then
    return jsonb_build_object('ok',true,'issued',false,'reason','Required assignments remain incomplete');
  end if;

  if state_row.average_score<passing_score then
    return jsonb_build_object('ok',true,'issued',false,'reason','Minimum passing score has not been met');
  end if;

  select * into student_row from public.profiles where id=state_row.student_id;
  if student_row.id is null then raise exception 'Student profile not found'; end if;

  if state_row.course_id is not null then
    select * into course_row from public.courses where id=state_row.course_id;
    select c.id into existing_certificate
    from public.certificates c
    where c.student_id=state_row.student_id and c.course_id=state_row.course_id and c.status in ('issued','active')
    limit 1;
  else
    select c.id into existing_certificate
    from public.certificates c
    where c.student_id=state_row.student_id
      and c.title=coalesce((select wix_program_title from public.wix_program_enrollments where profile_id=state_row.student_id and wix_program_id=state_row.wix_program_id limit 1),'JPAC Program Completion')
      and c.status in ('issued','active')
    limit 1;
  end if;

  if existing_certificate is not null then
    return jsonb_build_object('ok',true,'issued',false,'duplicate',true,'certificateId',existing_certificate);
  end if;

  select * into last_submission from public.submissions where id=state_row.last_submission_id;
  select p.display_name into reviewer_name from public.profiles p where p.id=last_submission.reviewed_by;

  credential_title:=coalesce(course_row.title,
    (select wix_program_title from public.wix_program_enrollments where profile_id=state_row.student_id and wix_program_id=state_row.wix_program_id limit 1),
    'JPAC Program Completion');
  certificate_number:='JPAC-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  verification_token:=encode(gen_random_bytes(24),'hex');
  verification_url:='/verify/'||verification_token;

  insert into public.certificates(
    student_id,course_id,certificate_number,title,completion_date,grade,final_score,hours_completed,
    level_label,instructor_name,verification_token,status,issued_at
  ) values(
    state_row.student_id,state_row.course_id,certificate_number,credential_title,current_date,
    case when state_row.average_score>=90 then 'A' when state_row.average_score>=80 then 'B' else 'C' end,
    round(state_row.average_score,2),null,'Completed',coalesce(reviewer_name,'JPAC Academy'),verification_token,'issued',now()
  ) returning id into certificate_id;

  insert into public.student_portfolio_documents(student_id,document_type,title,certificate_id,verification_url,document_url,status)
  values(state_row.student_id,'certificate',credential_title,certificate_id,verification_url,'/api/certificate-document?token='||verification_token,'available')
  on conflict(student_id,document_type,certificate_id) do nothing;

  if to_regclass('public.student_timeline') is not null then
    execute 'insert into public.student_timeline(student_id,event_type,title,description,occurred_at) values($1,$2,$3,$4,now())'
    using state_row.student_id,'certificate',credential_title||' certificate earned','Official credential '||certificate_number||' issued by JPAC Academy.';
  end if;

  insert into public.student_notifications(student_id,notification_type,title,message,related_submission_id)
  values(state_row.student_id,'certificate_issued','Certificate issued',format('Congratulations! Your %s certificate is now available in your Creative Passport.',credential_title),state_row.last_submission_id);

  insert into public.certificate_email_queue(certificate_id,student_id,recipient_type,recipient_email,payload)
  values(certificate_id,state_row.student_id,'student',student_row.email,jsonb_build_object('studentName',student_row.display_name,'courseTitle',credential_title,'certificateNumber',certificate_number,'verificationToken',verification_token))
  on conflict(certificate_id,recipient_type,recipient_email) do nothing;

  -- Guardian, instructor, and admin delivery records are queued only when a usable address exists.
  if to_regclass('public.guardian_links') is not null then
    execute $q$
      insert into public.certificate_email_queue(certificate_id,student_id,recipient_type,recipient_email,payload)
      select $1,$2,'guardian',p.email,jsonb_build_object('studentName',$3,'courseTitle',$4,'certificateNumber',$5,'verificationToken',$6)
      from public.guardian_links gl join public.profiles p on p.id=gl.guardian_id
      where gl.student_id=$2 and p.email is not null
      on conflict(certificate_id,recipient_type,recipient_email) do nothing
    $q$ using certificate_id,state_row.student_id,student_row.display_name,credential_title,certificate_number,verification_token;
  end if;

  if last_submission.reviewed_by is not null then
    insert into public.certificate_email_queue(certificate_id,student_id,recipient_type,recipient_email,payload)
    select certificate_id,state_row.student_id,'teacher',p.email,jsonb_build_object('studentName',student_row.display_name,'courseTitle',credential_title,'certificateNumber',certificate_number)
    from public.profiles p where p.id=last_submission.reviewed_by and p.email is not null
    on conflict(certificate_id,recipient_type,recipient_email) do nothing;
  end if;

  insert into public.certificate_email_queue(certificate_id,student_id,recipient_type,recipient_email,payload)
  select certificate_id,state_row.student_id,'admin',p.email,jsonb_build_object('studentName',student_row.display_name,'courseTitle',credential_title,'certificateNumber',certificate_number)
  from public.profiles p where p.role in ('admin','developer') and p.email is not null
  on conflict(certificate_id,recipient_type,recipient_email) do nothing;

  select c.id,c.title into next_course,next_course_title
  from public.courses c
  where c.status='published' and (state_row.course_id is null or c.id<>state_row.course_id)
  order by case when lower(c.title) like lower(regexp_replace(credential_title,'level\s*[0-9]+','','gi'))||'%' then 0 else 1 end,c.title
  limit 1;

  insert into public.aria_completion_recommendations(student_id,wix_program_id,completed_course_id,recommended_course_id,recommendation_text)
  values(state_row.student_id,state_row.wix_program_id,state_row.course_id,next_course,
    case when next_course is not null then 'Program complete. Recommended next course: '||next_course_title||'.' else 'Program complete. Meet with your instructor to choose the next creative pathway.' end)
  on conflict(student_id,wix_program_id,recommendation_type) do update set
    completed_course_id=excluded.completed_course_id,
    recommended_course_id=excluded.recommended_course_id,
    recommendation_text=excluded.recommendation_text,
    status='active',updated_at=now();

  insert into public.graduation_events(student_id,wix_program_id,course_id,certificate_id,source_learning_state_id,status,payload)
  values(state_row.student_id,state_row.wix_program_id,state_row.course_id,certificate_id,state_row.id,'certificate_issued',
    jsonb_build_object('certificateNumber',certificate_number,'verificationToken',verification_token,'courseTitle',credential_title,'finalScore',state_row.average_score))
  on conflict(student_id,wix_program_id) do update set
    course_id=excluded.course_id,certificate_id=excluded.certificate_id,source_learning_state_id=excluded.source_learning_state_id,
    status='certificate_issued',payload=excluded.payload,error_message=null,updated_at=now();

  insert into public.integration_outbox(provider,event_type,dedupe_key,profile_id,payload)
  values('wix','certificate_issued','certificate_issued:'||certificate_id::text,state_row.student_id,
    jsonb_build_object('eventType','jpac_certificate_issued','eventId','jpac-certificate-'||certificate_id::text,'programId',state_row.wix_program_id,
      'studentId',state_row.student_id,'certificateId',certificate_id,'certificateNumber',certificate_number,'verificationToken',verification_token,'issuedAt',now()))
  on conflict(provider,dedupe_key) do nothing;

  return jsonb_build_object('ok',true,'issued',true,'certificateId',certificate_id,'certificateNumber',certificate_number,'verificationToken',verification_token,'verificationUrl',verification_url);
exception when others then
  insert into public.graduation_events(student_id,wix_program_id,course_id,source_learning_state_id,status,error_message,payload)
  values(state_row.student_id,state_row.wix_program_id,state_row.course_id,state_row.id,'error',sqlerrm,jsonb_build_object('sqlstate',sqlstate))
  on conflict(student_id,wix_program_id) do update set status='error',error_message=excluded.error_message,payload=excluded.payload,updated_at=now();
  raise;
end;
$$;

grant execute on function public.jpac_issue_completion_certificate(uuid) to authenticated;

create or replace function public.jpac_run_a6_after_learning_completion()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.completion_status='complete' and (old.completion_status is distinct from 'complete' or old.progress<100) then
    perform public.jpac_issue_completion_certificate(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists run_a6_after_learning_completion on public.student_learning_state;
create trigger run_a6_after_learning_completion
  after insert or update of completion_status,progress on public.student_learning_state
  for each row execute function public.jpac_run_a6_after_learning_completion();

create or replace function public.verify_credential(credential_token text)
returns table(
  certificate_number text,
  certificate_title text,
  student_name text,
  course_name text,
  completion_date date,
  grade text,
  final_score numeric,
  hours_completed numeric,
  level_label text,
  instructor_name text,
  issued_at timestamptz,
  credential_status text
)
language sql
stable
security definer
set search_path=public
as $$
  select c.certificate_number,c.title,p.display_name,co.title,c.completion_date,c.grade,c.final_score,c.hours_completed,
    c.level_label,c.instructor_name,c.issued_at,c.status
  from public.certificates c
  join public.profiles p on p.id=c.student_id
  left join public.courses co on co.id=c.course_id
  where c.verification_token::text=credential_token
    and c.status in ('issued','active')
    and c.revoked_at is null
  limit 1;
$$;

grant execute on function public.verify_credential(text) to anon,authenticated;

create or replace view public.jpac_a6_status as
select
  (select count(*) from public.graduation_events where status='certificate_issued') as certificates_automatically_issued,
  (select count(*) from public.student_portfolio_documents where document_type='certificate' and status='available') as certificate_documents_available,
  (select count(*) from public.certificate_email_queue where delivery_status='pending') as pending_certificate_notifications,
  (select count(*) from public.graduation_events where status='error') as graduation_errors,
  (select max(created_at) from public.graduation_events where status='certificate_issued') as last_certificate_issued_at;

grant select on public.jpac_a6_status to authenticated;
