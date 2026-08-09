# Build 2.5 Phase E4 — Curriculum Studio

Phase E4 extends the existing Studio rather than replacing the learning engine. It provides staff-only draft editing, local authorized preview, readiness indicators, approved-tool association, and aggregate historical-evidence warnings. It does not publish curriculum or execute the controlled Module 2 transition.

## Reused infrastructure

- `public.is_staff()` and `public.is_admin()` remain the authorization authorities.
- Existing course, level, module, lesson, activity, rubric, E3 authoring, approval, Lab Manager, and status fields remain canonical.
- Existing `draft`, `review`, `approved`, `published`, and `archived` states are reused.
- Core XP, unlock thresholds, assessments, video watch completion, and publication remain server-authoritative.

## Safety model

- Normal Studio Save cannot edit published modules, lessons, or activities.
- The published Module 2 pilot is represented separately from its private `staged_replacement` configuration. Saving replacement metadata cannot change the pilot.
- No delete RPC exists. Historical-data badges use aggregate counts and expose no student identity, media, response, score, or feedback.
- Module number, UUIDs, Core XP, the 438 threshold, and activity XP are never accepted by save RPCs.
- Teachers may save drafts and submit review state. Only admins/developers may approve. Studio never publishes.
- A selected Lab tool must be `ready` and have a launch URL; otherwise the association remains unavailable and students receive no Open Tool link.

## Video-version limitation

`module_video_progress` is keyed to student/module and does not store a video identity or version. Replacing media on an already published module could cause prior 90% evidence to apply to different media, or tempt an unsafe reset. E4 blocks published media editing and does not alter watch progress. A future version-aware media transition must define whether existing evidence is preserved, grandfathered, or reassessed before published videos are replaced.

## Readiness

The administrative checklist evaluates mission, lesson depth, real-world practice, required challenge, rubric total, passing score, primary video, ready Lab association, ARIA evidence targets, and career connection. It reports `NOT READY`, `NEEDS REVIEW`, or `READY FOR APPROVAL`; none of these states publish content.

## Live Lab audit

The configured Supabase project was queried read-only on 2026-08-09 using the public frontend client configuration. `public.lab_tools` returned zero visible rows. Therefore all ten proposed Beginner Singing Labs are currently **FUTURE**: Breath Cycle Comparison, Natural Tone Comparison, Pitch Match Lab, Rhythm Match Lab, Tone Color Lab, Lyric Clarity Lab, Dynamics Comparison Lab, Recording Setup Lab, Performance Review Lab, and Showcase Review Lab. No Open Tool link should be shown. READY requires a matching `ready` tool with a launch URL; PARTIAL indicates a catalog match that is not ready/launchable. Human testing remains required after tools are added.

## Deployment sequence

1. Preserve the current E3 authoring and Module 2 validation results.
2. Apply `202608090005_phase_e4_curriculum_studio.sql` in preview.
3. Run E4 validation and review actual Lab classifications.
4. Deploy the application to preview and validate teacher/admin/student role boundaries.
5. Exercise draft module, lesson, block, activity, rubric, video, Lab, ARIA, career, portfolio, evidence-warning, and preview workflows.
6. Confirm students still see only published Module 1 and the published Module 2 pilot.
7. Apply E4 migration and application during the production maintenance window.
8. Repeat validation. Do not run `202608090004_phase_e3_beginner_publication_transition.sql` during E4.
