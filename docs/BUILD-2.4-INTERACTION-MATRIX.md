# Build 2.4 — Functional Student Experience

**Repository status:** implemented locally; production validation pending  
**Visual scope:** existing JPAC visual language retained  
**Canonical identity:** Supabase Auth `auth.uid()` / authenticated JWT  
**Canonical ownership:** Wix purchases and program membership; Supabase profiles, entitlements, curriculum, progress, XP, credentials, portfolio, and intelligence evidence

This matrix records every student-visible route and actionable control in the current production application. “Working” means the repository implementation is connected to a canonical source and has a real destination or mutation. It does not attest that production Wix mappings, rows, environment settings, or migrations have passed live validation.

## Interaction matrix

| Surface | UI label/control | Current route or action | Expected route or action | Current data source | Required canonical data source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Sidebar | Home | `/` | Student dashboard | Auth profile and entitlement/progress RPCs | `profiles`, `jpac_my_entitled_courses()`, `lesson_progress` | Working |
| Sidebar | My Academy | `/courses` | Entitled courses only | `jpac_my_entitled_courses()` enriched with published curriculum and own progress | Wix entitlement + explicit plan/course map; Supabase curriculum/progress | Working |
| Sidebar | Practice Submissions | `/practice-coach` | Explain that an authorized Wix assignment link is required | Route is neutral without assignment parameters | `wix_assignments`, Wix Program membership, private Storage, submission RPC | Working |
| Sidebar | Student Intelligence | `/student-intelligence` | Display stored evidence only | Supabase intelligence tables; neutral zero/empty fallback | `student_digital_twins`, preferences, strengths, recommendations, timeline | Working; live evidence validation pending |
| Sidebar | Certificates & Portfolio | `/certificates` | Own issued credentials and own portfolio | Student-filtered Supabase queries plus RLS | `certificates`, `portfolio_projects`, `media_assets` | Working; live RLS validation pending |
| Sidebar | Creative Studio | `/studio` | Ready tools mapped to an entitled course | `lab_tools`, `lab_tool_courses`, `jpac_my_entitled_courses()` | Supabase tools/mappings plus Wix-backed access | Working; empty when no mapped launchable tool |
| Sidebar | ARIA Mentor | Hidden | Remain hidden until a governed production runtime exists | Removed scripted implementation | Governed server-side ARIA runtime | Feature unavailable; intentionally hidden |
| Sidebar | Creative Challenges | Hidden | Remain hidden until official persistence/workflows exist | Removed browser/demo implementation | Approved server-side challenge records and mutations | Feature unavailable; intentionally hidden |
| Sidebar | Sign out | `signOut()` | End Supabase session and return through auth routing | Supabase Auth | Supabase Auth | Working |
| Mobile nav | Open/close menu and shade | Local UI state | Open or close existing sidebar | React UI state only | UI state may remain client-local | Working |
| Dashboard | Continue Learning | Computed canonical destination | First entitled course, most recently accessed incomplete lesson, next lesson after completion, or course review | Entitlement RPC + `lesson_progress.updated_at/status` | Same | Working |
| Dashboard | View all | `/courses` | My Academy | Same as My Academy | Same | Working |
| Dashboard | Course Open/Continue | `/courses/:courseId` | Canonical entitled course | Entitled UUID | Same | Working |
| Dashboard | Recently accessed | Exact computed lesson/course | Resume canonical eligible work | Own persisted lesson progress | `lesson_progress` | Working |
| Dashboard | Welcome name | Display only | Profile name, then Auth metadata, then email | `profiles.display_name`, Auth metadata/email | Same | Working |
| Dashboard | Active programs | Display only | Count current entitled mapped courses | Entitlement RPC result | Wix access + explicit mapping | Working |
| Dashboard | Canonical XP | Display only | Stored profile XP aggregate | `profiles.total_xp` | Canonical XP aggregate maintained by trusted workflow | Working |
| My Academy | Course cards | Exact entitled UUID set | Show only purchased/current mapped programs | `jpac_my_entitled_courses()` | Same | Working |
| My Academy | Open Course | `/courses/:courseId` | Open entitled course | Canonical course UUID | Same | Working |
| My Academy | Continue Learning | `/courses/:courseId/lessons/:lessonId` when eligible | Resume next eligible lesson | Own lesson progress + curriculum ordering | Same | Working |
| Course | Open in Wix | External `wix_program_url` | Open configured Wix program in new tab | `courses.wix_program_url` | Supabase course integration metadata | Working when configured; hidden otherwise |
| Course | Lesson row Open | `/courses/:courseId/lessons/:lessonId` | Open lesson belonging to entitled course/module | Published curriculum query behind access RPC and RLS | `courses`, `course_modules`, `lessons` | Working |
| Course | Explore Module | `/courses/:courseId/modules/:moduleId` | Open module belonging to course | Canonical module UUID | Same | Working |
| Module | Back to course | `/courses/:courseId` | Return to parent course | Route UUIDs verified against returned curriculum | Canonical curriculum | Working |
| Module | Lesson Open/Resume | `/courses/:courseId/lessons/:lessonId` | Open lesson in module | Canonical curriculum and own progress | Same | Working |
| Lesson | Back to module | `/courses/:courseId/modules/:moduleId` | Return to verified parent module | Canonical hierarchy | Same | Working |
| Lesson | Open lesson content in Wix | External `wix_lesson_url` | Open configured content in new tab | `lessons.wix_lesson_url` | Supabase lesson integration metadata | Working when configured; hidden otherwise |
| Lesson | Mark lesson complete | Own-row upsert | Persist 100% completion for authenticated student | `lesson_progress` with authenticated user derived from Supabase | `lesson_progress`; RLS and entitlement check | Working; live RLS validation pending |
| Lesson | Continue to Next Lesson | Next curriculum-ordered lesson | Advance across module boundaries where appropriate | Canonical module/lesson ordering | Same | Working |
| Practice | Return to My Courses | `/courses` | Exit neutral/error state | Static route only | N/A | Working |
| Practice | File picker | Select audio/video | Select evidence for authorized assignment | Browser `File`, not canonical until upload | Private Supabase Storage | Working |
| Practice | Submit to Teacher Studio | Private upload then `jpac_create_wix_submission()` | Create authorized official submission; clean failed upload | Storage + RPC | Wix assignment membership, Storage, `submissions` | Working; live assignment/storage validation pending |
| Intelligence | Continue learning | `/courses` | Return to entitled learning | Static route | Entitlement screen | Working |
| Intelligence | Staff Refresh evidence | `refresh_student_digital_twin` | Staff-only stored evidence refresh | Server RPC | Trusted server workflow | Working for staff; intentionally absent for students |
| Intelligence | Student selector | Staff-only selection | Inspect authorized student evidence | Supabase tables constrained by staff RLS | Same | Working for staff; not student-visible |
| Intelligence | Recommendations/metrics | Display only | Show stored records or explicit neutral empty state | Supabase evidence tables | Same | Working; no fabricated fallback |
| Certificates | Verify | `/verify/:token` | Public canonical verification RPC | `certificates.verification_token` | `verify_credential(text)` public projection | Working; live anonymous validation pending |
| Certificates | Open certificate document | `/api/certificate-document?token=…` from verification page | Render document for verified active credential | Canonical verification token | Certificate API + service-side verification | Working; deployment validation pending |
| Portfolio | Open evidence | Stored external URL in new tab | Open persisted evidence | `media_assets.external_url` | Same | Working when present; hidden otherwise |
| Portfolio | Feature/Remove feature | Update own project | Persist featured status | `portfolio_projects` | Same with RLS | Working; live RLS validation pending |
| Portfolio | Save project | Insert own project and optional link | Persist real portfolio evidence | `portfolio_projects`, `media_assets` | Same | Working; no browser-local authority |
| Creative Studio | Open tool | Configured external launch URL | Launch ready entitled tool | `lab_tools.launch_url` | Same | Working when configured |
| Creative Studio | Published tool without URL | Non-clickable explanation | Do not imply a launch action | `launch_url IS NULL` | Same | Feature unavailable; intentionally non-clickable |
| Authentication | Login / forgot password / callback / password setup | Existing public auth routes | Preserve Milestone 1 behavior | Supabase Auth | Supabase Auth | Working in repository; live validation remains |
| Route guard | Direct unauthorized course/module/lesson | Locked state or role redirect | Never reveal another course/student record | Access RPC + curriculum/progress RLS | `auth.uid()` and explicit entitlement mapping | Working; live negative test pending |
| Unknown route | Wildcard | `/` | Avoid white screen | Router | N/A | Working |

