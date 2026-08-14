# JPAC Academy Guitar Full 50-Module Draft Rollout

Status: REVIEW-READY ARTIFACTS — DATABASE EXECUTION NOT AUTHORIZED
Batch: `202608140001`
Canonical course: `guitar`

## Authority and structure

`JPAC_Academy_Guitar_.pdf` is the source of truth for level structure, module sequence, topics, assignments, and capstone intent. `JPAC Guitar Tutor.pdf` supplies advisory ARIA coaching, terminology, feedback, practice, and possible tool guidance only.

| Level | Name | Modules | Global sort |
|---:|---|---:|---:|
| 1 | Beginner | 12 | 1–12 |
| 2 | Intermediate | 14 | 13–26 |
| 3 | Advanced | 12 | 27–38 |
| 4 | Master | 12 | 39–50 |

Each module has three draft lessons, one optional draft Practice, one required draft Core Challenge, and five rubric criteria totaling 100. See [GUITAR-50-MODULE-SOURCE-MAP.md](./GUITAR-50-MODULE-SOURCE-MAP.md).

## Governance warnings

- Level 2 Module 12 is a major performance checkpoint.
- Level 2 Module 14 is the temporary end-level mastery point pending teacher review.
- The Tutor PDF's incompatible Master topics 13–15 are excluded.
- Google Classroom language becomes the existing JPAC submission and teacher-review workflow.
- Missing completion criteria are `AI-PROPOSED` and require Guitar teacher and leadership review.
- Media remains `NEEDS REVIEW`; no URL or media row is activated.
- Tools remain `NEEDS CATALOG REVIEW`; no Lab/tool binding is created.
- Career Path status remains `NOT CONFIGURED`.

## Locked contract and safety

All levels, modules, lessons, and activities remain `draft`. Module XP is 50 intro, 100 instructional media, 350 Core Challenge, 125 mastery, 625 total, and 438 unlock threshold. Core Challenges pass at 70. Practice is optional, bonus, and zero XP. ARIA is advisory only.

The migration inserts or exactly reuses only Guitar `course_levels`, `course_modules`, `lessons`, and `activities`. It stops on incompatible identity, payload, sort order, or evidence. It never deletes, publishes, activates media/tools, changes shared functions, or writes student/progress/evidence/submission/XP/certificate/portfolio/Career Path records.

Preflight and post-validation emit consolidated PASS/BLOCK findings plus Singing, Piano, student-state, and Assignment Swap baselines for exact manual comparison. Rollback considers only exact `Guitar full draft rollout 202608140001` batch-marked records, validates their safe payload, and refuses any evidence, progress, media, revision, certificate, portfolio, or Assignment Swap dependency.

## Execution order

1. Commit and review all five artifacts.
2. Run the read-only preflight.
3. Run the migration only if every blocker check passes and execution is approved.
4. Run the read-only post-validation and compare preservation baselines.
5. Inspect all four Guitar levels and all 50 draft modules in Curriculum Studio.

Stop on any `BLOCK`, unexplained baseline difference, duplicate/missing canonical Guitar course, incompatible existing Guitar row, evidence dependency, or inactive Safe Draft Isolation. Publication, enrollment, reconciliation, media/tool activation, and Career Path activation remain excluded.
