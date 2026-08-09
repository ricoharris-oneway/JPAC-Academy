begin;
do $$ begin
  if exists(select 1 from public.curriculum_versions) or exists(select 1 from public.curriculum_proposal_sources)
     or exists(select 1 from storage.objects where bucket_id='curriculum-sources')
     or exists(select 1 from public.curriculum_sources where source_hash is not null) then
    raise exception 'Durable E6 source/version records exist; export and preserve them before rollback';
  end if;
end $$;
drop policy if exists curriculum_source_files_admin_only on storage.objects;
delete from storage.buckets where id='curriculum-sources';
drop table if exists public.curriculum_version_items;
drop table if exists public.curriculum_versions;
drop table if exists public.curriculum_proposal_sources;
drop index if exists public.curriculum_source_sections_search_idx;
drop index if exists public.curriculum_source_sections_authority_idx;
drop index if exists public.curriculum_sources_hash_idx;
alter table public.curriculum_source_sections drop column if exists search_vector,drop column if exists keywords,drop column if exists classification,drop column if exists content_hash;
alter table public.curriculum_sources drop column if exists ready_at,drop column if exists processing_error,drop column if exists processing_status,drop column if exists storage_path,drop column if exists source_hash,drop column if exists file_size,drop column if exists mime_type,drop column if exists file_format;
alter table public.curriculum_sources drop constraint if exists curriculum_sources_source_type_check;
alter table public.curriculum_sources add constraint curriculum_sources_source_type_check check(source_type in('jpac_curriculum','aria_standard','administrator_instruction','other_approved'));
commit;
