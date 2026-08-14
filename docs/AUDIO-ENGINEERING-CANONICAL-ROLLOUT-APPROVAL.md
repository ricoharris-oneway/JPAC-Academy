# Audio Engineering Canonical Rollout Approval

Status: **APPROVED FOR DRAFT-ONLY ROLLOUT ARTIFACT CREATION**

SQL status: **NOT AUTHORIZED**
Publication status: **NOT AUTHORIZED**

## 1. Source authority

The `JPAC_Academy_Audio_Engineering_Program.pdf` controls the evidenced Audio Engineering course structure, academic topics, assignments, assessments, and capstone intent. The `JPAC Audio Engineering Tutor.pdf` is guidance-only for Aria coaching style, terminology, feedback, technical support, workflow guidance, and safety reminders. Tutor-only modules and numbering are not structural authority.

The approved implementation basis is:

- `docs/AUDIO-ENGINEERING-FULL-PROGRAM-SOURCE-MAP.md`
- `docs/AUDIO-ENGINEERING-CANONICAL-CLASSIFICATION.md`

The source map preserves all 83 raw evidenced headings and source conflicts. The classification document resolves those headings into KEEP, MERGE, HOLD, and OUT OF SCOPE decisions. Rollout artifacts must implement the approved 48 KEEP modules and the approved MERGE treatment exactly.

## 2. Approved canonical distribution

| Level | Approved modules |
|---|---:|
| Beginner | 12 |
| Intermediate | 12 |
| Advanced | 12 |
| Master | 12 |
| **Total** | **48** |

Expected future draft-rollout records:

| Record type | Expected count/status |
|---|---:|
| Levels | 4 |
| Modules | 48 |
| Lessons | 144 |
| Optional Practice activities | 48 |
| Required Core Challenges | 48 |
| Rubric criteria | 240 |
| Media rows | 0 |
| Tool/Lab bindings | 0 |
| Curriculum status | All draft |

Canonical `level_module_number` values will be 1-12 within each level. Global `sort_order` will be 1-48 in canonical level and module order. These values implement the approved classification; they do not pretend the raw Program numbering was internally consistent.

## 3. Approved capstones and showcases

- **Advanced capstone/showcase:** `Full Band Recording Showcase`, canonical Advanced Module 12.
- **Master final capstone:** `Complete Album Production`, canonical Master Module 12.
- Raw Master `Capstone: Mix and Master an Album` is not a separate rollout module. Its approved assessment content merges into the Master final capstone as staged mix-and-master evidence.

The Advanced showcase must permit supplied multitracks or stems as an accessible alternative to recording a live band. The Master capstone must assess engineering workflow and delivery rather than require public distribution, expensive equipment, a specific DAW, or unauthorized media.

## 4. Approved exclusions

Rollout artifacts must not:

- roll out all 83 raw headings as modules;
- create MERGE items as standalone modules;
- include any HOLD item in the initial rollout;
- include any OUT OF SCOPE item in the initial rollout;
- fabricate modules to fill raw numbering gaps;
- add Tutor PDF-only modules or Tutor numbering;
- activate media rows or media versions;
- bind tools, Lab resources, plugins, DAWs, Atmos systems, or external services;
- preserve Google Classroom submission language instead of JPAC-native submission and teacher review;
- require Cakewalk, CapCut, third-party plugins, external DAWs, external accounts, studio ownership, immersive hardware, or paid software unless separately approved later;
- activate placeholder, fake, contradictory, repeated-generic, or unreviewed video URLs, including `abc123xyz` and `REAL_VIDEO_ID`;
- publish curriculum or make it student-active.

MERGE content may appear only as lesson objectives, practice guidance, examples, assessment evidence, or rubric context inside its approved canonical target. HOLD and OUT OF SCOPE content remains documented but absent from the initial rollout manifest.

## 5. Approved review flags

The following review flags must remain visible in module notes, lesson/resource briefs, activity guidance, documentation, or validation expectations as applicable:

- **MEDIA NEEDS REVIEW**
- **NEEDS CATALOG REVIEW**
- **TOOL/ACCESSIBILITY REVIEW**
- **AI/ETHICS REVIEW**
- **BUSINESS/LEGAL REVIEW**
- **RIGHTS/DISTRIBUTION REVIEW**
- **SCOPE REVIEW**

