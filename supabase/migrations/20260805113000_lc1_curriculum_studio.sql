-- JPAC Academy LC1.2: AI-ready Curriculum Studio

alter table public.courses
  add column if not exists description text not null default '',
  add column if not exists thumbnail_url text,
  add column if not exists wix_program_id text,
  add column if not exists wix_program_url text,
  add column if not exists difficulty text not null default 'beginner',
  add column if not exists learning_objectives text[] not null default '{}',
  add column if not exists skill_tags text[] not null default '{}',
  add column if not exists career_tags text[] not null default '{}',
  add column if not exists ai_summary text not null default '',
  add column if not exists prerequisites text[] not null default '{}',
  add column if not exists completion_requirements jsonb not null default '{}'::jsonb,
  add column if not exists certificate_template_slug text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.course_modules
  add column if not exists learning_objectives text[] not null default '{}',
  add column if not exists skill_tags text[] not null default '{}',
  add column if not exists ai_summary text not null default '',
  add column if not exists prerequisites text[] not null default '{}';

alter table public.lessons
  add column if not exists learning_objectives text[] not null default '{}',
  add column if not exists skill_tags text[] not null default '{}',
  add column if not exists ai_summary text not null default '',
  add column if not exists common_difficulties text[] not null default '{}',
  add column if not exists remediation_notes text not null default '',
  add column if not exists instructor_notes text not null default '',
  add column if not exists rubric jsonb not null default '{}'::jsonb;

alter table public.activities
  add column if not exists skill_tags text[] not null default '{}',
  add column if not exists ai_summary text not null default '',
  add column if not exists rubric jsonb not null default '{}'::jsonb,
  add column if not exists badge_slug text,
  add column if not exists certificate_eligible boolean not null default false;

create or replace function public.curriculum_create_course(
  course_title text,
  course_slug text,
  course_description text default '',
  course_total_xp integer default 50000,
  wix_url text default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  insert into public.courses(title,slug,description,total_xp,status,wix_program_url)
  values(course_title,course_slug,coalesce(course_description,''),greatest(course_total_xp,0),'draft',wix_url)
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.curriculum_add_module(
  target_course uuid,
  module_title text,
  module_description text default '',
  module_xp integer default 0
) returns uuid
language plpgsql security definer set search_path=public as $$
declare new_id uuid; next_order integer;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select coalesce(max(sort_order),0)+1 into next_order from public.course_modules where course_id=target_course;
  insert into public.course_modules(course_id,title,description,xp_value,sort_order,status)
  values(target_course,module_title,coalesce(module_description,''),greatest(module_xp,0),next_order,'draft')
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.curriculum_add_lesson(
  target_module uuid,
  lesson_title text,
  lesson_description text default '',
  lesson_xp integer default 0,
  wix_url text default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare new_id uuid; next_order integer;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select coalesce(max(sort_order),0)+1 into next_order from public.lessons where module_id=target_module;
  insert into public.lessons(module_id,title,description,xp_value,sort_order,status,wix_lesson_url)
  values(target_module,lesson_title,coalesce(lesson_description,''),greatest(lesson_xp,0),next_order,'draft',wix_url)
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.curriculum_add_activity(
  target_course uuid,
  target_module uuid,
  target_lesson uuid,
  activity_title text,
  activity_description text default '',
  activity_xp integer default 0,
  activity_kind text default 'practice'
) returns uuid
language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  insert into public.activities(course_id,module_id,lesson_id,title,description,xp_reward,activity_type,status)
  values(target_course,target_module,target_lesson,activity_title,coalesce(activity_description,''),greatest(activity_xp,0),activity_kind,'draft')
  returning id into new_id;
  return new_id;
end $$;

grant execute on function public.curriculum_create_course(text,text,text,integer,text) to authenticated;
grant execute on function public.curriculum_add_module(uuid,text,text,integer) to authenticated;
grant execute on function public.curriculum_add_lesson(uuid,text,text,integer,text) to authenticated;
grant execute on function public.curriculum_add_activity(uuid,uuid,uuid,text,text,integer,text) to authenticated;
