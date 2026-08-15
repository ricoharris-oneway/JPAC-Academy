# Music Production/Songwriting Full 48-Module Draft Rollout

## Status and authorization

This five-file artifact set prepares the approved Music Production/Songwriting curriculum for manual review and controlled draft-only rollout. Creating or committing these files does not authorize SQL execution, curriculum publication, student access, media activation, tool binding, certificate issuance, or changes to learning-engine behavior.

## Source authority

`docs/MUSIC-PRODUCTION-SONGWRITING-FULL-PROGRAM-SOURCE-MAP.md`, derived from `JPAC ACADEMYMusic Production-Songwriting.pdf`, is the implementation authority. The Program PDF controls module structure, ordering, titles, assignments, assessments, capstones, certificate intent, Aria guidance, and mastery language.

No Tutor-only, tracker-only, Career Path, Audio Engineering, Video Production, Music Business, Artist Development, or MasterGrid module has been added.

## Approved structure

| Level | Program designation | Modules | Global sort order |
|---|---|---:|---:|
| 1 | Beginner / Music Creator | 12 | 1-12 |
| 2 | Intermediate / Song Builder | 12 | 13-24 |
| 3 | Advanced / Producer & Songwriter | 12 | 25-36 |
| 4 | Master / Creative Producer | 12 | 37-48 |
| **Total** |  | **48** | **1-48** |

Each module contains three draft lessons, one optional draft Practice activity, one required draft Core Challenge, and five rubric criteria totaling 100.

### Expected counts

| Record | Expected count |
|---|---:|
| Levels | 4 |
| Modules | 48 |
| Lessons | 144 |
| Optional Practice activities | 48 |
| Required Core Challenges | 48 |
| Rubric criteria | 240 |
| Media rows | 0 |
| Tool bindings | 0 |

## Capstones

- Level 1 Module 12: **Beginner Showcase: My First Original Song**
- Level 2 Module 12 / global Module 24: **Intermediate Showcase: Complete Song Production**
- Level 3 Module 12 / global Module 36: **Advanced Showcase: Artist Production Project**
- Level 4 Module 12 / global Module 48: **Master's Magnum Opus: The JPAC Record**

All capstones remain draft and use the existing JPAC submission and teacher-review workflow. They do not authorize public distribution or portfolio publication.

## Certificate intent

The source identifies these level certificates:

- JPAC Music Creator Certificate
- JPAC Song Builder Certificate
- JPAC Producer & Songwriter Certificate
- JPAC Master Creative Producer Certificate

The rollout records certificate intent in review notes only. It creates no certificate rows and does not invoke or alter certificate logic.

## Cleanup decisions

- Corrupted source glyphs and wrapped headings are normalized without changing academic meaning.
- `Tool Task` and `Tool-Based Task` content becomes an optional Practice activity.
- All `Submit` and external classroom wording becomes JPAC-native submission language.
- The PDF's 100-point model remains assessment scoring and is not converted into XP.
- BandLab, GarageBand, Logic Pro, FL Studio, Ableton, Cakewalk, CapCut, plugins, external DAWs, and third-party accounts are optional examples only.
- External account creation, public uploads, and paid software are not required.
- Every video remains inactive and marked `MEDIA NEEDS REVIEW`.
- No media row is created and no tool or Lab binding is created.
- Copyright, credits, split sheets, publishing, catalogs, collaboration, and portfolios remain review-flagged.
- Collaboration requires approved participants, consent, privacy protections, contribution records, and teacher oversight.
- Aria coaches decisions but does not create submitted work, imitate copyrighted work, assess, approve, award XP, grant mastery, unlock, or publish.

## Review flags

Every rollout module preserves:

- `MEDIA NEEDS REVIEW`
- `NEEDS CATALOG REVIEW`
- `RIGHTS/LEGAL REVIEW`
- `COLLABORATION/CONSENT REVIEW`
- `THIRD-PARTY TOOL REVIEW`
- `COPYRIGHT/OWNERSHIP REVIEW`
- `SCOPE REVIEW`

These are review statuses, not publication approval.

## Canonical XP and assessment model

| Field | Value |
|---|---:|
| `intro_core_xp` | 50 |
| `video_core_xp` | 100 |
| `assignment_core_xp` | 350 |
| `mastery_core_xp` | 125 |
| `core_xp` | 625 |
| `core_unlock_threshold` | 438 |
| Core Challenge `xp_reward` | 350 |
| Passing score | 70 |
| Status | `draft` |

The required Core Challenge rubric uses five categories at 20 points each:

1. Creative Concept & Songwriting
2. Rhythm, Melody, Harmony & Arrangement
3. Production / Sound Selection / DAW Workflow
4. Recording, Mixing & Technical Quality
5. Professional Delivery, Credits & Reflection

## Safety model

The migration is scoped to the canonical `music-production-songwriting` course. It refuses to proceed when the course identity is ambiguous, existing curriculum is incompatible, global module identity or sort order conflicts, student/evidence dependencies exist, Safe Draft Isolation is inactive, or the canonical enrollment trigger is missing.

The rollout:

