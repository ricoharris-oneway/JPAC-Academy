-- JPAC Academy LC1.4 JPAC LAB Manager
alter table public.lab_tools add column if not exists short_label text;
alter table public.lab_tools add column if not exists thumbnail_url text;
alter table public.lab_tools add column if not exists version text not null default '1.0.0';
alter table public.lab_tools add column if not exists estimated_minutes integer not null default 15;
alter table public.lab_tools add column if not exists ai_recommended boolean not null default true;
alter table public.lab_tools add column if not exists student_instructions text not null default '';
alter table public.lab_tools add column if not exists admin_notes text not null default '';
alter table public.lab_tools add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create table if not exists public.lab_tool_courses(
  lab_tool_id uuid not null references public.lab_tools(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  recommended boolean not null default true,
  required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key(lab_tool_id,course_id)
);

alter table public.lab_tool_courses enable row level security;
drop policy if exists "staff manage lab tool courses" on public.lab_tool_courses;
create policy "staff manage lab tool courses" on public.lab_tool_courses for all to authenticated using(public.is_staff()) with check(public.is_staff());
drop policy if exists "students read lab tool courses" on public.lab_tool_courses;
create policy "students read lab tool courses" on public.lab_tool_courses for select to authenticated using(true);

create or replace function public.lab_manager_save_tool(
  target_id uuid,
  tool_name text,
  tool_slug text,
  tool_description text,
  tool_category text,
  tool_kind text,
  tool_launch_url text,
  tool_icon text,
  tool_xp integer,
  tool_status text,
  tool_version text,
  tool_minutes integer,
  tool_ai_recommended boolean,
  tool_instructions text,
  compatible_courses uuid[] default '{}'
) returns uuid language plpgsql security definer set search_path=public as $$
declare saved_id uuid;
begin
  if not public.is_staff() then raise exception 'Not authorized'; end if;
  if target_id is null then
    insert into public.lab_tools(slug,name,description,category,tool_type,launch_url,icon,xp_reward,status,version,estimated_minutes,ai_recommended,student_instructions,updated_by)
    values(tool_slug,tool_name,coalesce(tool_description,''),tool_category,tool_kind,nullif(tool_launch_url,''),nullif(tool_icon,''),greatest(tool_xp,0),tool_status,coalesce(nullif(tool_version,''),'1.0.0'),greatest(tool_minutes,1),tool_ai_recommended,coalesce(tool_instructions,''),auth.uid()) returning id into saved_id;
  else
    update public.lab_tools set slug=tool_slug,name=tool_name,description=coalesce(tool_description,''),category=tool_category,tool_type=tool_kind,launch_url=nullif(tool_launch_url,''),icon=nullif(tool_icon,''),xp_reward=greatest(tool_xp,0),status=tool_status,version=coalesce(nullif(tool_version,''),'1.0.0'),estimated_minutes=greatest(tool_minutes,1),ai_recommended=tool_ai_recommended,student_instructions=coalesce(tool_instructions,''),updated_by=auth.uid(),updated_at=now() where id=target_id returning id into saved_id;
  end if;
  delete from public.lab_tool_courses where lab_tool_id=saved_id;
  insert into public.lab_tool_courses(lab_tool_id,course_id) select saved_id,unnest(compatible_courses) on conflict do nothing;
  return saved_id;
end;$$;

grant execute on function public.lab_manager_save_tool(uuid,text,text,text,text,text,text,text,integer,text,text,integer,boolean,text,uuid[]) to authenticated;