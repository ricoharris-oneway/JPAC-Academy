# Career Pathing Experience v2

The student route remains `/career-pathing`, guarded for the student role. The new `/staff/career-pathing` route and Career Pathing Admin navigation use the existing teacher/admin/developer staff guard. No existing navigation entries were removed.

The existing `careerPaths` catalog is unchanged: all 14 titles, IDs, categories, statuses, programs, and tool links are preserved. Both views share catalog cards and tool presentation. Selections, category filters, search, and motion settings are local component state only.

Students receive the Choose Your Creative Future hero, CSS-only floating icons, animated selected borders, a glowing six-step journey with milestone dots, connected programs, and Creator Tools. The roadmap is explicitly an exploration guide, not recorded academic progress. A pause button and reduced-motion rules control animation. Selected details receive keyboard focus and honor reduced motion when scrolling.

Staff receive the full catalog, five category filters, title/program/outcome search, six summary cards, and a selected-path detail with family talking points, coaching prompts, and suggested evidence. Summary counts are derived from the catalog: 14 total, 3 performance, 4 music creation, 3 stage/screen, 1 creative business, 3 education/leadership. Advising copy provides conversation suggestions; it does not assign work or change records. Links open Curriculum Studio, Module Readiness, Student Intelligence, and JPAC Coach.

## Validation

- TypeScript check and production build passed. Existing missing-artwork and bundle-size build warnings remain.
- `git diff --check` passed.
- `jpac-release-check.mjs` reports frontend-only scope with keyword review required. Matches are existing route/navigation context and the requested safety copy; no protected behavior changed.
- Local headless Edge checks used the real App routes, layout, pages, and catalog with fixture authentication. External requests were blocked. All three staff roles loaded the staff route; students were redirected away from it; the student route retained all 14 paths.
- Verified category counts, title/program/outcome search, empty results/reset, selected-path details, focus transfer, six roadmap steps, pause/resume, reduced motion, and staff link destinations.
- Both views and selected details passed at 1440px, 390px, and 320px with no horizontal overflow or page errors. Screenshots were visually reviewed.

No authenticated production verification or final student testing was performed. No database reads/writes were added. No migrations, SQL/RPCs, packages, catalog data, access rules, academic records, media, enrollment/payment/consent logic, Aria, Live AI, Wix, Module Readiness, Video Finder, or Course Enrollment Manager implementations changed.

PR and squash title: `feat: expand career pathing experience`. Merge requires approval.