- creates or reuses only exact-compatible draft levels and modules;
- inserts lessons and activities only when creating a new marked module;
- never publishes, deletes, or overwrites incompatible curriculum;
- never creates media, tool, Lab, Career Path, enrollment, progress, submission, evidence, XP ledger, certificate, or portfolio records;
- never invokes protected academic workflows;
- preserves Singing, Piano, Guitar, Acting, Dance, Video Production, and Audio Engineering curriculum baselines;
- preserves Assignment Swap and global student-state baselines.

## Artifact roles and usage order

1. Commit and review all five artifacts.
2. Run `202608140006_music_production_songwriting_full_draft_rollout_preflight.sql` manually.
3. Stop unless the consolidated preflight returns no blockers and `OVERALL` passes.
4. Run `202608140006_music_production_songwriting_full_draft_rollout.sql` only with separate approval.
5. Run `202608140006_music_production_songwriting_full_draft_rollout_post_validation.sql`.
6. Compare all preservation baselines with the preflight and inspect all four levels in Curriculum Studio.
7. Use `202608140006_music_production_songwriting_full_draft_rollout_rollback.sql` only when separately approved and every rollback guard passes.

## Rollback boundary

Rollback is marker-scoped. It removes only exact batch-created Music Production/Songwriting curriculum and refuses to run if marked payloads changed or any student, evidence, progress, submission, XP, certificate, portfolio, media, tool, course-progress, curriculum-revision, change-request, or Assignment Swap dependency exists.

Rollback does not remove the course shell, exact-compatible pre-existing records, other courses, shared functions, or learning-engine behavior.

## Publication boundary

This rollout is not approved for publication. All levels, modules, lessons, and activities must remain draft. Media and tools remain unresolved and inactive. Teacher, rights/legal, collaboration/consent, ownership, accessibility, and scope review must be completed through a separate approval process before any future publication decision.

## Rubric alignment blocker

The initial post-validation returned `BLOCK` for rubric exactness with `challenges=48`, `criteria=240/240`, and `exact rubrics=0/48`. Structure, capstones, draft safety, media/tool isolation, protected baselines, and student-state checks passed.

Static review found that the migration created the approved five rubric categories at 20 points each with complete bands. The blocker was an order-sensitive validation defect: the checker sorted names but compared them with an incorrectly ordered literal array, placing `Professional Delivery, Credits & Reflection` before `Production / Sound Selection / DAW Workflow`.

The corrective rubric-alignment validation patch uses order-independent category membership, distinctness, exact weight, total-weight, and band-completeness checks. No rubric data update migration is required because the stored rubric contract is already correct. SQL execution of the corrective validation still requires approval after commit.

The first run of that corrective validation confirmed all Music Production/Songwriting rubric, structure, draft/XP, media/tool, and student-state checks. Its remaining blocker was an unrelated protected-course expectation: Piano was compared with 48 modules even though the previously approved Save as Draft test module makes the verified Piano baseline 49. The validation expectation now reflects that approved baseline; no Music Production/Songwriting or Piano data correction is required.

## Rollout completion

The Music Production/Songwriting rollout SQL passed. Initial post-validation passed structure, capstones, draft safety, media/tool isolation, student-state preservation, and protected baselines. Its rubric exactness blocker was caused by validation ordering, not bad stored rubric data.

The corrected order-independent rubric alignment validation passed after the protected Piano module-count expectation was updated from 48 to the verified 49, reflecting the previously approved Piano Save as Draft test module. Final corrected validation confirmed:

- Core Challenges: `48/48`
- Rubric criteria: `240/240`
- Exact rubrics: `48/48`
- Protected course counts: preserved
- Student state: preserved
- Media and tools: inactive
- Draft and XP contract: canonical
- Overall: `PASS`

Visual Curriculum Studio review also passed. The course appears as **Music Production / Songwriting** with 48 total modules:

- Beginner: 12 modules
- Intermediate: 12 modules
- Advanced: 12 modules
- Master: 12 modules

Beginner readiness displays:

- Structure: `COMPLETE 12/12`
- XP: `COMPLETE 12/12`
- Draft safety: `DRAFT SAFE`
- Media: `NEEDS REVIEW 0/12`
- Tools: `CONFIGURED — INACTIVE 0/12`
- Publication: `NOT READY`
- Student enrollment/access: `NOT CHECKED`

Visible Beginner draft modules include:

- Welcome to Music Production
- Rhythm, Tempo & BPM
- Build Your First Drum Beat
- Recording Your Voice
- Arranging Your First Song
- Beginner Showcase: My First Original Song

The four capstones were verified:

- Level 1 Module 12: **Beginner Showcase: My First Original Song**
- Level 2 Module 12: **Intermediate Showcase: Complete Song Production**
- Level 3 Module 12: **Advanced Showcase: Artist Production Project**
- Level 4 Module 12: **Master's Magnum Opus: The JPAC Record**

Music Production/Songwriting remains draft-only. No media rows were activated, no tools were bound, and no certificate rows were created. The approved certificate names remain inactive level review intent only.

The following review flags remain preserved:

- `MEDIA NEEDS REVIEW`
- `NEEDS CATALOG REVIEW`
- `RIGHTS/LEGAL REVIEW`
- `COLLABORATION/CONSENT REVIEW`
- `THIRD-PARTY TOOL REVIEW`
- `COPYRIGHT/OWNERSHIP REVIEW`
- `SCOPE REVIEW`

Publication remains `NOT READY`.
