# JPAC Creative Studio Lab Tools Seed Rollout

## Purpose

This rollout prepares the first reviewed Creative Studio lab-tool catalog and Singing course assignments. It changes catalog and course-link data only when deliberately executed; creating and reviewing these artifacts does not execute SQL.

## Diagnosis summary

The canonical infrastructure already exists:

- `public.lab_tools` stores the tool catalog.
- `public.lab_tool_courses` stores course-level assignments.
- `public.course_modules.lab_tool_id` supports optional direct module binding but is outside this rollout.
- `public.course_modules.jpac_tool_activity` is curriculum metadata, not an installed Studio tool catalog.

The diagnosed baseline was zero catalog rows, zero course assignments, and zero direct module bindings. `StudioPage` correctly shows only `ready` tools assigned to a student's active enrolled courses, so the empty assigned-tools state was caused by missing catalog/link data rather than frontend filtering.

## Seeded tools

| Tool | Stable slug/internal key | Initial course assignment |
| --- | --- | --- |
| Vocal Practice Planner | `vocal-practice-planner` | Singing |
| Performance Prep Checklist | `performance-prep-checklist` | Singing |
| Assignment Practice Builder | `assignment-practice-builder` | Singing |
| Script & Scene Rehearsal Tool | `script-scene-rehearsal-tool` | None |
| Dance Rehearsal Tracker | `dance-rehearsal-tracker` | None |
| Songwriting Idea Pad | `songwriting-idea-pad` | None |
| Video Shot Planner | `video-shot-planner` | None |
| Portfolio Builder Checklist | `portfolio-builder-checklist` | Singing |

All eight tools are built-in planning/checklist concepts. They receive zero configured XP and require no uploads, external APIs, AI generation, or student-state writes.

## Visibility and launch strategy

All tools are seeded with `status = 'testing'`, which is supported by the existing `lab_tools` constraint and excluded by the current student Studio query and ready-only RLS policy. No tool is promoted to `ready` in this rollout.

Stable slugs act as internal launch keys. `launch_url` remains null because no reviewed tool route exists yet; no external URL is introduced. After tool behavior and routes are reviewed, selected records can be promoted in a separate approved rollout.

## Singing-only assignment strategy

Four broadly safe tools are linked to the existing `singing` course through `lab_tool_courses`: Vocal Practice Planner, Performance Prep Checklist, Assignment Practice Builder, and Portfolio Builder Checklist. Assignments are recommended but not required.

No other course receives a link. No `course_modules.lab_tool_id` value is written, so these assignments do not bind a tool to draft modules or alter curriculum. Course-level links remain invisible while their tools are in `testing`.

## Why `jpac_tool_activity` is not converted

`jpac_tool_activity` describes curriculum activity and review expectations. Treating it as an installed tool would mix curriculum metadata with the canonical tool catalog and could expose draft-course concepts. This rollout reads or writes none of that metadata.

## Preflight

Run `supabase/validation/202608240001_jpac_lab_tools_seed_preflight.sql` manually in an authorized environment before applying the migration. It is wrapped in a read-only transaction and verifies:

- Canonical tables, required columns, and the safe `testing` status.
- Zero-tool, zero-link, and zero-direct-module-binding baselines.
- Exactly one Singing course.
- Protected course module counts.
- Assignment Swap, student-state, certificate, and Community Wall preservation baselines.
- `OVERALL PASS` only with zero blockers.

## Migration

After human review and a passing preflight, apply `supabase/migrations/202608240001_jpac_lab_tools_seed.sql` through the approved migration workflow. It:

- Inserts exactly eight marked catalog rows on the first clean application.
- Uses unique stable slugs and `ON CONFLICT DO NOTHING` for safe reruns.
- Accepts only an empty catalog or the exact complete prior seed state.
- Inserts exactly four Singing mappings.
- Performs no curriculum, module, student, evidence, XP, progress, enrollment, submission, certificate, or Community Wall write.

## Post-validation

Run `supabase/validation/202608240001_jpac_lab_tools_seed_post_validation.sql` after application. It confirms:

- All eight exact names/slugs exist with the seed marker.
- All eight remain built-in, zero-XP, null-launch, and `testing`.
- No globally ready tools exist under the approved zero-row baseline.
- Exactly four seed mappings target Singing and none target another course.
- Direct module bindings remain zero.
- Protected curriculum, Assignment Swap, student-state, certificates, and Community Wall tables remain intact.

## Rollback scope

`supabase/rollbacks/202608240001_jpac_lab_tools_seed_rollback.sql` deletes course mappings and catalog rows only when they carry both an expected slug and the migration-specific `admin_notes` marker. It does not delete courses, modules, users, student evidence, or later unrelated tool records.

## Studio UI expectations

Immediately after this seed, students should still see no assigned database tools because all seeded tools remain in `testing`. Existing static Studio workflow templates remain available and unchanged. A later reviewed implementation must add safe internal routes or tool components before any selected record is promoted to `ready`.

## Pilot recommendation

Review the four Singing-safe tool definitions and build their internal, non-writing experiences first. Test with staff before promoting a minimal subset to `ready`, then verify visibility using the controlled internal test-student account. Do not bind tools to modules or award XP during this pilot.

## Future course expansion

Acting, Dance, Music Production/Songwriting, Video Production, Digital AI Creator, and other programs should receive tool assignments only through separate course-specific reviews. Each expansion should verify course publication boundaries, tool behavior, safe launch routing, and entitlement behavior before changing visibility.
