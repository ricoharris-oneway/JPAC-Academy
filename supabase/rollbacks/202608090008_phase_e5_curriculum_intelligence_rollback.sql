begin;

-- Safe only before proposal/source records are used. Preserve authored records
-- by exporting them before rollback; this rollback intentionally refuses to run
-- once any durable E5 authoring data exists.
do $$ begin
  if exists(select 1 from public.curriculum_proposals)
     or exists(select 1 from public.curriculum_change_requests)
     or exists(select 1 from public.curriculum_source_sections)
     or exists(select 1 from public.curriculum_sources) then
    raise exception 'E5 authoring records exist; export/preserve them before rollback';
  end if;
end $$;

drop table if exists public.curriculum_proposals;
drop table if exists public.curriculum_change_requests;
drop table if exists public.curriculum_source_sections;
drop table if exists public.curriculum_sources;

commit;
