# Video Production Full 49-Module Draft Rollout

Status: **REVIEW ARTIFACTS ONLY — SQL EXECUTION NOT AUTHORIZED**

## Authority and scope

`docs/VIDEO-PRODUCTION-FULL-PROGRAM-SOURCE-MAP.md` is the approved manifest authority. The Video Production Program PDF controls structure. The Video Editing Tutor PDF supplies Aria guidance only and cannot add, remove, reorder, or rename modules.

The proposed rollout creates or exactly reuses draft curriculum under the single canonical `video-production` course. It does not update the course shell, publish curriculum, activate media or tools, enroll students, reconcile progress, or invoke learning-engine workflows.

## Canonical manifest

| Level | Title | Modules | Global `sort_order` | Source module numbers |
|---:|---|---:|---|---|
| 1 | Beginner | 10 | 1–10 | 1–10 |
| 2 | Intermediate | 12 | 11–22 | 1–12 |
| 3 | Advanced | 15 | 23–37 | 1–15 |
| 4 | Master | 12 | 38–49 | 1–10, 20, 24 |
| **Total** |  | **49** | **1–49** | **Preserved exactly** |

No Master Modules 11–19 or 21–23 are created. Master Module 10 remains `Capstone: Short Film Production`; Master Module 20 remains `Visual Effects (VFX) Basics`; Master Module 24 remains `Festival Submission & Digital Distribution` and is the final distribution/launch module.

## Expected records

- 4 draft levels
- 49 draft modules
- 147 draft lessons
- 49 optional draft Practice activities
- 49 required draft Core Challenges
- 245 rubric criteria
- 0 media rows
- 0 Lab/tool bindings
- 0 student/evidence dependencies

Each module receives three lessons, one optional Practice, and one required performance Core Challenge. The Core Challenge rubric contains five 20-point categories:

1. Story & Concept Development
2. Camera / Visual Technique
3. Editing & Pacing
4. Sound / Audio-Visual Integration
5. Production Readiness & Professional Presentation

## Canonical XP and status

| Field | Value |
|---|---:|
| `intro_core_xp` | 50 |
| `video_core_xp` | 100 |
| `assignment_core_xp` | 350 |
| `mastery_core_xp` | 125 |
| `core_xp` / module total | 625 |
| `core_unlock_threshold` | 438 |
| Core Challenge XP | 350 core |
| Passing score | 70 |
| Status | `draft` |

Practice activities are optional, non-assessed, draft, and award 0 bonus XP. Core Challenges are required draft performance activities with resubmission allowed. Aria is advisory only and cannot assess, approve, award XP, grant mastery, unlock, or publish.

## Review flags preserved

- Repeated color-grading, VFX, lighting, and festival/distribution topics remain separate and are marked **NEEDS REVIEW — POSSIBLE FUTURE CONSOLIDATION**.
- Advanced Module 7, `Drone Cinematography`, is marked **SAFETY/LEGAL REVIEW** and requires simulator, supplied-footage, or storyboard alternatives.
- Master Module 4, `Director Study: Spike Jonze`, is marked **RIGHTS/CULTURAL REVIEW**.
- Master Modules 5, 8, and 24 are marked **RIGHTS/DISTRIBUTION REVIEW**.
- Advanced Module 6 and Master Modules 6 and 10 retain **MEDIA NEEDS REVIEW** notes for contradictory `Overview Video: None` source entries.
- Missing completion criteria remain AI-proposed and require Video Production teacher review.

## Cleanup and accessibility rules

- Google Classroom language is replaced by the existing JPAC submission and teacher-review workflow.
- CapCut, Cakewalk, After Effects, Trello, Asana, Gantt tools, cameras, gimbals, drones, and other named products are optional examples only.
- Accessible alternatives include supplied footage, storyboards, shot plans, simulations, analysis, audio descriptions, and teacher-approved equivalent evidence.
- No raw video URL is activated.
- Media review status exists in notes only; no media record is created.
- Tool catalog status exists in notes only; no tool or Lab binding is created.
- Students are not directed to publish or distribute work externally.

## Preflight behavior

The preflight is read-only and emits one consolidated PASS/BLOCK report. It checks:

- exactly one canonical `video-production` course;
- published-only Safe Draft Isolation and its enrollment trigger;
- exact compatibility of existing levels, modules, and populated children;
- availability or exact compatibility of global sort orders 1–49;
- absence of fabricated Master gap modules;
- zero Video Production enrollments, progress, submissions, XP, certificates, portfolio records, media, and tool bindings;
- exact 49-module manifest counts;
- preservation baselines for Singing, Piano, Guitar, Acting, Dance, Assignment Swap, and student-state tables.

Any BLOCK result means the migration must not run.

## Migration behavior

The migration:

- locks and reuses the canonical course shell without updating it;
- creates missing draft levels and exact draft curriculum children;
- reuses existing records only when their approved payload is exact-compatible;
- stops on incompatible identity, sort order, status, XP, media/tool, approval, or child payloads;
- marker-scopes every newly inserted level and module;
- inserts only into `course_levels`, `course_modules`, `lessons`, and `activities`;
- never deletes records and never writes student, evidence, progress, XP, certificate, portfolio, media, Lab/tool, Career Path, or Assignment Swap data.

No stored-progress reconciliation is included.

## Post-validation behavior

Post-validation is read-only and checks exact structure, XP, rubric, draft-only, media/tool, dependency, Master-numbering, review-flag, Safe Draft Isolation, and preservation results. Its expected counts are 4 levels, 49 modules, 147 lessons, 49 Practices, 49 Core Challenges, and 245 rubric criteria.

Preflight baseline values must be manually compared with the corresponding post-validation preservation values. INFO rows alone do not prove preservation.

## Rollback behavior

Rollback removes only modules marked as created by batch `Video Production full draft rollout 202608140004`, their exact children, and empty levels explicitly marked as batch-created. Compatible pre-existing levels and modules are preserved.

Rollback refuses deletion if:

- any Video Production student, evidence, progress, submission, XP, certificate, portfolio, media, tool, course-progress, curriculum-revision, change-request, or Assignment Swap dependency exists; or
- any batch-marked module no longer matches the approved draft identity, XP, inactive asset state, three-lesson structure, two-activity structure, or 100-point rubric.

The rollback does not touch the course shell, other courses, shared functions, or learning-engine behavior.

## Execution order

1. Commit and review all five artifacts.
2. Run `202608140004_video_production_full_draft_rollout_preflight.sql` manually.
3. Stop unless every required readiness row passes and preservation baselines are captured.
4. Run `202608140004_video_production_full_draft_rollout.sql` only with explicit approval.
5. Run `202608140004_video_production_full_draft_rollout_post_validation.sql`.
6. Compare preflight and post-validation baselines exactly.
7. Inspect all four levels and representative modules in Curriculum Studio.
8. Run rollback only if required, separately approved, and all rollback guards pass.

## Stop conditions

Stop immediately for duplicate course identity, incompatible curriculum, occupied global sort order, any Video Production student/evidence dependency, inactive Safe Draft Isolation, unexpected Master numbering, non-draft output, activated media/tool state, changed protected baselines, incorrect counts, rubric errors, or any SQL error.

This artifact set does not authorize SQL execution, publication, student access, media/tool activation, or changes to protected courses and learning-engine logic.

## Rollout completion

### Execution and validation

- The Video Production rollout SQL passed.
- Post-validation passed.
- The visual Curriculum Studio check passed.
- No rollback was run.

### Curriculum Studio verification

- The **Video Production** course appears in Curriculum Studio.
- The course shows **49 modules** in total.
- Beginner contains **10 modules**.
- Beginner Module 1, **CapCut Basics & Your First Edit**, appears with `draft` status.
- Intermediate contains **12 modules**.
- Advanced contains **15 modules**.
- Master contains **12 actual module records**.

Beginner readiness displays:

| Readiness category | Verified result |
|---|---|
| Structure | **COMPLETE — 10/10** |
| XP | **COMPLETE — 10/10** |
| Draft safety | **DRAFT SAFE** |
| Media | **NEEDS REVIEW — 0/10** |
| Tools | **CONFIGURED — INACTIVE — 0/10** |
| Publication | **NOT READY** |

### Master numbering verification

The Master level preserves the Program source numbering exactly as Modules **1–10, 20, and 24**:

- Master Module 10, **Capstone: Short Film Production**, exists.
- Master Module 20, **Visual Effects (VFX) Basics**, exists.
- Master Module 24, **Festival Submission & Digital Distribution**, exists as the final distribution/launch module.
- Missing Master numbers 11–19 and 21–23 remain intentionally absent.
- No fabricated Master modules should be created.

### Final safety and review status

- All Video Production curriculum remains draft-only and not student-published.
- No media rows were activated.
- No tools or Lab bindings were created.
- Repeated color-grading, VFX, lighting, and festival/distribution topics retain their possible-consolidation review flags.
- Drone Cinematography retains **SAFETY/LEGAL REVIEW**.
- Director Study: Spike Jonze retains **RIGHTS/CULTURAL REVIEW**.
- Festival, financing, submission, and distribution modules retain **RIGHTS/DISTRIBUTION REVIEW**.

The rollout is structurally complete and safely isolated as draft curriculum. Media, tool, teacher, safety, rights, cultural, and distribution reviews remain unresolved publication requirements; therefore, publication readiness correctly remains **NOT READY**.
