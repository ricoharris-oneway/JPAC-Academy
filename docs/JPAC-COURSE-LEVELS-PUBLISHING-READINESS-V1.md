# JPAC Course Levels Publishing Readiness v1

Status: prepared for owner approval; no production writes performed

Production inventory date: 2026-09-01

Prepared migration: `202609010003_course_levels_publishing_readiness_v1.sql`

## A. Executive summary

The 36 non-Singing `course_levels` rows should be published and approved before Full Curriculum Publishing Wave 1 publishes its 2,592 child records. Draft levels do not directly hide module rows under the current module RLS policy, so they are not a hard database gate on module access. They are, however, a functional student-navigation prerequisite: student course queries embed `course_levels(level_number,title)`, while the course-level RLS policy exposes only rows with `status='published'`, non-null `approved_at`, and course access.

If child rows are published first, entitled students can receive modules but the embedded level object can be null. The course page then omits Beginner/Intermediate/Advanced/Master labels, module and lesson pages fall back to “Level 1,” and level-completion transitions cannot reliably detect a level change. Publishing the 36 levels first avoids that inconsistent state.

Recommendation: use a separate, narrowly scoped prerequisite migration. Apply and post-validate it first; then apply the already prepared Full Curriculum Publishing Wave 1 migration in the same controlled maintenance sequence. This preserves independent rollback boundaries and avoids modifying the already reviewed child migration.

## B. How course levels affect student navigation

- **My Academy/dashboard:** course cards and course visibility come from `jpac_my_academy_courses`, enrollments, and published module counts. Their displayed “Level” is `enrollment_level`; draft `course_levels` do not hide the course card.
- **Course page:** `loadCourseContent` loads published modules and embeds `course_levels(level_number,title)`. The page is a flat module list rather than explicit grouped sections, but every module heading uses the embedded level number and title.
- **Module and lesson pages:** both use the level number returned with the module. When the relation is hidden, the UI falls back to Level 1.
- **Level transitions:** the mission completion component compares the current and next module level numbers to decide whether to show “Level complete.” Null level values prevent reliable transitions.
- **Visibility policies:** the current module and lesson read policies do not require the parent level to be published. The separate course-level policy does, so draft levels hide the embedded label record rather than the child module itself.

Conclusion: course levels are not required for raw module-row visibility, but they are required for accurate, functional level-aware navigation and should precede child publication.

## C. Current course-level inventory

The nine target courses each have four complete level rows: **36 total**, all `draft`, all with null `approved_at`, and all with null `approved_by`.

| Course | Levels | Titles present | Descriptions present | Objective arrays present | Empty shells |
|---|---:|---:|---:|---:|---:|
| Acting | 4 | 4 | 4 | 4 | 0 |
| Audio Engineering | 4 | 4 | 4 | 4 | 0 |
| Dance | 4 | 4 | 4 | 4 | 0 |
| Digital AI Creator | 4 | 4 | 4 | 4 | 0 |
| Guitar | 4 | 4 | 4 | 4 | 0 |
| Music Business / Artist Development | 4 | 4 | 4 | 4 | 0 |
| Music Production / Songwriting | 4 | 4 | 4 | 4 | 0 |
| Piano | 4 | 4 | 4 | 4 | 0 |
| Video Production | 4 | 4 | 4 | 4 | 0 |

Every target module has a valid `course_level_id` pointing to one of these 36 levels. Every target level has included modules; none is an empty shell. Target level-content hash: `fd6f47e501bb8607de5e8aa20ac6f2eb`.

Singing is excluded. Its Beginner level is already published and approved-at with 10 modules and existing lesson/activity content. Singing Intermediate, Advanced, and Master remain draft shells with 10 modules each but no lessons or activities. This package does not alter any of those four rows.

## D. Recommended publish order

1. Run the course-level preflight.
2. Apply the separate 36-row course-level migration after explicit approval.
3. Run course-level post-validation.
4. Apply the already prepared Full Curriculum Publishing Wave 1 child migration only after its separate approval.
5. Run the child post-validation.
6. Perform controlled student visibility validation without opening lessons if that would create progress.

Publishing Wave 1 should wait until the course-level prerequisite passes post-validation. The two migrations can run in the same planned maintenance session, but should remain separate migration/history entries and separate rollback units.

## E. Should Publishing Wave 1 wait?

Yes. Publishing children first would create a temporary but user-visible inconsistency: modules could appear without their correct level title/number, module and lesson headers could incorrectly fall back to Level 1, and level completion messaging could fail. There is no benefit to accepting that state when the 36 complete level rows can be published first with a narrow reversible migration.

## F. Proposed course-level migration

The prepared migration targets only `course_levels` belonging to the exact nine non-Singing slugs. It updates:

- `status` from `draft` to `published`;
- `approved_at` from null to the transaction timestamp.

It does not set `approved_by`. That column is nullable, and the existing published Singing Beginner level also has a null `approved_by`; no staff UUID is invented. No course, module, lesson, activity, video, XP, enrollment, progress, mastery, submission, review, certificate, Aria, Live AI, Wix, package, lockfile, or configuration row/field is updated.

The migration asserts exact target counts, complete level fields, relationships, child completion hashes, current child draft hashes, Singing video protection, all protected academic/access baselines, and the exact Piano test exclusion before writing.

## G. Rollback strategy

Rollback is fail-closed. It requires all 36 exact target rows to be published with non-null approval timestamps, the expected normalized level-publication hash, unchanged target content, unchanged child status hashes, and unchanged protected/video baselines. It resets only those 36 rows to `status='draft'` and `approved_at=null`. It does not alter `approved_by`, content, children, Singing, or protected systems.

## H. Approval gate before production write

Merging this preparation package does not authorize application. Owner approval must explicitly authorize:

1. publishing exactly 36 non-Singing course-level rows;
2. setting their `approved_at` timestamp while leaving nullable `approved_by` unchanged;
3. applying the course-level migration before the existing child Publishing Wave 1 migration; and
4. running both exact post-validation scripts before any student visibility check.

## I. No-production-write confirmation

All production inspection in this build was SELECT-only. The migration, preflight, post-validation, and rollback are prepared files only. No SQL migration was applied, no status or approval value changed, and all protected counts and Singing video baselines remained unchanged.
