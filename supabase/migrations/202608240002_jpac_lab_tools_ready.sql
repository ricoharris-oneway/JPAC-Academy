-- Promote only the four reviewed Singing-safe JPAC lab tools to ready.
begin;

do $$
declare
  v_seeded integer;
  v_singing_links integer;
begin
  select count(*) into v_seeded from public.lab_tools
  where admin_notes='Seeded by 202608240001_jpac_lab_tools_seed'
    and slug in(
      'vocal-practice-planner','performance-prep-checklist','assignment-practice-builder',
      'portfolio-builder-checklist','script-scene-rehearsal-tool','dance-rehearsal-tracker',
      'songwriting-idea-pad','video-shot-planner'
    ) and status in('testing','ready') and tool_type='built_in' and launch_url is null and xp_reward=0;
  if v_seeded<>8 or (select count(*) from public.lab_tools)<>8 then
    raise exception 'Expected exactly eight seed-owned testing/ready lab tools';
  end if;

  if exists(
    select 1 from public.lab_tools
    where admin_notes='Seeded by 202608240001_jpac_lab_tools_seed'
      and slug in('script-scene-rehearsal-tool','dance-rehearsal-tracker','songwriting-idea-pad','video-shot-planner')
      and status<>'testing'
  ) then raise exception 'Non-Singing tools must remain testing'; end if;

  select count(*) into v_singing_links
  from public.lab_tool_courses ltc join public.lab_tools t on t.id=ltc.lab_tool_id
  join public.courses c on c.id=ltc.course_id
  where t.admin_notes='Seeded by 202608240001_jpac_lab_tools_seed' and c.slug='singing'
    and t.slug in('vocal-practice-planner','performance-prep-checklist','assignment-practice-builder','portfolio-builder-checklist');
  if v_singing_links<>4 or (select count(*) from public.lab_tool_courses)<>4 then
    raise exception 'Expected exactly four approved Singing course links';
  end if;
  if exists(
    select 1 from public.lab_tool_courses ltc join public.lab_tools t on t.id=ltc.lab_tool_id
    join public.courses c on c.id=ltc.course_id
    where t.admin_notes='Seeded by 202608240001_jpac_lab_tools_seed' and c.slug<>'singing'
  ) then raise exception 'Seed tools must not be assigned outside Singing'; end if;
  if exists(select 1 from public.course_modules where lab_tool_id is not null) then
    raise exception 'Direct module tool bindings must remain empty';
  end if;

  update public.lab_tools
  set status='ready',updated_at=now()
  where admin_notes='Seeded by 202608240001_jpac_lab_tools_seed'
    and status='testing'
    and slug in('vocal-practice-planner','performance-prep-checklist','assignment-practice-builder','portfolio-builder-checklist');

  if (select count(*) from public.lab_tools where status='ready')<>4 then
    raise exception 'Expected exactly four globally ready tools after promotion';
  end if;
  if (select count(*) from public.lab_tools where admin_notes='Seeded by 202608240001_jpac_lab_tools_seed'
    and slug in('script-scene-rehearsal-tool','dance-rehearsal-tracker','songwriting-idea-pad','video-shot-planner') and status='testing')<>4 then
    raise exception 'Expected four non-promoted tools to remain testing';
  end if;
end;
$$;

commit;
