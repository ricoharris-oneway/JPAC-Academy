# Acting Full 46-Module Draft Rollout

## Status

Review-only artifact set. No SQL is authorized by this document. The rollout must remain draft-only and must not affect students, evidence, progress, XP, certificates, media, tools, Career Paths, or other courses.

## Source decision

- `JPAC_Academy_Acting_Program.pdf` is structural authority.
- `JPAC Acting Tutor.pdf` supplies guidance-only Aria terminology, coaching tone, practice prompts, and emotional-safety reminders.
- The canonical source contains 47 evidenced slots, but the first SQL-eligible rollout contains 46 modules.
- Advanced Module 7, **ACT English COMPLETE Walkthrough**, is held as `NEEDS REVIEW` and is not created.
- Master remains an 11-module level using evidenced Modules 1-10 and 12. No fake Module 11 is created.
- The raw 85 interleaved headings and Tutor-only topics are not modules. Compatible material may inform lesson drafting only.

## Expected payload

| Record | Expected count |
|---|---:|
| Levels | 4 |
| Modules | 46 |
| Beginner modules | 12 |
| Intermediate modules | 12 |
| Advanced modules | 11 |
| Master modules | 11 |
| Lessons | 138 |
| Optional Practice activities | 46 |
| Required Core Challenges | 46 |
| Rubric criteria | 230 |
| Active media rows | 0 |
| Tool bindings | 0 |

Global `sort_order` is dense from 1 through 46. Source-facing `level_module_number` preserves the gaps: Advanced has no Module 7, and Master has no Module 11.

## Visual Review Clarification

Visual review confirms that the 46-module rollout already preserves both intended culminating modules:

- Advanced Module 12 exists as **Advanced Capstone: Master Performance**.
- Master Module 12 exists as **Mastering the Art of Acting: Legacy, Leadership, and Inspiration**.
- No 48-module correction or capstone correction migration is needed at this time.

The verified level counts remain:

- Beginner: 12 draft modules.
- Intermediate: 12 draft modules.
- Advanced: 11 draft modules because Module 7, **ACT English COMPLETE Walkthrough**, remains held for teacher review; the Module 12 capstone is present.
- Master: 11 draft modules because the source contains no Module 11; the Module 12 capstone/legacy module is present.

The remaining source-review items are limited to the unresolved Advanced Module 7 topic and the absent Master Module 11 source gap. Do not create a fake Master Module 11, and do not restore or replace Advanced Module 7 until teacher review resolves its source issue. Acting must remain draft-only.

## Curriculum contract

Each module contains three draft lessons, one optional draft Practice, and one required draft performance Core Challenge. Every Core Challenge has a five-category rubric totaling 100 and requires teacher review.

Canonical XP remains locked:

- `intro_core_xp`: 50
- `video_core_xp`: 100
- `assignment_core_xp`: 350
- `mastery_core_xp`: 125
- `core_xp`: 625
- `core_unlock_threshold`: 438
- Core Challenge `xp_reward`: 350
- passing score: 70

Source point totals are assessment scores, not XP.

## Cleanup and review rules

- All records are `draft`.
- Media is `NEEDS REVIEW`; no instructional-media row or active URL is created.
- Tools are `NEEDS CATALOG REVIEW`; no Lab/tool binding is created.
- Google Classroom language is replaced by the existing JPAC submission and teacher-review workflow.
- CapCut and Cakewalk are optional examples only and cannot be required for completion or mastery.
- Aria is advisory only and cannot assess, approve, award XP, grant mastery, or unlock curriculum.
- AI-proposed lesson language, completion criteria, accessibility alternatives, and rubrics require Acting teacher/leadership review.
- Emotionally intense, intimacy, combat, cross-cultural, dialect, and drama-therapy work requires teacher supervision, consent-aware alternatives, and no forced personal disclosure.

## Artifact execution order

1. Review and commit the five artifacts.
2. Run `202608140002_acting_full_draft_rollout_preflight.sql` manually.
3. Stop unless every blocker row passes and `BLOCKERS=0`.
4. Compare and retain Singing, Piano, Guitar, Assignment Swap, and student-state baselines.
5. Run `202608140002_acting_full_draft_rollout.sql` only after separate authorization.
6. Run `202608140002_acting_full_draft_rollout_post_validation.sql`.
7. Compare preservation hashes/counts exactly with preflight.
8. Inspect Acting in Curriculum Studio without publishing or activating media/tools.
9. Use rollback only if needed and only while its dependency and payload guards pass.

## Stop conditions

Stop if the canonical Acting course is missing or ambiguous; any existing Acting level/module/child payload is incompatible; global sort order conflicts; Acting has student/evidence dependencies; Safe Draft Isolation is not active; the canonical enrollment trigger is missing; protected baselines differ unexpectedly; Advanced Module 7 or Master Module 11 already exists; or any record would become non-draft.

## Rollback boundary

Rollback deletes only modules marked as created by rollout `202608140002`, their exact draft children, and batch-created empty Acting levels. It refuses to proceed if Acting has enrollment, progress, evidence, submissions, XP, certificates, portfolio, media, curriculum revision/change-request, course-progress, or Assignment Swap dependencies, or if a marked payload no longer matches the approved safe shape. It never deletes the Acting course or touches Singing, Piano, Guitar, shared functions, or student state.
