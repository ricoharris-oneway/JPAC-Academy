# Music Business / Artist Development Full 48-Module Draft Rollout

## Status and source authority

This five-file artifact set prepares a controlled, draft-only rollout by reusing the existing empty `music-business` course shell. The shell remains identified by slug `music-business`, while its display title becomes **Music Business / Artist Development**. Reusing this canonical shell avoids creating a duplicate course. The curriculum authority is `docs/MUSIC-BUSINESS-ARTIST-DEVELOPMENT-FULL-PROGRAM-SOURCE-MAP.md`, committed as `461ff9cf3273982174f24e7665127b2e95567af9`.

Creating these artifacts does not authorize SQL execution, database changes, publication, student access, media activation, tool binding, or certificate issuance.

## Expected structure

| Level | Program designation | Modules | Global modules |
|---|---|---:|---:|
| 1 | Beginner / Artist Explorer | 12 | 1-12 |
| 2 | Intermediate / Artist Builder | 12 | 13-24 |
| 3 | Advanced / Artist Strategist | 12 | 25-36 |
| 4 | Master / Creative Entrepreneur | 12 | 37-48 |
| **Total** |  | **48** | **1-48** |

Each module contains three draft curriculum lessons, one optional draft Practice activity, one required draft Core Challenge, and five rubric criteria totaling 100 points. Expected totals are 4 levels, 48 modules, 144 lessons, 48 Practices, 48 Core Challenges, and 240 rubric criteria. All records remain `draft`; expected media rows and tool bindings are zero.

## Capstones

- Level 1 Module 12: **Beginner Showcase: My Artist Starter Kit**
- Level 2 Module 12 / global Module 24: **Intermediate Showcase: The Mock Single Release**
- Level 3 Module 12 / global Module 36: **Advanced Showcase: JPAC Artist Launch**
- Level 4 Module 12 / global Module 48: **Master's Magnum Opus: The JPAC Artist Enterprise**

Capstones use private or simulated evidence and the existing JPAC teacher-review workflow. They do not require publication, distribution, public profiles, external outreach, or third-party accounts.

## Certificate intent

Certificate intent is preserved only in inactive level review metadata and this document:

- JPAC Artist Explorer Certificate
- JPAC Artist Builder Certificate
- JPAC Artist Strategist Certificate
- JPAC Master Artist Entrepreneur Certificate

The migration creates no certificate rows and does not invoke or alter certificate logic.

## Rubric framework

Every required Core Challenge uses five 20-point criteria, each with four non-empty performance bands:

1. Artist Identity, Brand & Audience Strategy
2. Business, Rights & Revenue Understanding
3. Marketing, Content & Campaign Planning
4. Professional Communication, Teamwork & Leadership
5. Professional Delivery, Presentation & Reflection

Post-validation checks categories order-independently, requires five distinct names, requires each weight to equal 20, and requires four non-empty bands per criterion.

## XP contract

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

## Review and safety controls

Every module preserves `MEDIA NEEDS REVIEW`, `NEEDS CATALOG REVIEW`, `RIGHTS/LEGAL REVIEW`, `FINANCIAL LITERACY REVIEW`, `CONTRACT/AGREEMENT REVIEW`, `MINOR SAFETY/PRIVACY REVIEW`, `COLLABORATION/CONSENT REVIEW`, `BRAND/SPONSORSHIP REVIEW`, `TOURING/EVENT SAFETY REVIEW`, and `SCOPE REVIEW`.

Videos and media remain inactive. No media rows or tool bindings are created. Platforms, distributors, PROs, streaming and social services, sponsors, venues, brands, and third-party tools are conceptual examples only. External account creation and public posting are not required.

Students—especially minors—must not privately contact unknown adults. Collaboration uses fictional or teacher-approved participants with consent and supervision. Rights, royalties, publishing, revenue, sponsorship, events, touring, agreements, and contracts remain educational, review-flagged content. Nothing provides individualized legal, contract, tax, investment, or financial advice.