These flags are unresolved review requirements, not reasons to activate tools or media. Aria remains advisory only and cannot assess, approve, diagnose hearing conditions, award XP, grant mastery, unlock modules, publish, or replace teacher review.

Every module must also include safe-listening guidance, reasonable monitoring-level expectations, breaks, hearing-protection reminders where appropriate, safe studio/cable practices, and accessible no-hardware or supplied-material alternatives.

## 6. Approved draft-only XP model

| Field | Approved value |
|---|---:|
| `intro_core_xp` | 50 |
| `video_core_xp` | 100 |
| `assignment_core_xp` | 350 |
| `mastery_core_xp` | 125 |
| `core_xp` / module total | 625 |
| `core_unlock_threshold` | 438 |
| Core Challenge passing score | 70 |
| Status | `draft` |

Each module will contain one optional draft Practice activity with 0 bonus XP and one required draft Core Challenge with 350 core XP, `activity_type = performance`, passing score 70, and resubmission allowed.

Draft Audio Engineering curriculum must remain excluded from student progress denominators by published-only Safe Draft Isolation. The rollout must not reconcile stored progress or write enrollment, progress, evidence, submission, XP ledger, mastery, review, certificate, or portfolio state.

## 7. Approved assessment framework

Each Core Challenge will use exactly five criteria totaling 100 points:

1. **Technical Setup & Signal Flow** - 20
2. **Recording / Sound Capture Quality** - 20
3. **Mixing, Balance & Processing** - 20
4. **Creative Sound Design / Production Choices** - 20
5. **Professional Delivery & Reflection** - 20

Each criterion must include the approved four non-empty performance bands. Assessment must accept teacher-approved accessible evidence and cannot require public distribution, copyrighted samples, client disclosure, unsafe monitoring, paid software, or specialized hardware.

## 8. Approved rollout safety requirements

The future rollout artifact set must include a preflight, migration, post-validation, marker-scoped rollback, and rollout documentation.

### Preflight requirements

- Confirm exactly one canonical Audio Engineering course.
- Confirm compatibility of any existing Audio Engineering shell, levels, modules, lessons, activities, and rubrics.
- Confirm global `sort_order` 1-48 is available or exact-compatible.
- Confirm no Audio Engineering student, evidence, progress, submission, XP, certificate, portfolio, media, tool, or workflow dependencies block rollout.
- Confirm published-only Safe Draft Isolation functions and canonical enrollment trigger.
- Capture Singing, Piano, Guitar, Acting, Dance, and Video Production curriculum baselines.
- Capture Assignment Swap function/security/audit baseline.
- Capture student-state counts and protected learning-engine function baselines.
- Return a consolidated PASS/BLOCK result and block migration on any unexplained conflict.

### Migration requirements

- Preserve the canonical course shell.
- Insert or exact-reuse only the 4 approved levels and 48 approved draft modules with their approved children.
- Marker-scope every inserted rollout record.
- Stop on incompatible existing content.
- Never publish, activate media, bind tools, or invoke student/learning workflows.
- Never write outside approved curriculum tables.

### Post-validation requirements

- Verify exactly 4 levels, 48 modules, 144 lessons, 48 Practices, 48 Core Challenges, and 240 rubric criteria.
- Verify exact XP, rubric, activity-role, status, and accessibility/safety payloads.
- Verify all curriculum remains draft.
- Verify media rows remain 0 and tool/Lab bindings remain 0.
- Verify Safe Draft Isolation and protected trigger/function state.
- Verify Singing, Piano, Guitar, Acting, Dance, Video Production, Assignment Swap, and student-state baselines are preserved.

### Rollback requirements

- Delete only exact marker-scoped records created by this rollout.
- Preserve exact-compatible reused levels and modules.
- Refuse deletion if payloads changed or any student, evidence, progress, submission, XP, certificate, portfolio, media, tool, curriculum-revision, change-request, course-progress, or Assignment Swap dependency exists.
- Never touch other courses or shared learning-engine functions.

## 9. Decision

The **48-module Audio Engineering canonical structure is approved for creation of draft-only rollout artifacts after this approval document is committed**.

This approval does not authorize SQL execution. The future migration may be run only after its preflight passes, preservation baselines are manually reviewed, and separate execution approval is given.

This approval does not authorize publication, student access, media activation, tool binding, Career Path activation, or changes to XP, mastery, progress, unlock, submission, teacher-review, or certificate logic.
