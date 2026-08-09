begin;
alter table public.profiles add column if not exists first_name text,add column if not exists last_name text,add column if not exists full_name text;
alter table public.profiles alter column display_name drop not null;
update public.profiles set display_name=null where email is not null and (lower(trim(display_name))=lower(trim(email)) or lower(trim(display_name))=lower(split_part(email,'@',1)));
-- Repair missing legacy names only from the existing canonical Wix identity link.
-- Never overwrite a legitimate Academy profile name.
update public.profiles p set
  display_name=trim(w.display_name),
  full_name=coalesce(p.full_name,trim(w.display_name)),
  first_name=coalesce(p.first_name,split_part(trim(w.display_name),' ',1)),
  last_name=coalesce(p.last_name,nullif(substr(trim(w.display_name),length(split_part(trim(w.display_name),' ',1))+2),''))
from public.wix_member_links w
where w.profile_id=p.id and p.display_name is null and nullif(trim(w.display_name),'') is not null
  and position('@' in w.display_name)=0
  and (p.email is null or (lower(trim(w.display_name))<>lower(trim(p.email)) and lower(trim(w.display_name))<>lower(split_part(p.email,'@',1))));

create table if not exists public.course_levels(id uuid primary key default gen_random_uuid(),course_id uuid not null references public.courses(id) on delete cascade,level_number integer not null check(level_number between 1 and 4),title text not null,description text not null default '',learning_objectives text[] not null default '{}',status text not null default 'draft' check(status in('draft','published','archived')),approved_by uuid references public.profiles(id) on delete set null,approved_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(course_id,level_number));
alter table public.course_modules add column if not exists course_level_id uuid references public.course_levels(id) on delete restrict;
create index if not exists course_modules_level_idx on public.course_modules(course_level_id,sort_order);
alter table public.course_levels enable row level security;
drop policy if exists "enrolled students read published course levels" on public.course_levels;
drop policy if exists "staff manage course levels" on public.course_levels;
create policy "enrolled students read published course levels" on public.course_levels for select to authenticated using(status='published' and approved_at is not null and public.jpac_student_has_course_access(course_id));
create policy "staff manage course levels" on public.course_levels for all to authenticated using(public.is_staff()) with check(public.is_staff());

-- A published child of a draft level must not leak to students. Legacy modules
-- without a level retain the previously reviewed entitlement behavior.
drop policy if exists "entitled modules readable" on public.course_modules;
create policy "entitled modules readable" on public.course_modules for select to authenticated using(
  status='published' and public.jpac_student_has_course_access(course_id) and
  (course_level_id is null or exists(select 1 from public.course_levels cl where cl.id=course_level_id and cl.status='published' and cl.approved_at is not null))
);
drop policy if exists "entitled lessons readable" on public.lessons;
create policy "entitled lessons readable" on public.lessons for select to authenticated using(
  status='published' and exists(
    select 1 from public.course_modules m left join public.course_levels cl on cl.id=m.course_level_id
    where m.id=module_id and m.status='published' and (m.course_level_id is null or (cl.status='published' and cl.approved_at is not null))
      and public.jpac_student_has_course_access(m.course_id)
  )
);

insert into public.course_levels(course_id,level_number,title,description,status,approved_at)
select c.id,v.n,v.title,v.description,case when v.n=1 then 'published' else 'draft' end,case when v.n=1 then now() else null end from public.courses c cross join (values(1,'Foundation','Healthy foundations, core technique, musicianship, confidence, and safe practice.'),(2,'Development','Develop range, control, interpretation, and consistent practice.'),(3,'Performance / Application','Apply technique through repertoire, collaboration, recording, and performance.'),(4,'Professional / Career Ready','Prepare professional repertoire, audition materials, artistry, and career practice.'))v(n,title,description) where c.slug='singing' on conflict(course_id,level_number) do nothing;