## Canonical progress contract

- Lesson state is read from and written to `lesson_progress` for `auth.uid()`.
- Module progress is the mean of its published lessons’ `percent_complete` values.
- Course progress is the mean of all published lessons in curriculum order.
- Home and My Academy use the same lesson-derived aggregation as Course and Module.
- Opening a never-started lesson persists `in_progress` at 1%; completing it persists `completed` at 100%.
- Refresh and sign-out/sign-in do not reset progress because no canonical state is stored in browser storage.
- `student_learning_state` remains an existing trusted aggregate/integration structure, but Build 2.4 does not create a competing progress engine or use it to overwrite direct lesson evidence in the student UI.

## Intentionally hidden or unavailable interactions

| Capability | Disposition | Reason |
| --- | --- | --- |
| ARIA Mentor chat | Hidden | Build 2.3 removed the scripted/browser runtime. No governed production AI runtime is connected. |
| Creative Challenges | Hidden | The prior implementation was prototype/browser state and cannot award official XP or completion. |
| Fabricated daily mission, time estimate, and XP reward | Removed from Student Intelligence | No canonical recommendation record supplied those claims. Stored recommendations remain visible. |
| Personalized intelligence fallback scores | Replaced with neutral zero/empty states | No production evidence must not look like calculated evidence. |
| Creative Studio tool without launch URL | Visible as non-clickable configuration state | The record is real, but the launch action is unavailable. |
| Practice without Wix assignment parameters | Neutral instructional state | Official submissions require an exact authorized Wix assignment. |