## Preflight

The read-only preflight requires exactly one canonical course with slug `music-business`. It verifies that the shell has zero actual modules, lessons, activities, enrollments, submissions, lesson progress, XP ledger rows, and certificates before rollout. The shell's legacy `module_count` metadata is not treated as curriculum evidence; actual related rows control the empty-shell decision. It also verifies the 48-entry manifest, 12/12/12/12 distribution, sequential global sort order, no active media/tool dependencies, Safe Draft Isolation, protected curriculum counts (Singing 40, Piano 49, Guitar 50, Acting 46, Dance 47, Video Production 49, Audio Engineering 48, Music Production/Songwriting 48), and global student-state counts (`xp_ledger=5`, `enrollments=1`, `submissions=1`, `certificates=0`, `lesson_progress=5`). Assignment Swap preservation explicitly requires the existing RPCs `curriculum_swap_module_assignment_v1` and `curriculum_rollback_assignment_swap_v1`, plus exactly two rows in `curriculum_assignment_swap_operations`. Stop unless every blocking finding passes.

## Migration

The migration is scoped to the existing course row selected by slug `music-business` and a rollout marker. It does not insert a course row and never changes the slug. It accepts only the original title **Music Business** or the idempotent rollout title **Music Business / Artist Development**, and its only course-row mutation is changing the original title to the rollout display title. It then creates or reuses only exact-compatible draft levels and modules, inserting three lessons plus two activities only for newly created marked modules. It follows the UUID and idempotency conventions of prior successful full-draft rollouts.

It does not touch other courses; publish records; create media, tools, certificates, enrollments, progress, submissions, evidence, XP, or portfolios; or invoke learning-engine or Assignment Swap workflows.

## Post-validation

The read-only post-validation requires the slug to remain `music-business` and the display title to equal **Music Business / Artist Development**. It checks exact totals, manifest, capstones, certificate intent, draft status, canonical XP, exact order-independent rubrics, review flags, zero media/tool bindings, zero certificate rows, zero course-specific student/evidence dependencies, Safe Draft Isolation, protected course counts, Assignment Swap baseline, and student-state counts. `OVERALL PASS` requires zero blockers; preservation hashes must be compared with preflight output.

## Rollback scope

Rollback is conservative and marker-scoped. It removes only exact batch-created Music Business / Artist Development activities, lessons, modules, and now-empty batch-created levels from the `music-business` course. It never deletes the course row or changes its slug. When rollout-marked modules were present and the title still matches the rollout title, rollback restores the display title to **Music Business**. It preserves exact-compatible pre-existing records and refuses to proceed if marked payloads changed or if student/evidence/progress/submission/XP/certificate/portfolio/media/tool/course-progress/revision/change-request/Assignment Swap dependencies exist. It never touches another course.

## Controlled usage order

1. Review all five artifacts.
2. With separate approval, run the read-only preflight manually.
3. Stop unless preflight returns zero blockers and `OVERALL PASS`.
4. With separate approval, run the migration.
5. Run post-validation and compare preservation baselines with preflight.
6. Complete visual review in Curriculum Studio.
7. Use rollback only with separate approval and when every rollback guard passes.

## Visual check checklist

- Course label/slug, four level designations, 12 modules per level, module order, and all capstones match the source map.
- Every module shows three lessons, one optional Practice, and one required Core Challenge.
- Every Core Challenge shows the five approved 20-point categories and four populated bands.
- All curriculum is draft and publication remains not ready.
- No active media, video URL, Lab/tool binding, public-posting step, or external-account requirement appears.
- Certificate names appear only as inactive intent; no certificate is created.
- Legal, financial, contract, rights, privacy, collaboration, sponsorship, and touring cautions are visible where relevant.
- No protected course, Assignment Swap, Career Path, student state, or learning-engine behavior changed.
