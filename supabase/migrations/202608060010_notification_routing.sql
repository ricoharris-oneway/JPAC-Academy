-- Central notification routing. Admins can change departmental recipients without code changes.

create table if not exists public.notification_routes (
  route_key text primary key,
  label text not null,
  description text,
  recipients text[] not null default '{}',
  enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.notification_routes(route_key,label,description,recipients) values
  ('student_enrollment','Student enrollment notifications','New enrollments and enrollment changes',array['enrollment@jmonespac.org']),
  ('teacher_assignments','Teacher assignment notifications','New submissions and assignments requiring staff action',array['teachers@jmonespac.org']),
  ('certificate_admin','Certificate and graduation notifications','Certificates issued, graduations, and credential exceptions',array['certificates@jmonespac.org']),
  ('certificate_teacher','Certificate instructor notifications','Instructor-facing certificate completion notices',array['teachers@jmonespac.org']),
  ('billing','Billing and subscription notifications','Pricing plan, payment, and subscription alerts',array['billing@jmonespac.org']),
  ('support','Support requests','Student, guardian, and staff support requests',array['support@jmonespac.org']),
  ('system_admin','System and integration alerts','Integration failures, retries, and production alerts',array['admin@jmonespac.org']),
  ('aria_system','ARIA system notifications','ARIA processing and intelligence exceptions',array['aria@jmonespac.org']),
  ('general_contact','General contact','General Academy correspondence',array['info@jmonespac.org'])
on conflict(route_key) do nothing;

alter table public.notification_routes enable row level security;

drop policy if exists "staff read notification routes" on public.notification_routes;
create policy "staff read notification routes" on public.notification_routes
  for select to authenticated using (
    exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','developer'))
  );

drop policy if exists "staff update notification routes" on public.notification_routes;
create policy "staff update notification routes" on public.notification_routes
  for update to authenticated using (
    exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','developer'))
  ) with check (
    exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','developer'))
  );

create or replace function public.admin_save_notification_route(
  target_route_key text,
  target_recipients text[],
  target_enabled boolean
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare caller_role text;
begin
  select role into caller_role from public.profiles where id=auth.uid();
  if caller_role not in ('admin','developer') then raise exception 'Administrator access required'; end if;

  update public.notification_routes
  set recipients=(select coalesce(array_agg(lower(trim(value))), '{}') from unnest(coalesce(target_recipients,'{}')) value where trim(value)<>''),
      enabled=target_enabled,
      updated_by=auth.uid(),
      updated_at=now()
  where route_key=target_route_key;

  if not found then raise exception 'Notification route not found'; end if;
end;
$$;

grant execute on function public.admin_save_notification_route(text,text[],boolean) to authenticated;

-- Departmental certificate notices use the configured routing addresses.
-- Student and guardian notices remain tied to their personal account email addresses.
create or replace function public.jpac_apply_certificate_notification_route()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare configured text[]; route_name text;
begin
  route_name:=case new.recipient_type when 'admin' then 'certificate_admin' when 'teacher' then 'certificate_teacher' else null end;
  if route_name is null then return new; end if;

  select recipients into configured from public.notification_routes where route_key=route_name and enabled=true;
  if coalesce(array_length(configured,1),0)>0 then
    -- One queue row is expanded into the configured recipient list by the delivery worker.
    new.recipient_email:=array_to_string(configured,',');
    new.payload:=coalesce(new.payload,'{}'::jsonb)||jsonb_build_object('notificationRoute',route_name,'recipients',configured);
  end if;
  return new;
end;
$$;

drop trigger if exists apply_certificate_notification_route on public.certificate_email_queue;
create trigger apply_certificate_notification_route
  before insert or update of recipient_type,recipient_email on public.certificate_email_queue
  for each row execute function public.jpac_apply_certificate_notification_route();