## Route and authorization verification matrix

| Scenario | Expected result |
| --- | --- |
| Direct `/courses/:ownedId` | Course loads with only published hierarchy and own progress. |
| Direct `/courses/:unownedId` | Locked/access-denied state; no curriculum or progress disclosure. |
| Owned course with another course’s module ID | Module unavailable state. |
| Owned course with another course’s lesson ID | Lesson unavailable state; no progress mutation. |
| Refresh course/module/lesson | Same canonical state reloads. |
| Browser back/forward | Router restores the correct route and each page reloads canonical records. |
| Logout then login | Supabase session changes; persisted progress and entitlements reload unchanged. |
| Expired session | Auth guard/login or explicit session-expired error; no white screen. |
| No entitlement | My Academy empty state; arbitrary course URLs remain locked. |

## Manual production test procedure

Before testing, deploy the reviewed Build 2.1–2.3 migrations and this preview build. Use real Wix plan IDs mapped to canonical course UUIDs; do not create title-derived mappings. For every persona, capture the browser Network request/response for `jpac_my_entitled_courses`, `jpac_student_has_course_access`, curriculum selects, and lesson-progress writes, plus relevant Supabase logs.

### Singing-only student

1. Provision a new Wix member with exactly one active Singing purchase and complete Academy activation/login.
2. Open Home and My Academy. Confirm exactly Singing appears and the active-program count is 1.
3. Confirm Continue Learning opens Singing, then navigate Course → Module → Lesson.
4. Directly open a known Piano course, module, and lesson URL. Confirm each is denied/unavailable and no Piano data appears.
5. Open a Singing lesson, refresh, log out/in, and confirm its nonzero progress persists everywhere.

### Piano-only student

Repeat the Singing procedure with only the Piano plan. Confirm exactly Piano appears and every Singing deep link is denied.

### Multi-course student

1. Provision active Piano and Singing entitlements for one member.
2. Confirm exactly both canonical courses appear without duplicates or unpurchased catalog items.
3. Open a lesson in each course at different times. Confirm Home Continue Learning resumes the most recently accessed incomplete lesson.
4. Complete that lesson. Confirm Continue advances to the next eligible ordered lesson; if its course is complete, confirm another incomplete entitled course is selected or the completed course opens for review.

### No-entitlement student

1. Sign in with a valid student profile that has no current mapped entitlement.
2. Confirm Home shows zero active programs and My Academy shows the explicit no-access state.
3. Confirm all known course/module/lesson deep links are denied and no progress row can be inserted.
4. Confirm Studio has no student tools and Practice requires an authorized assignment link.

### Student with lesson progress

1. Use a student with existing `lesson_progress` rows containing known percentages/statuses/timestamps.
2. Calculate the expected module/course averages from published lessons.
3. Confirm Home, My Academy, Course, Module, and Lesson agree with those values and statuses.
4. Complete an incomplete lesson and confirm the database row becomes 100%/`completed`, every aggregate changes consistently after refresh, and Continue selects the next lesson.

### Student with no progress

1. Use an entitled student with no `lesson_progress` rows.
2. Confirm all progress indicators are neutral zero and Continue Learning opens the first entitled course.
3. Open its first lesson. Confirm one own `lesson_progress` row is created as `in_progress`, no other student row changes, and the UI persists the new state after reauthentication.

## Production evidence still required

- Live Wix entitlement combinations and status vocabulary against the deployed explicit mappings.
- Live Supabase RLS negative tests using two distinct student JWTs.
- Live assignment upload/RPC/storage-cleanup test.
- Live certificate list, anonymous `verify_credential(text)`, revoked token, and certificate-document test.
- Live Studio course/tool mapping and external launch test.
- Browser matrix for deep links, back/forward, refresh, expired sessions, and logout/login.

Build 2.4 must remain **production validation pending** until those tests pass. No commit is included in this build handoff.
