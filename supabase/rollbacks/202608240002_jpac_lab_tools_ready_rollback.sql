-- Return only the four Singing-safe promoted tools to testing.
begin;

update public.lab_tools
set status='testing',updated_at=now()
where admin_notes='Seeded by 202608240001_jpac_lab_tools_seed'
  and status='ready'
  and slug in('vocal-practice-planner','performance-prep-checklist','assignment-practice-builder','portfolio-builder-checklist');

commit;
