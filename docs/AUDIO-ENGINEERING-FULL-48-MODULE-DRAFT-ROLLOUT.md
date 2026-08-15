# Audio Engineering Full 48-Module Draft Rollout

Status: **REVIEW ARTIFACTS ONLY - SQL EXECUTION AND PUBLICATION NOT AUTHORIZED**

## Authority

The rollout implements the approved decisions in:

- `docs/AUDIO-ENGINEERING-FULL-PROGRAM-SOURCE-MAP.md`
- `docs/AUDIO-ENGINEERING-CANONICAL-CLASSIFICATION.md`
- `docs/AUDIO-ENGINEERING-CANONICAL-ROLLOUT-APPROVAL.md`

The Program PDF controls source evidence. The Tutor PDF is Aria guidance only. The rollout uses only the 48 approved KEEP modules, incorporates MERGE material inside approved targets, and excludes all HOLD, OUT OF SCOPE, Tutor-only, and fabricated modules.

## Canonical structure

| Level | Modules | Global `sort_order` |
|---|---:|---|
| Beginner | 12 | 1-12 |
| Intermediate | 12 | 13-24 |
| Advanced | 12 | 25-36 |
| Master | 12 | 37-48 |
| **Total** | **48** | **1-48** |

Expected records:

- 4 draft levels
- 48 draft modules
- 144 draft lessons
- 48 optional draft Practice activities
- 48 required draft Core Challenges
- 240 rubric criteria
- 0 media rows
- 0 tool or Lab bindings
- 0 Audio Engineering student/evidence dependencies

## Capstone decision

- Advanced Module 12 is `Full Band Recording Showcase`.
- Master Module 12 is `Master Capstone: Complete Album Production` and is the final evaluation.
- Raw `Capstone: Mix and Master an Album` is not created as a standalone module. Its mix/master milestones are staged evidence within the Master final capstone.
- The Advanced showcase allows supplied stems or multitracks instead of requiring access to a live band.

## Module and assessment model

Each module contains:

- three draft lessons: technical foundations/safety, guided application, and professional delivery/reflection;
- one optional draft Practice activity with 0 bonus XP;
- one required draft performance Core Challenge with 350 core XP, passing score 70, and resubmission allowed;
- one five-category rubric totaling 100.

Rubric categories are 20 points each:

1. Technical Setup & Signal Flow
2. Recording / Sound Capture Quality
3. Mixing, Balance & Processing
4. Creative Sound Design / Production Choices
5. Professional Delivery & Reflection

The assessment accepts teacher-approved DAW-neutral, equipment-neutral, simulated, written, analysis, or supplied-audio alternatives.

## XP and draft safety

| Field | Value |
|---|---:|
| `intro_core_xp` | 50 |
| `video_core_xp` | 100 |
| `assignment_core_xp` | 350 |
| `mastery_core_xp` | 125 |
| `core_xp` / module total | 625 |
| `core_unlock_threshold` | 438 |
| Passing score | 70 |
| Status | `draft` |

Published-only Safe Draft Isolation must exclude all Audio Engineering draft modules from student progress denominators. The migration does not reconcile stored progress or write student state.

## Review flags and cleanup

Every module preserves **MEDIA NEEDS REVIEW**, **NEEDS CATALOG REVIEW**, and **TOOL/ACCESSIBILITY REVIEW**. Relevant modules additionally preserve **SCOPE REVIEW**, **AI/ETHICS REVIEW**, **BUSINESS/LEGAL REVIEW**, or **RIGHTS/DISTRIBUTION REVIEW**.

- No media or media-version row is created.
- No tool, Lab, plugin, DAW, Atmos, AI service, or external platform is bound.
- Cakewalk, CapCut, DAWs, plugins, and third-party services remain optional examples.
- Google Classroom language is replaced by JPAC-native submission and teacher review.
- Fake, placeholder, contradictory, repeated, and unreviewed video links remain inactive.
- Safe listening, hearing protection, breaks, authorized source use, consent, and safe studio practice are required.
- Aria is advisory only and cannot assess, approve, diagnose, award XP, grant mastery, unlock, or publish.

## Preflight

The read-only preflight returns one consolidated PASS/BLOCK report and checks:

