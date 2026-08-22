# Digital AI Creator Full 48-Module Draft Rollout

## Authority and scope

This five-file artifact set prepares a controlled, draft-only rollout for the existing **Digital AI Creator** course shell (`digital-ai-creator`). It does not create a course row. The curriculum authority is `docs/DIGITAL-AI-CREATOR-FULL-PROGRAM-SOURCE-MAP.md`, committed as `eea82bba3ecf22f6ef5fc6e590acc2abb1f3d328`.

Artifact creation does not authorize SQL execution, database changes, publication, student access, media activation, tool binding, or certificate issuance.

### Course-shell prerequisite

The rollout preflight found no existing course with slug `digital-ai-creator` and no likely duplicate candidate. Before the 48-module rollout can proceed, the separately controlled `202608140009a_digital_ai_creator_course_shell_seed.sql` artifact must create the missing launch-convention shell. That seed is limited to one published `public.courses` row with `module_count=10`; it creates no curriculum, media, tools, certificates, enrollment, progress, or XP records. The shell seed requires its own read-only preflight, explicit execution approval, and zero-blocker post-validation.

## Expected structure

| Level | Title | Modules | Inactive certificate intent |
| --- | --- | ---: | --- |
| 1 | AI Explorer | 12 | JPAC AI Explorer Certificate |
| 2 | AI Creator | 12 | JPAC AI Creator Certificate |
| 3 | AI Creative Director | 12 | JPAC AI Creative Director Certificate |
| 4 | AI Production Master | 12 | JPAC Master Digital AI Creator Certificate |

The finished draft is expected to contain 4 levels, 48 modules, 144 curriculum lessons, 48 optional Practice activities, 48 required Core Challenges, and 240 rubric criteria. Every curriculum record remains `draft`. Certificate names are inactive review intent only; no certificate rows are created.

Each module contains three lessons, one optional Practice, and one required Core Challenge. The four capstones are:

- Level 1 Module 12: **Level 1 Showcase: My First AI Mini Story**
- Level 2 Module 12 / global Module 24: **Level 2 Showcase: AI Commercial or Music Campaign**
- Level 3 Module 12 / global Module 36: **Level 3 Showcase: AI Director Project**
- Level 4 Module 12 / global Module 48: **Master's Magnum Opus: The JPAC AI Production**

## Assessment and XP contract

Every Core Challenge uses five 20-point criteria, totaling 100 points, with four non-empty performance bands per criterion:

1. Creative Concept, Originality & Intent
2. Prompt Engineering, References & Iteration
3. Visual Direction, Continuity & Production Quality
4. Responsible AI Use, Privacy & Rights Awareness
5. Professional Delivery, Documentation & Reflection

The canonical module contract is `intro_core_xp=50`, `video_core_xp=100`, `assignment_core_xp=350`, `mastery_core_xp=125`, `core_xp=625`, and `core_unlock_threshold=438`. Core Challenges use `passing_score=70`, permit resubmission, and award 350 core XP. Optional Practices award 0 XP and do not advance progress.

## Review and AI-safety controls

Every module preserves these flags: `MEDIA NEEDS REVIEW`, `NEEDS CATALOG REVIEW`, `AI SAFETY REVIEW`, `MINOR ACCESS REVIEW`, `PRIVACY/CONSENT REVIEW`, `LIKENESS/PERMISSION REVIEW`, `COPYRIGHT/IP REVIEW`, `DECEPTIVE MEDIA REVIEW`, `DISCLOSURE REVIEW`, `PLATFORM POLICY REVIEW`, and `SCOPE REVIEW`.

All video and resource references remain review-only. No media is activated and no tools are bound. Google Flow, Gemini, Veo, Nano Banana, Flow Agent, Gemini Omni, and future Google AI models are treated only as current-ecosystem references. Activities require no external account or public posting, and students under 18 are not directed to use age-restricted tools independently. Flow-based student work is framed as an **Instructor-Guided AI Lab** where needed.

Students must not upload private, copyrighted, or unauthorized likeness material; bypass safeguards; impersonate people; create deceptive media or misinformation; or use real-person likenesses without permission. Private JPAC submission, AI disclosure, privacy, copyright, consent, source documentation, likeness permission, and responsible-use safeguards remain explicit.

## Execution sequence

### Preflight

Run the read-only preflight first. It requires exactly one canonical `digital-ai-creator` course shell with the expected title. If the slug differs, it reports likely candidate shells and blocks. It accepts only an empty or exact-compatible curriculum state and checks the 48-row manifest, 12/12/12/12 distribution, sequential sort orders, no student/evidence dependencies, no active media or tool bindings, and Safe Draft Isolation.

The preflight also checks protected module counts: Singing 40, Piano 49, Guitar 50, Acting 46, Dance 47, Video Production 49, Audio Engineering 48, Music Production/Songwriting 48, and Music Business 48. It verifies Assignment Swap RPCs `curriculum_swap_module_assignment_v1` and `curriculum_rollback_assignment_swap_v1`, exactly two `curriculum_assignment_swap_operations` rows, and global student-state counts (`xp_ledger=5`, `enrollments=1`, `submissions=1`, `certificates=0`, `lesson_progress=5`). Capture preservation hashes for comparison after migration.

### Migration

Only after preflight passes and explicit approval, the migration reuses the canonical course shell. It creates or reuses exact-compatible draft levels and modules and inserts children only for newly created rollout-marked modules. Writes are limited to Digital AI Creator levels, modules, lessons, Practices, Core Challenges, and embedded rubric JSON. It does not insert or update the course row, create media/tool/certificate rows, publish content, or touch student state or another course.

### Post-validation

The read-only post-validation requires the exact course identity; 4 levels; 48 exact manifest modules; 144 lessons; 48 Practices; 48 Core Challenges; 240 criteria; 48 order-independent exact rubrics; all four capstones; all review flags; draft-only status; canonical XP; zero media rows, active/bound references, certificates, or course-specific student dependencies; Safe Draft Isolation; protected counts; Assignment Swap baseline; and student-state counts. `OVERALL PASS` is possible only with zero blockers, and preservation hashes must match preflight output.

### Rollback

Rollback is conservative and marker-scoped. It refuses to run if student, evidence, progress, submission, XP, certificate, portfolio, media, tool, revision, change-request, course-progress, or Assignment Swap dependencies exist. It removes only exact batch-marked Digital AI Creator activities, lessons, modules, and now-empty batch-created levels. It never deletes or modifies the reused course shell and never touches another course.

## Visual Curriculum Studio checklist

- Course displays as **Digital AI Creator** with slug `digital-ai-creator`.
- Total modules show 48 and levels show 4.
- Each level shows 12 modules in the approved sequence.
- Each module shows three lessons, one optional Practice, and one required Core Challenge.
- Capstones appear at global modules 12, 24, 36, and 48 with the exact approved titles.
- Core Challenges show five exact 20-point categories and four populated performance bands each.
- XP fields match the canonical contract and unlock threshold.
- All curriculum remains draft; publication is not ready.
- Media remains needs-review with zero activated rows.
- Tools show configured/inactive with zero bindings.
- Certificate intent appears only in level review metadata; certificate rows remain zero.
- AI safety, privacy, likeness, copyright/IP, disclosure, platform-policy, and under-18 constraints are visible in the review material.
- Student enrollment, access, progress, evidence, submissions, and XP are unchanged.