do $$ declare cid uuid;lid uuid;m1 uuid;m2 uuid;l11 uuid;l12 uuid;l21 uuid;l22 uuid;begin select id into cid from public.courses where slug='singing';if cid is null then raise exception 'Canonical Singing course is required';end if;select id into lid from public.course_levels where course_id=cid and level_number=1;
select id into m1 from public.course_modules where course_id=cid and title='Breath, Alignment & Vocal Health';if m1 is null then insert into public.course_modules(course_id,course_level_id,title,description,learning_objectives,sort_order,xp_value,status) select cid,lid,'Breath, Alignment & Vocal Health','Build safe posture, breath coordination, and sustainable warm-up habits.',array['Coordinate posture and breath','Practice a safe warm-up','Recognize healthy vocal habits'],coalesce(max(sort_order),0)+1,500,'published' from public.course_modules where course_id=cid returning id into m1;end if;
select id into m2 from public.course_modules where course_id=cid and title='Pitch, Tone & First Performance';if m2 is null then insert into public.course_modules(course_id,course_level_id,title,description,learning_objectives,sort_order,xp_value,status) select cid,lid,'Pitch, Tone & First Performance','Develop pitch matching, clear tone, expressive phrasing, and a confident first performance.',array['Match foundational pitches','Shape a clear healthy tone','Perform a short prepared selection'],coalesce(max(sort_order),0)+1,500,'published' from public.course_modules where course_id=cid returning id into m2;end if;
update public.course_modules set course_level_id=lid where id in(m1,m2) and course_level_id is null;
select id into l11 from public.lessons where module_id=m1 and title='Singer Alignment and Breath';if l11 is null then insert into public.lessons(module_id,title,description,lesson_type,duration_minutes,sort_order,xp_value,status,learning_objectives) values(m1,'Singer Alignment and Breath','Learn balanced alignment and coordinated low-release breathing for singing.','interactive',20,1,125,'published',array['Demonstrate balanced singer alignment','Complete a controlled breath cycle']) returning id into l11;end if;
select id into l12 from public.lessons where module_id=m1 and title='Healthy Warm-Up Routine';if l12 is null then insert into public.lessons(module_id,title,description,lesson_type,duration_minutes,sort_order,xp_value,status,learning_objectives) values(m1,'Healthy Warm-Up Routine','Build a repeatable gentle warm-up using release, resonance, and comfortable range.','interactive',25,2,125,'published',array['Perform a safe warm-up sequence','Identify signs of vocal strain']) returning id into l12;end if;
select id into l21 from public.lessons where module_id=m2 and title='Pitch Matching and Listening';if l21 is null then insert into public.lessons(module_id,title,description,lesson_type,duration_minutes,sort_order,xp_value,status,learning_objectives) values(m2,'Pitch Matching and Listening','Use focused listening and repetition to match pitch accurately.','interactive',25,1,125,'published',array['Match single pitches','Self-correct pitch using listening']) returning id into l21;end if;
select id into l22 from public.lessons where module_id=m2 and title='Foundation Performance';if l22 is null then insert into public.lessons(module_id,title,description,lesson_type,duration_minutes,sort_order,xp_value,status,learning_objectives,rubric) values(m2,'Foundation Performance','Prepare and record a short selection demonstrating breath, pitch, tone, and expressive intent.','interactive',35,2,125,'published',array['Apply Level 1 technique in performance'],jsonb_build_object('criteria',array['Breath coordination','Pitch accuracy','Healthy tone','Preparation and expression'])) returning id into l22;end if;
if not exists(select 1 from public.activities where lesson_id=l12 and title='Five-Day Healthy Warm-Up Log') then insert into public.activities(course_id,module_id,lesson_id,title,description,activity_type,instructions,submission_type,xp_reward,estimated_minutes,required,status) values(cid,m1,l12,'Five-Day Healthy Warm-Up Log','Complete and reflect on the approved warm-up for five practice days.','practice','Record each practice date and one observation about ease, breath, or tone.','text',100,15,true,'published');end if;
if not exists(select 1 from public.activities where lesson_id=l22 and title='Level 1 Foundation Performance') then insert into public.activities(course_id,module_id,lesson_id,title,description,activity_type,instructions,submission_type,xp_reward,estimated_minutes,required,status,rubric) values(cid,m2,l22,'Level 1 Foundation Performance','Submit a short prepared vocal performance for instructor review.','performance','Record one prepared selection demonstrating the Level 1 objectives.','video',250,30,true,'published',jsonb_build_object('criteria',array['Breath coordination','Pitch accuracy','Healthy tone','Preparation and expression']));end if;end $$;
commit;
