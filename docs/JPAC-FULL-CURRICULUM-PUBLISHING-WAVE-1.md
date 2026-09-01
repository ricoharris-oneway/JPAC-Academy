# JPAC Full Curriculum Publishing Wave 1

Status: prepared for owner approval; no publishing SQL applied

Production readiness inventory: 2026-09-01

Prepared migration: `202609010002_full_curriculum_publishing_wave_1.sql`

## A. Executive summary

Publishing Wave 1 prepares an atomic, status-only publication of the completed curriculum for nine non-Singing courses. The controlled set contains 432 modules, 1,296 lessons, and 864 activities. All target course metadata, module learning objectives and career connections, lesson content, activity instructions, and required Core Challenge rubrics passed the read-only production preflight.

The nine course rows are already published, so the migration does not update them. It changes only `status` from `draft` to `published` on the approved module, lesson, and activity UUIDs selected through the nine exact course slugs. The Piano test module and its three lessons and two activities are excluded by UUID. Singing is excluded by slug.

## B. Courses included

| Course | Modules | Lessons | Activities |
|---|---:|---:|---:|
| Acting | 46 | 138 | 92 |
| Audio Engineering | 48 | 144 | 96 |
| Dance | 47 | 141 | 94 |
| Digital AI Creator | 48 | 144 | 96 |
| Guitar | 50 | 150 | 100 |
| Music Business / Artist Development | 48 | 144 | 96 |
| Music Production / Songwriting | 48 | 144 | 96 |
| Piano | 48 | 144 | 96 |
| Video Production | 49 | 147 | 98 |
| **Total** | **432** | **1,296** | **864** |

## C. Courses and records excluded

- Singing and all Singing modules, lessons, activities, videos, and instructional media.
- Piano `Save Draft Test Module` UUID `b94c8524-9715-4020-8075-5588b6fcce62`, plus its three lessons and two activities.
- All course-level rows. The separate approved prerequisite has already published and approval-stamped the 36 non-Singing parent `course_levels`; Wave 1 preserves them without updating them.
- Any course or child record not selected through the nine exact course slugs.
- Importer migrations `202608110001` and `202608110010` through `202608110014`.

## D. Exact proposed publication counts

- Courses updated: **0**; all nine are already `published`.
- Modules updated: **432** from `draft` to `published`.
- Lessons updated: **1,296** from `draft` to `published`.
- Activities updated: **864** from `draft` to `published`.
- Course levels updated: **0**.
- Total proposed row updates: **2,592**.

The read-only inventory also confirmed that each included module has exactly three lessons and two activities, and every one of the 36 parent levels contains included curriculum. No empty level shell is included in the status updates.

## E. Publication-status fields changed

The forward migration contains only these mutations:

- `public.course_modules.status = 'published'`
- `public.lessons.status = 'published'`
- `public.activities.status = 'published'`

The transaction does not update course rows because their status is already `published`. It does not update `course_levels`, approval fields, timestamps explicitly, or any content field.

## F. Protected records not touched

The migration does not update or insert XP ledger entries, enrollments, lesson progress, mastery evidence or thresholds, submissions, reviews, certificates, student records, course access, unlock thresholds, content fields, UUIDs, packages, configuration, Aria, Live AI, Wix/payment, Video Finder, or Assignment Swap data.

Protected production baselines checked before and after the proposed transaction are:

- XP ledger: 6
- Enrollments: 2
- Submissions: 1
- Certificates: 0
- Lesson progress: 7
- Module identity/XP hash: `fe5066455650e47c94e72f3cb3f9f6ac`
- Lesson identity/XP hash: `bc805ba34679ae3d2f4e33862c2423a1`
- Activity identity/XP/mastery hash: `e46580d9f35006238965e4dacb05a0ae`

## G. Singing video protection

Singing is outside every target CTE. The production baseline is 29 Singing modules with video projections and hash `59cc00f5ebf4997aaa2d2b79884be900`. The global module-video projection hash is `5f16841e053bdad2cd79740c90233a1b`. Both hashes are fail-closed assertions in preflight, migration, post-validation, and rollback. No video column appears in an `UPDATE`.

## H. Preflight requirements

Before application, the prepared preflight must confirm:

1. Exact nine-course scope and all course rows already published.
2. Course completion hash `2c68234b2376e8bb9185dfa3db724607`.
3. Exact 432 modules, 1,296 lessons, and 864 activities, all draft.
4. Module completion hash `a65b2435025575e199755d1800c28334`.
5. Zero required non-video content gaps and valid required Core Challenge rubrics.
6. Exactly 36 nonempty parent level records; none is included in the mutation.
7. The exact Piano test artifact and children remain draft and excluded.
8. Singing video, global video, identity/XP/mastery, protected-count, and current status hashes match.

Any mismatch aborts the transaction before a write.

## I. Post-validation requirements

Post-validation requires exactly 432 published modules, 1,296 published lessons, and 864 published activities in scope; zero remaining draft target records; unchanged course and course-level status hashes; exact expected post-publication hashes for modules, lessons, and activities; the Piano artifact still draft; and all video and protected baselines unchanged.

Expected status hashes after application:

- courses: `8082773c4d305ebc6c08ee3615428c36` (unchanged)
- course levels: normalized publication hash `6c8b444b18d7a2f5acb7e7fb8333ee2b` (unchanged from the applied prerequisite)
- modules: `33d6b3dbf3574fcaf99b19a0fd91a065`
- lessons: `30d7b1cc36aad17698103f9fb04e97d2`
- activities: `234d87df696612d5d5b8f4e4646c691b`

## J. Rollback strategy

The rollback refuses to run unless the exact expected post-publication hashes and protected baselines still match. It then changes only the same 432 module, 1,296 lesson, and 864 activity statuses from `published` back to `draft`. Its postcheck requires the original status hashes. It never changes course or course-level rows, content, videos, identities, XP, progress, access, or academic records.

## K. Student visibility expectations

After a separately approved application, entitled students should be able to query the published modules and lessons for these courses, subject to existing enrollment and unlock policies. Published activities remain subject to the existing module-unlock/access policy. Missing videos remain optional and do not block the status migration.

The 36 non-Singing `course_levels` rows are already published and approval-stamped by the separately approved prerequisite. Wave 1 does not update or revert them. Their published state allows entitled student queries to receive the correct embedded level numbers and titles when the child curriculum is published.

## L. Known risks

- Published curriculum becomes read-only in Curriculum Studio under current UI behavior.
- The approved source totals are nonuniform for Acting, Dance, Guitar, and Video Production; the migration preserves those reviewed totals rather than inventing or deleting records.
- Course-level rows remain draft, so level metadata/navigation may not be fully visible to students even though module and lesson rows are published.
- Publishing all 2,592 child rows is one atomic visibility change. Post-application validation should use an entitled controlled student without creating progress merely by opening lessons.
- Videos are optional. Modules without videos will publish without instructional video media.

## M. Owner approval gate

Merging this preparation PR does not authorize production application. Before applying, the owner must explicitly approve:

1. the exact 432/1,296/864 publication scope;
2. the Piano test-artifact exclusion;
3. preservation of the 36 already-published prerequisite `course_levels`; and
4. the exact 432/1,296/864 child publication hashes.

After approval: run the exact preflight, apply only the prepared migration, run the exact post-validation, and stop for a controlled student-visibility validation plan. No SQL was applied during this build.
