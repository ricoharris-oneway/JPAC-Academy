-- Block A2 completion: private performance media storage and secure submission creation

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('performance-submissions','performance-submissions',false,524288000,array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/wave','video/mp4','video/quicktime','video/webm'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "students upload own performance media" on storage.objects;
create policy "students upload own performance media" on storage.objects
for insert to authenticated
with check(bucket_id='performance-submissions' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "students read own performance media" on storage.objects;
create policy "students read own performance media" on storage.objects
for select to authenticated
using(bucket_id='performance-submissions' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('teacher','admin','developer'))));

drop policy if exists "students replace own performance media" on storage.objects;
create policy "students replace own performance media" on storage.objects
for update to authenticated
using(bucket_id='performance-submissions' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='performance-submissions' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.jpac_create_wix_submission(
  assignment_external_id text,
  target_student uuid,
  file_name text,
  file_type text,
  file_url text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  assignment_record public.wix_assignments%rowtype;
  submission_id uuid;
  caller_role text;
begin
  select role into caller_role from public.profiles where id=auth.uid();
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_student<>auth.uid() and coalesce(caller_role,'student') not in ('teacher','admin','developer') then raise exception 'Not authorized for target student'; end if;

  select * into assignment_record from public.wix_assignments
  where wix_assignment_id=assignment_external_id and status='active';
  if assignment_record.id is null then raise exception 'Wix assignment not found or inactive'; end if;

  insert into public.submissions(student_id,status,submitted_at,wix_assignment_id,media_name,media_type,media_url,source)
  values(target_student,'submitted',now(),assignment_record.id,file_name,file_type,file_url,'wix_bridge')
  returning id into submission_id;
  return submission_id;
end;
$$;

grant execute on function public.jpac_create_wix_submission(text,uuid,text,text,text) to authenticated;