- exactly one canonical `audio-engineering` course;
- exact 48-module, 12-per-level manifest and global sort range 1-48;
- compatible existing levels, modules, children, status, XP, approvals, media, and tools;
- no unexpected, HOLD, OUT OF SCOPE, Tutor-only, or fabricated module;
- no Audio Engineering student/evidence dependencies;
- zero media rows and tool bindings;
- published-only Safe Draft Isolation and canonical enrollment trigger;
- Singing, Piano, Guitar, Acting, Dance, Video Production, Assignment Swap, and student-state baselines.

Any BLOCK result means the migration must not run. Baseline INFO rows must be retained for manual comparison after migration.

## Migration

The migration preserves the canonical course shell, creates missing draft levels and canonical curriculum, and exact-reuses compatible existing records. It stops on incompatible content or dependencies.

Writes are restricted to `course_levels`, `course_modules`, `lessons`, and `activities`. Inserted levels and modules carry marker `Audio Engineering full draft rollout 202608140005`. The migration performs no course update, publication, media/tool activation, workflow call, student-state write, or deletion.

## Post-validation

The read-only post-validation verifies:

- levels 4/4;
- modules 48/48 and distribution 12/12/12/12;
- lessons 144/144;
- Practices 48/48;
- Core Challenges 48/48;
- rubric criteria 240/240 and exact rubrics 48/48;
- all records draft and non-draft records 0;
- media rows 0 and tool bindings 0;
- exact canonical manifest;
- approved Advanced and Master capstones;
- no standalone old Master capstone;
- no HOLD or OUT OF SCOPE titles;
- no Audio Engineering student/evidence dependencies;
- Safe Draft Isolation and protected preservation baselines.

Preflight and post-validation baseline values must be compared manually. INFO rows alone are not proof of preservation.

## Rollback

Rollback deletes only exact batch-marked curriculum created by this rollout. It preserves the course shell and exact-compatible reused records.

Rollback refuses deletion if any marked payload has changed or any Audio Engineering enrollment, progress, evidence, submission, XP, certificate, portfolio, media, tool, course-progress, curriculum-revision, change-request, or Assignment Swap dependency exists. It never touches Singing, Piano, Guitar, Acting, Dance, Video Production, shared functions, or learning-engine behavior.

## Usage order

1. Commit and review all five artifacts.
2. Run `202608140005_audio_engineering_full_draft_rollout_preflight.sql` manually.
3. Stop unless every required readiness row passes and baselines are reviewed.
4. Run `202608140005_audio_engineering_full_draft_rollout.sql` only after separate execution approval.
5. Run `202608140005_audio_engineering_full_draft_rollout_post_validation.sql`.
6. Compare preservation baselines and inspect all levels in Curriculum Studio.
7. Use rollback only if necessary, separately approved, and all rollback guards pass.

## Authorization boundary

These artifacts are approved for static review only. They do not authorize SQL execution, publication, student access, media activation, tool binding, Career Path activation, or changes to XP, mastery, progress, unlock, submission, teacher-review, or certificate logic.

## Rollout completion

The Audio Engineering rollout SQL passed, post-validation passed, and the visual Curriculum Studio check passed. Audio Engineering appears in Curriculum Studio with 48 total modules, distributed evenly across four levels:

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

- Sound Waves, Frequency & Critical Listening
- DAW Fundamentals & First Session
- Drum Programming & Timing Foundations
- Microphone Types & Safe Setup
- Recording Your First Audio
- Intro to EQ

Advanced Module 12, **Full Band Recording Showcase**, exists as the Advanced capstone/showcase. Master Module 12, **Master Capstone: Complete Album Production**, exists as the final Master capstone. **Mix and Master an Album** is merged into the Master capstone as staged evidence and was not created as a standalone module.

No `HOLD`, `OUT OF SCOPE`, or Tutor-only modules were rolled out. Audio Engineering remains draft-only. No media rows were activated, and no tools were bound. Publication remains `NOT READY`.

The following review flags remain preserved:

- `MEDIA NEEDS REVIEW`
- `NEEDS CATALOG REVIEW`
- `TOOL/ACCESSIBILITY REVIEW`
- `AI/ETHICS REVIEW`
- `BUSINESS/LEGAL REVIEW`
- `RIGHTS/DISTRIBUTION REVIEW`
- `SCOPE REVIEW`
