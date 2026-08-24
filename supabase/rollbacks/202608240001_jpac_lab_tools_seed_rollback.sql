-- Roll back only rows owned by the JPAC lab-tools seed migration.
begin;

delete from public.lab_tool_courses ltc
using public.lab_tools t
where ltc.lab_tool_id=t.id
  and t.admin_notes='Seeded by 202608240001_jpac_lab_tools_seed'
  and t.slug in(
    'vocal-practice-planner','performance-prep-checklist','assignment-practice-builder',
    'script-scene-rehearsal-tool','dance-rehearsal-tracker','songwriting-idea-pad',
    'video-shot-planner','portfolio-builder-checklist'
  );

delete from public.lab_tools
where admin_notes='Seeded by 202608240001_jpac_lab_tools_seed'
  and tool_type='built_in'
  and slug in(
    'vocal-practice-planner','performance-prep-checklist','assignment-practice-builder',
    'script-scene-rehearsal-tool','dance-rehearsal-tracker','songwriting-idea-pad',
    'video-shot-planner','portfolio-builder-checklist'
  );

commit;
