# Module Readiness + Draft Assist v1

Branch: `codex/module-readiness-draft-assist-v1`

Route: `/staff/module-readiness`. Navigation: **Module Readiness**, visible to teacher (the application's staff role), admin, and developer. The existing role guard excludes students.

The dashboard reads published courses and `course_modules`, plus lessons, activities, and module instructional media through the existing Supabase client. All reads are paginated; any failed or incomplete read blocks readiness results. Every published course has a summary, including courses with zero published modules.

A module is Ready only if published and it has a usable instructional video, a published lesson, a published activity/assignment, description, AI summary, nonblank learning objectives, and career connection. Activities linked only through lessons are included. Draft and retired media do not satisfy the active-media check; an explicit unresolved active-media pointer needs review. Legacy module video URLs remain supported. Ready is a content completeness signal, not a pedagogical quality approval.

Draft Assist generates deterministic suggestions only for missing categories: description, student summary, objectives, career connection, practice outline, assignment prompt, rubric, video search, and video acceptance criteria. Staff context includes course title/slug, module title/order/number, description, lesson/activity titles and statuses, and missing items. Missing lessons receive an explicit staff follow-up. Video guidance includes topic, phrase, length, coverage, red flags, and confidence guidance.

Each section is editable and copyable; all sections can be copied together. Switching modules preserves edits during the current page visit. Refreshing or leaving the page discards them. There is no Save Approved Draft action, auto-save, external AI call, new dependency, or persistent draft storage. Links open the existing Video Finder and Curriculum Studio routes; staff select the course/module there.

## Validation

- TypeScript check: passed (`node node_modules/typescript/bin/tsc -b --pretty false`).
- Production build: passed (`node node_modules/vite/bin/vite.js build`), with unresolved existing asset references and bundle-size warnings.
- `node scripts/module-readiness-check.mjs`: verifies completeness, publication, lesson-linked activities, media states, whitespace, deterministic generation, input immutability, write boundary, route guard, pagination, and read failure handling.
- `git diff --check`: passed.
- `node scripts/jpac-release-check.mjs`: ran successfully; reports frontend-only scope and REVIEW REQUIRED from keyword matches. Reviewed matches are read filters, draft copy, test fixtures, and existing route/navigation context, not protected writes.

Authenticated browser checks against real staff accounts and live curriculum remain pending. No final student testing was run. The role boundary was checked statically, and query behavior was tested with fixtures; these do not establish production RLS visibility or live-data completeness.

## Protected boundary

No changes to SQL, RPCs, migrations, enrollment/payment/consent ledgers, course access, progress, XP, mastery, submissions, certificates, curriculum status, video/media records, Aria, Live AI, or Wix. The only existing files changed are route and navigation registration. No production data was created or updated. Existing Video Finder and Curriculum Studio code is unchanged. Merge requires approval.
