# Dance Full 47-Module Draft Rollout

## Status and authority

Review-only artifact set. No SQL is authorized by this document. `DANCE-FULL-PROGRAM-SOURCE-MAP.md` is the approved canonical source decision: the Program PDF controls structure and the Tutor PDF guides Aria coaching only.

## Canonical structure

| Record | Expected count |
|---|---:|
| Levels | 4 |
| Modules | 47 |
| Beginner modules | 12 |
| Intermediate modules | 12 |
| Advanced modules | 12 |
| Master modules | 11 |
| Lessons | 141 |
| Optional Practice activities | 47 |
| Required Core Challenges | 47 |
| Rubric criteria | 235 |
| Active media rows | 0 |
| Tool bindings | 0 |

Global `sort_order` is dense from 1 through 47. Source-facing numbering preserves Master Modules 1-10 and 12; no Master Module 11 is created. Advanced Module 12 is the Advanced capstone/showcase. Master Module 12 is the final Master capstone. Master Modules 8 and 9 remain separate and are marked `NEEDS REVIEW` for future consolidation.

## Module contract

Each module contains three draft lessons, one optional draft Practice, and one required draft performance Core Challenge. Each Core Challenge contains these five criteria totaling 100:

1. Rhythm & Timing - 20
2. Technique & Body Control - 25
3. Musicality & Expression - 20
4. Choreography / Movement Design - 20
5. Performance Presence & Confidence - 15

Canonical XP remains `50/100/350/125`, module total `625`, unlock threshold `438`, and passing score `70`.

## Draft, safety, and cleanup rules

- All levels, modules, lessons, and activities remain `draft`.
- Media is noted as `NEEDS REVIEW`; no media row or URL is activated.
- Tools are noted as `NEEDS CATALOG REVIEW`; no tool or Lab binding is created.
- Google Classroom becomes the existing JPAC-native submission and teacher-review workflow.
- CapCut and Cakewalk are optional examples only, with accessible alternatives.
- Contradictory `Overview Video: None` URLs are not imported.
- Aria is advisory only and cannot assess, approve, diagnose injury, award XP, grant mastery, or unlock content.
- Dance activities require clear-space, surface, preparation, pain-free range, fatigue, consent, and teacher-supervision safeguards. Partnering/lifts, turns, jumps, floorwork, conditioning, and stretching require approved adaptations.
- No enrollment, student progress, evidence, submission, XP ledger, certificate, portfolio, Career Path, active media, or tool record is created or changed.

## Execution order

1. Review and commit the five artifacts.
2. Run `202608140003_dance_full_draft_rollout_preflight.sql` manually.
3. Stop unless every blocker row passes and `BLOCKERS=0`.
4. Retain Singing, Piano, Guitar, Acting, Assignment Swap, and student-state baselines.
5. Run `202608140003_dance_full_draft_rollout.sql` only after separate authorization.
6. Run `202608140003_dance_full_draft_rollout_post_validation.sql`.
7. Compare every preservation hash/count exactly with preflight.
8. Inspect Dance in Curriculum Studio without publishing or activating media/tools.
9. Use rollback only if necessary and only while its dependency and exact-payload guards pass.

## Stop conditions

Stop if the canonical Dance course is missing or ambiguous; existing Dance structure is incompatible; global sort order conflicts; Dance has evidence/student dependencies; Safe Draft Isolation or its trigger is absent; protected baselines differ unexpectedly; Master Module 11 exists; either capstone is missing; grant modules lose their review flags; or any curriculum would become non-draft.

## Rollback boundary

Rollback removes only modules marked as created by rollout `202608140003`, their exact draft children, and batch-created empty Dance levels. It refuses rollback when Dance has enrollment, progress, evidence, submissions, XP, certificates, portfolio, media, course-progress, curriculum revision/change-request, or Assignment Swap dependencies, or when a marked payload no longer matches the approved safe shape. It never deletes the Dance course or touches Singing, Piano, Guitar, Acting, shared learning-engine functions, or student state.
