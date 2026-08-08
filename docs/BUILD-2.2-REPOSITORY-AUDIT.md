# Build 2.2 Repository Audit and Production Feature Matrix

**Audit date:** 2026-08-07
**Branch inspected:** `feature/student-access-milestone-2`
**Scope:** all routed and unrouted pages, shared components, client libraries, API routes, 30 forward migrations, 2 rollback scripts, validation SQL, database functions, triggers, views, indexes, and RLS policies present in the repository.

This is a repository audit, not a production-state attestation. It does not prove which migrations are installed in production, that Wix/Vercel/Supabase settings are configured, or that a live end-to-end flow has passed. No application or database behavior was changed during this audit.

## Build 2.3 remediation status

The following Critical and High findings have been remediated in the repository. They remain production-validation pending until the Build 2.3 deployment checklist passes:

| Audit finding | Build 2.3 repository status | Remediation artifact |
| --- | --- | --- |
| Default/overexposed `SECURITY DEFINER` execution | Remediated locally | `202608070201_build_2_3_security_hardening.sql` removes ambient `PUBLIC` execution, preserves explicit RLS helpers, and restricts official progress, certificate, and outbox workers to `service_role`. |
| Open authenticated owner bootstrap and evidence-free certificate RPC | Remediated locally | `claim_initial_owner()` and the legacy manual certificate function are now `service_role`-only; neither has an active client caller. |
| Broad Wix assignment reads/submissions | Remediated locally | Exact Wix Program membership is required by RLS and `jpac_create_wix_submission`; student media paths must also begin with the authenticated student's UUID. |
| Failed-upload Storage cleanup | Remediated locally | Own-folder delete policy added for `performance-submissions`. |
| A5 title-derived program mapping | Remediated locally | `202608070202_build_2_3_canonical_consolidation.sql` requires an existing explicit `wix_program_course_map` row. |
| Incompatible `lab_tool_courses` definitions | Remediated locally | Data-preserving `tool_id` → `lab_tool_id` rename plus missing-column backfill. |
| Duplicate XP writes/canonical ambiguity | Remediated locally | A5 no longer writes `student_xp_ledger`; canonical/legacy table ownership is documented in database comments. No history is deleted. |
| Browser-local portfolio | Remediated locally | Certificate/Portfolio page now uses `portfolio_projects` and `media_assets`. |
| Browser-local guardian indicator | Remediated locally | Teacher Studio checks `parent_relationships`. |
| Scripted/local ARIA, challenges, dreams, career, achievements, legacy courses | Removed from production routes | Obsolete routed implementations and dependencies were removed; no canonical claims remain in browser storage. |
| Simulated Practice Coach analysis | Removed from production route | Practice Coach now accepts only synchronized, authorized Wix assignments. |
| Static/disconnected Creative Studio | Remediated locally | Studio reads published `lab_tools` and filters student tools by entitled course mappings. |
| Certificate notification queue without delivery | Remediated locally; configuration pending | `202608070203_build_2_3_notification_delivery.sql` and `/api/notification-outbox` provide a service-role, retry-safe webhook worker. |
| Manual certificate shortcut with fabricated academic values | Removed from production UI | Admin enrollment and XP actions remain; certificate issuance must use trusted completion evidence and the service-role workflow. |
| Broken credential logo path | Remediated locally | Public verification page uses the repository's actual logo asset. |
| Credential token type/RPC overload conflict | Remediated locally; live validation pending | UUID tokens are losslessly preserved as opaque text, new tokens use 24 random bytes, the UUID RPC overload is removed, and one revocation-safe `verify_credential(text)` projection remains. |

Canonical consolidation is deliberately non-destructive: legacy XP, achievement, notification, portfolio-document, progress, and audit records remain intact. Build 2.3 stops new duplicate writes where an active duplicate producer existed and declares the source each future workflow must use. Physical legacy-table removal requires a later production-data migration review.

## Status definitions

| Status | Meaning |
| --- | --- |
| Implemented | Connected code and persistence exist, with an authorization boundary. Live production validation may still remain. |
| Partial | A usable implementation exists, but a required integration, authorization control, canonical data path, or validation gate is missing. |
| Demo | Static, scripted, browser-only, or simulated behavior that must not be treated as an official record. |
| Disconnected | A database/API/UI artifact exists but its intended producer or consumer is absent or uses a different data model. |
| Duplicate | Overlaps another canonical implementation or stores the same concept in competing structures. |
| Blocked | Must not be promoted until a security, migration, or data-integrity issue is resolved. |

## Executive assessment

No repository capability can yet be classified as fully production-complete because Milestones 1 and 2 still require live production validation, and later feature families contain material security and canonical-data conflicts.

The strongest reusable production foundation is:

- Supabase Auth session/profile integration and role-based routing;
- Wix member/order/program event ingestion with event idempotency;
- Build 2.1 explicit Wix plan-to-course authorization artifacts;
- canonical curriculum tables and lesson-progress RLS;
- private assignment-media storage policies;
- teacher review automation after its execution grants are tightened;
- outbox, learning-state, certificate, and operations schemas after their callable functions are secured;
- public credential verification using opaque verification tokens.

The clearest demo-only areas are Creative Studio, Career Journey, Achievements, Creative Challenges, Dream Board, local ARIA coaching, local practice analysis, and the local portfolio builder. Their UI is substantial, but their claims are computed from hard-coded arrays, scripted rules, file size, timers, or `localStorage` rather than canonical server-side records.

## Release-blocking findings

1. **Official-record functions are overexposed.** PostgreSQL grants function execution to `PUBLIC` by default unless revoked. Most migrations grant selected roles without first revoking `PUBLIC`. In particular, `jpac_refresh_student_learning_state(uuid)` and `jpac_issue_completion_certificate(uuid)` are `SECURITY DEFINER`, granted to `authenticated`, and contain no caller authorization check. An authenticated caller can invoke official progress/XP/outbox or certificate workflows for arbitrary qualifying records.
2. **Outbox mutation functions lack a database caller boundary.** `jpac_claim_integration_outbox` and `jpac_complete_integration_delivery` are `SECURITY DEFINER` and do not revoke default execution. The HTTP route has a shared-secret check, but direct RPC access is a separate authorization surface.
3. **A5 still performs title-derived authorization-adjacent mapping.** `jpac_refresh_student_learning_state` automatically inserts `wix_program_course_map` by comparing normalized Wix program and course titles. This conflicts with the explicit-ID ownership rule adopted in Build 2.1.
4. **`lab_tool_courses` has incompatible duplicate definitions.** C1 creates `(tool_id, course_id)`. LC1.4 later uses `CREATE TABLE IF NOT EXISTS` with `(lab_tool_id, course_id)` and then queries/inserts `lab_tool_id`. On a normal sequential migration, the second definition does not alter the first table, so Lab Manager reads and writes fail.
5. **Assignment visibility and membership are too broad.** All authenticated users may read every active `wix_assignments` row. The final submission RPC verifies the caller is the target student but does not prove that student belongs to the assignment's Wix program.
6. **Competing canonical progress systems exist.** `enrollments.progress`, `course_progress`, `activity_progress`, `lesson_progress`, `wix_program_enrollments.progress`, and `student_learning_state.progress` overlap. Some synchronization is one-way and some UI reads legacy `enrollments`, while student access reads `student_learning_state`/Wix structures.
7. **Competing XP and achievement systems exist.** `xp_ledger` and `student_xp_ledger` both represent XP; `badges/student_badges` and `achievement_definitions/student_achievements` both represent achievements. The UI and automation do not use one consistent source.
8. **Feature flags and registries are informational.** Feature flags are editable but are not evaluated by routes/features. API/plugin registries report configured rows, not live health. Extension snippets are stored but intentionally never executed.
9. **ARIA Core is not connected to an AI runtime.** Knowledge, rules, providers, prompts, and logs have schemas, but student-facing ARIA uses deterministic client code. The sandbox fabricates a template response locally and records it as a test.
10. **Notification delivery is incomplete.** Certificate and student notification queues exist, and routing metadata is applied, but no email/notification delivery worker exists in the repository.
11. **Several production claims are based on browser state.** Dream goals, challenges, practice sessions, portfolio work, mentor style/memory, and a teacher guardian indicator use `localStorage`. They are device-local, client-editable, and not official records.
12. **UI asset and encoding defects remain.** Several source strings contain mojibake. `VerificationPage` and the certificate document reference `/assets/jpac-official-logo.png`, while the repository asset is `jpac-official-logo.png.png`.

## Production Feature Matrix

| Capability | Primary artifacts | Status | Current data source | Canonical owner | Remaining work / disposition |
| --- | --- | --- | --- | --- | --- |
| Authentication session | `AuthContext`, `LoginPage`, `supabase.ts` | Implemented; live validation pending | Supabase Auth session/JWT; `profiles` | Supabase Auth / DB | Complete production invite/login regression test. Retain. |
| Wix purchaser invitation | `/api/wix-sync`, auth trigger | Implemented; live validation pending | Wix event → Supabase Admin invite | Wix member/purchase; Supabase Auth identity | Validate real Wix action, email delivery, callback allowlist, role/link preservation. Retain. |
| Invite/recovery/magic/verification callback | `AuthCallbackPage`, `auth.ts` | Implemented; live validation pending | PKCE code or implicit session tokens | Supabase Auth | Live-test every flow and expired/reused links. Retain. |
| Password setup/recovery | `SetPasswordPage`, `ForgotPasswordPage` | Implemented; live validation pending | `auth.updateUser`, `resetPasswordForEmail` | Supabase Auth | Confirm production templates and redirect allowlist. Retain. |
| Role routing | `App`, `AppLayout`, profile policies | Implemented | `profiles.role` | Supabase DB | Verify all four roles live. Client checks are presentation only; retain server policies. |
| Wix identity/order/program sync | `/api/wix-sync`, A1 tables | Partial | Wix webhook/bridge payloads | Wix commerce; Supabase link/cache | Validate event contracts/status vocabulary, pagination fallback for existing auth users, signature/replay operations, and live retry process. Retain. |
| Purchased course authorization | Build 2.1 migrations, `studentAccess.ts` | Implemented locally; deployment gated | `wix_access_entitlements`, status rules, explicit plan map | Wix purchase; Supabase authorization mapping | Populate exact IDs, review statuses, execute staged deployment and live-test. Retain. |
| My Courses/student dashboard | `MyCoursesPage`, `StudentDashboardPage` | Implemented locally | `jpac_my_entitled_courses()` | Supabase DB | Depends on Build 2.1 production deployment and mappings. Retain. |
| Course/module/lesson reader | `CoursePage`, `LessonPage`, `studentAccess.ts` | Implemented locally | `courses`, `course_modules`, `lessons`, `lesson_progress` | Supabase DB | Live RLS tests; decide whether lesson bodies remain Wix links or gain canonical content later. Retain. |
| Lesson progress | `lesson_progress`, student access RLS | Partial | Supabase DB | Supabase DB | Current client can mark in-progress/complete; no canonical prerequisite/completion aggregation. Keep as canonical lesson-level source and consolidate higher-level progress later. |
| Generic enrollment management | `EnrollmentManagerPage`, Admin enrollment RPCs | Partial / duplicate access concept | `enrollments` | Supabase DB | Does not grant Build 2.1 Wix purchase access. Define it as academic assignment only or retire it from student access decisions. |
| Admissions/prospects | `ManualStudentPage`, `pending_students`, admissions activity | Partial | Supabase DB | Supabase DB | Useful for pre-auth prospects, but acceptance/provisioning handoff is absent. Retain after lifecycle definition. |
| Teacher Studio | `TeacherPage`, review RPC compatibility wrapper | Partial | `profiles`, `enrollments`, `submissions` | Supabase DB | Reads legacy enrollments rather than Wix-linked learning state; guardian signal is localStorage; secure downstream RPC grants and validate class scoping. Reuse UI/review workflow. |
| Wix assignment bridge | `wix_assignments`, Practice Coach assignment mode, submission RPC | Partial / blocked | Wix sync, Storage, `submissions` | Wix assignment; Supabase submissions | Enforce program membership and narrow assignment RLS before production. Retain exact-ID bridge. |
| Private media upload | Storage policies, Practice Coach | Implemented locally | Supabase Storage `performance-submissions` | Supabase Storage | Validate bucket existence, MIME/size controls, malware/media processing, staff scope, and deletion lifecycle. Retain. |
| Teacher approval automation | A3 review function/event table | Partial / blocked | `submissions`, automation events, notifications | Supabase DB | Core workflow is reusable; revoke public execution, keep trusted teacher wrapper, validate idempotency and canonical XP/progress rules. |
| Wix completion outbox | A4 schema/triggers, `/api/wix-outbox` | Partial / blocked | `integration_outbox`; Wix webhook | Supabase delivery history; Wix program state | Secure RPCs, configure scheduling and Wix endpoint, verify retry/recovery live. Retain. |
| Program progress/XP engine | A5 functions/triggers/views | Partial / blocked / duplicate | assignments, submissions, learning state, two XP ledgers | Supabase DB | Remove title mapping, restrict internal functions, select canonical progress and XP ledgers, reconcile existing data. Reuse calculations after redesign. |
| Automatic completion certificates | A6 functions/triggers | Partial / blocked | `student_learning_state`, `certificates` | Supabase DB | Restrict issuance to trusted workflow, validate requirements/instructor authority, add delivery worker. Reuse idempotent certificate structure. |
| Public credential verification | `VerificationPage`, `verify_credential(text)`, certificate API, Build 2.3 token migration | Implemented locally; live validation pending | `certificates.verification_token` opaque text; UUID-shaped legacy or 48-character random hex | Supabase DB | Run credential validation SQL against production, live-test legacy/new/revoked/invalid tokens and printable document. Retain. |
| Admin manual certificates | `AdminPage`, admin RPC | Partial | `certificates` | Supabase DB | UI hard-codes A/95/40 hours/Level 1. Require operator-entered verified facts/audit before production. |
| Certificates/Creative Passport | `CertificateCenterPage` | Mixed: certificates implemented; portfolio demo | Certificates/badges/timeline plus localStorage portfolio | Supabase for credentials; Supabase should own portfolio | Keep verified gallery. Remove browser portfolio/readiness claims or migrate later to existing portfolio/media structures. |
| Achievements | `AchievementsPage`, two achievement schemas | Demo / duplicate | Hard-coded cards; `badges` family elsewhere | Supabase DB | Replace static page with one chosen canonical achievement model; migrate/remove duplicate schema after data audit. |
| XP/levels | dashboard level formula, `profiles.total_xp`, two ledgers | Partial / duplicate | Profile total and two ledgers | Supabase DB | Choose one ledger, rebuild totals, centralize level thresholds, prevent client/demo XP claims. |
| Practice Coach official submission | assignment mode | Partial | Storage + submission RPC | Supabase DB/Wix assignment | Reusable after membership authorization and production media controls. |
| Practice Coach “AI analysis” | non-assignment mode | Demo | File size, existing progress, timer, scripted templates, localStorage | ARIA should own analysis; Supabase official evidence | Clearly label/remove from production until a governed server AI/evaluation workflow exists. Never award official results from this path. |
| Student Intelligence/Digital Twin | DB schemas, refresh RPC, page | Partial | Multiple Supabase evidence tables and heuristic SQL | Supabase analytics; ARIA recommendations | Validate evidence quality, restrict mutations, connect only canonical inputs, document scoring. Reuse schema/page cautiously. |
| ARIA Mentor | mentor pages/components/library | Demo / disconnected | Deterministic client formulas and localStorage | ARIA Intelligence | Replace claims of contextual AI with explicit demo labeling or remove until server runtime is connected. Reuse presentation components. |
| ARIA Core | `AriaCorePage`, LC2 schema/RPCs | Partial / disconnected | Supabase knowledge/rules/provider/test tables | ARIA Intelligence governance | No response runtime consumes configuration; provider rows contain no implemented provider client. Retain governance schema only if connected later. |
| Dream Board | `DreamBoardIntelligencePage` | Demo | Hard-coded pathways and localStorage | Supabase DB for goals; ARIA for personalization | Existing `student_goals/interests/preferences` can replace browser storage. Remove production claims until connected. |
| Creative Challenges | `CreativeChallengesPage` | Demo | Hard-coded catalog and localStorage completion | Supabase DB | Self-completion and displayed XP are not official. Remove/label demo; later reuse UI against audited challenge tables/workflow. |
| Career Journey | `CareerPage` in `pages.tsx` | Demo | Hard-coded milestones and metrics | Supabase DB | Existing career tables can be reused. Replace or remove static production route. |
| Creative Studio | `StudioPage` in `pages.tsx` | Demo / disconnected | Hard-coded studio cards | JPAC UI; Supabase tool registry | Buttons do not launch tools; does not read `lab_tools`. Reconnect to one canonical registry or remove route claims. |
| LAB Manager | `LabManagerPage`, LC1.4 migration | Blocked | `lab_tools`, `lab_tool_courses` | Supabase DB | Fix incompatible duplicate table definition via reviewed migration; then connect published tools to Studio. |
| Curriculum Studio | `CurriculumStudioPage`, curriculum RPCs | Partial | curriculum tables | Supabase DB | CRUD is server-backed; add edit/archive/version validation, explicit Wix relationships, and production content governance. Reuse. |
| Operations Center | page, A7/A8 views/RPC | Partial | operational views, queues, audit tables | Supabase DB | Counts/views are useful, but some “Supabase/Vercel active” text is unconditional and retry functions need tightened grants. Reuse after hardening. |
| Integration health/readiness APIs | health/readiness routes | Partial | database counts/config booleans | JPAC operations | Shared-secret protected HTTP layer is usable; validate monitoring caller, rate limits, and secure underlying RPC. |
| Developer Studio | page and developer migration | Partial / disconnected | registries, flags, snippets, tools | JPAC/Supabase | Flags are not consumed; API health is manual metadata; plugins do not load; snippets do not execute. Keep registry/admin UI only if scope is made explicit. |
| Notifications | legacy notifications, student notifications, certificate email queue/routes | Partial / duplicate / disconnected | Supabase queues/tables | Supabase DB + external delivery provider | Select canonical notification model and implement audited delivery worker. Preserve queue history. |
| Guardian/family experience | parent relationships plus local guardian flag | Partial / duplicate | `parent_relationships`; localStorage in Teacher Studio | Supabase DB | Remove local flag and use canonical relationship. No guardian-facing route/auth experience exists. |
| Audit history | `audit_logs`, `system_audit_events`, integration events | Partial / duplicate | multiple audit tables | Supabase DB | Define domains/retention and prevent parallel generic audit stores. Preserve all existing history during consolidation. |

## Page-by-page audit

| Page/module | Routed? | Classification | Evidence and recommendation |
| --- | --- | --- | --- |
| `AcademyDashboardPage` | Teacher fallback home | Partial | Server-backed legacy enrollments/certificates/badges/profile metrics; not Wix entitlement dashboard. Reuse for staff only after data-source alignment. |
| `AdminPage` | Admin/developer | Partial | Real admin RPCs. Manual certificate facts are hard-coded; notification routes have no sender. Retain after workflow fixes. |
| `AriaCorePage` | Admin/developer | Disconnected demo/control UI | Writes real governance records, but sandbox response is a local template and no AI runtime consumes rules/providers. |
| `AuthCallbackPage` | Public | Implemented | Explicit PKCE/implicit handling and safe navigation. Production validation pending. |
| `CertificateCenterPage` | Authenticated | Mixed | Real credentials/badges/timeline; local portfolio, dream, practice/challenges, readiness and ARIA endorsement. Split canonical gallery from demo passport. |
| `CoursePage` | Authenticated | Implemented locally | Uses `loadCourseContent`; Build 2.1 RLS is the boundary. |
| `CreativeChallengesPage` | Authenticated | Demo | Static challenge catalog, client-controlled completion and displayed XP in localStorage. |
| `CurriculumStudioPage` | Staff | Partial | Real server RPC writes; production authoring lifecycle incomplete. |
| `DeveloperStudioPage` | Developer | Partial/disconnected | Database-backed control records not consumed by runtime features. |
| `DreamBoardIntelligencePage` | Student | Demo | Static pathways and localStorage; duplicates `student_goals`/`student_interests`. |
| `EnrollmentManagerPage` | Admin/developer | Partial | Real enrollment/guardian RPCs, but generic enrollment is not Wix purchase authorization. |
| `ForgotPasswordPage` | Public | Implemented | Supabase recovery flow; live email/callback validation pending. |
| `LabManagerPage` | Admin/developer | Blocked | Real UI/RPC, broken by `tool_id` versus `lab_tool_id` schema collision. |
| `LessonPage` | Authenticated | Implemented locally | Reads canonical lesson content/progress; access enforced server-side after Build 2.1. |
| `LoginPage` | Public | Implemented | Supabase password login and first-time messaging. |
| `ManualStudentPage` | Admin/developer | Partial | Manages pending admissions, not an Academy auth identity. Handoff is missing. |
| `MentorIntelligencePage` | Authenticated | Demo/partial | Reads some server metrics, but mentoring, chat and memory are deterministic/local. |
| `MyCoursesPage` | Student route | Implemented locally | Uses entitlement RPC; production mapping/deployment required. |
| `OperationsCenterPage` | Admin/developer home | Partial | Real counts/views/retry RPC; health labels overstate live checks. |
| `pages.tsx: StudioPage` | Authenticated | Demo/disconnected | Static catalog and inert Explore buttons; ignores `lab_tools`. |
| `pages.tsx: CareerPage` | Student | Demo | Static persona, milestones and evidence. Existing career DB tables are unused. |
| `pages.tsx: AchievementsPage` | Student | Demo | Static achievements; real badge schemas unused here. |
| `pages.tsx: HomePage` | No | Remove | Legacy hard-coded “Maya” dashboard, XP, courses and missions. Superseded by role-aware dashboards. |
| `pages.tsx: CoursesPage` | No | Remove | Legacy `launchCourses`; superseded by `MyCoursesPage`. |
| `pages.tsx: DreamBoardPage` | No | Remove | Older unsaved static dream selector; superseded by the newer browser-only Dream Board. |
| `pages.tsx: PlaceholderPage` | No | Remove if unused | Generic placeholder with no current import. |
| `PracticeCoachPage` | Authenticated | Mixed | Official Wix submission path is partial; “ARIA review” is simulated and local. |
| `SetPasswordPage` | Public route with session requirement | Implemented | Uses `auth.updateUser`; live validation pending. |
| `StudentDashboardPage` | Student home | Implemented locally | Correct entitlement RPC source. |
| `StudentIntelligencePage` | Authenticated/staff | Partial | Real database evidence/twin; heuristic and incomplete governance/validation. |
| `TeacherPage` | Staff | Partial | Real review actions, but legacy enrollments and local guardian indicator. |
| `VerificationPage` | Public | Partial | Real token verification; broken logo path and live document validation remain. |

## Shared component and client-library audit

| Artifact | Status | Reuse/removal decision |
| --- | --- | --- |
| `CreativeComponents` | Reusable | Presentation-only cards, timelines, actions, empty/loading states. Keep. |
| `WorkspaceHero` | Reusable | Presentation-only. Keep, but ARIA copy must not imply evidence not actually used. |
| `ui.tsx` | Reusable | Basic presentation primitives. Keep or consolidate with `CreativeComponents`. |
| `AriaMentor` | Demo presentation | Persists local mentor memory and renders calculated guidance. Keep only as a view component after canonical ARIA connection. |
| `StudentMentorIntelligence` | Demo | Reads multiple localStorage products and generates scripted chat. Remove from production or explicitly gate as demo. |
| `CourseCard` | Legacy duplicate | Used only by unrouted legacy pages and always links to Studio. Remove with legacy `launchCourses`. |
| `AppLayout` | Partial | Role-aware navigation is reusable. Notification bell is inert; many nav items lead to demos. Hide non-production routes. |
| `AuthContext` | Implemented | Supabase session/profile source is correct. `signUp` appears unused and should be removed or assigned a controlled workflow after review. |
| `studentAccess.ts` | Implemented locally | RPC/RLS source is reusable. Client `userId` filters cannot bypass RLS, but future API should derive identity internally to reduce ambiguity. |
| `ariaMentor.ts` | Demo | Deterministic plan builder/local memory, not ARIA intelligence. Keep only as explicitly non-official fallback copy. |
| `auth.ts` | Implemented | Safe internal redirects and callback construction. Keep. |
| `normalize.ts` | Reusable | Relation-shape adapter. Keep. |
| `academy.ts` | Mixed/legacy | Real environment config mixed with hard-coded people, Google Sheet ID, and demo course catalog. Split config from/remove demo catalog. |

## API route audit

| Route | Status | Authorization/data | Remaining work |
| --- | --- | --- | --- |
| `api/wix-sync.js` | Partial | Shared secret + service role; writes integration events, identities, links, entitlements, enrollments, assignments | Live Wix contract validation, operational replay, auth-user lookup beyond first 1000 users, transaction/partial-failure strategy. |
| `api/wix-outbox.js` | Partial/blocked | Shared secret; claims/delivers DB outbox | Underlying RPC is callable outside route; add scheduler, concurrency/live retry validation. |
| `api/integration-health.js` | Partial | Shared secret; counts inbound/outbound errors and config booleans | Add external monitoring integration and avoid treating config presence as service health. |
| `api/block-a-readiness.js` | Partial | Shared secret; calls validation RPC | Secure RPC independently; validation checks existence/counts, not full E2E correctness. |
| `api/wix-bridge-test.js` | Implemented diagnostic | Shared secret; records a synthetic integration event | Retain as controlled diagnostic or remove after launch if attack surface is unnecessary. |
| `api/certificate-document.js` | Partial | Public opaque token; service-role verification | Fix asset path/encoding, review cache/privacy and printable output. It is HTML, not a generated immutable PDF. |
| `api/_lib/integration.js` | Reusable | Central server config, shared secret, service-role client, event helpers, Wix POST | Use timing-safe/signature-based verification if Wix supports it; add structured correlation logging. |

## Migration and database-object audit

| Migration | Objects/capability | Assessment |
| --- | --- | --- |
| `20260804223000_foundation` | profiles, courses, enrollments, lab tools | Reusable foundation; early policies are later replaced. |
| `20260805000500_c1_learning_engine` | curriculum, progress, submissions, XP, badges, certificates, messaging, career, registries, audits | Broad prototype foundation. Reusable tables, but creates several later duplicate domains and the incompatible `lab_tool_courses.tool_id`. |
| `20260805014500_c2_auth_roles` | auth trigger, role helpers, profile/course policies | Reusable. Preserve UUID/profile trigger and staff permissions. Initial-owner claim needs production bootstrap review. |
| `20260805030000_c3_credentials_engine` | templates, second achievement model, render jobs | Partial/duplicate. Credential extensions useful; achievement duplication unresolved; render jobs have no worker. |
| `20260805043000_c3_academy_management` | role/XP/enrollment/certificate admin RPCs | Partial. Strong caller checks; manual certificate inputs/UI governance incomplete. |
| `20260805060000_c3_live_credentials_verification` | UUID verification RPC | Superseded in UI by later text-token overload; both overloads remain. Review/remove obsolete UUID public surface. |
| `20260805073000_c3_teacher_studio` | original teacher review RPC/policies | Function later replaced by compatibility wrapper. Staff policies remain reusable. |
| `20260805100000_c3_developer_studio` | flags/snippets/toggle RPC | Disconnected from runtime. Keep disabled staging only or remove unused control claims. |
| `20260805113000_lc1_curriculum_studio` | curriculum creation RPCs | Reusable partial authoring backend. |
| `20260805131500_lc1_student_intelligence_core` | goals, preferences, strengths, relationships, timelines, duplicate progress, portfolio, ARIA tables | Partial and over-broad domain migration. Many good canonical candidates, but UI often ignores them and progress overlaps existing state. |
| `20260805143000_lc1_enrollment_manager` | enrollment/guardian RPCs | Partial. Academic enrollment only; must not duplicate Wix commerce entitlement. |
| `20260805160000_lc1_lab_manager` | LAB columns/map/RPC | Blocked by incompatible prior table definition. |
| `20260805183000_lc2_aria_core` | ARIA governance tables/RPCs | Disconnected from AI runtime; schemas reusable after governance review. |
| `20260805203000_lc2_student_digital_twin` | twin/mastery/snapshots/refresh | Partial heuristic analytics; needs canonical evidence and reproducibility validation. |
| `20260805220000_manual_student_registration` | prospects/create RPC | Later function replaced; table reusable. |
| `20260805234500_lc23_admissions_dashboard` | activity/stage and replacement create RPC | Partial admissions workflow; no acceptance-to-auth transition. |
| `202608060001_block_a1_wix_identity_sync` | Wix links/entitlements/programs/events/access helper | Reusable canonical integration cache. `jpac_has_active_wix_access(target_profile)` leaks another profile's boolean and should be restricted/replaced. |
| `202608060002_block_a2_assignment_bridge` | assignment schema and first submission RPC | First RPC is superseded by A2 completion. Broad active-assignment read policy remains. |
| `202608060003_block_a2_completion` | storage policies and replacement submission RPC | Storage policies reusable; RPC validates identity but not program membership. |
| `202608060004_block_a3_approval_automation` | review automation, notifications/readiness/events | Reusable core after canonical-progress/XP decision and function grant hardening. |
| `202608060005_block_a3_teacher_review_compatibility` | teacher wrapper | Reusable adapter to A3, but default function grants should be explicitly revoked/regranted. |
| `202608060006_block_a4_completion_reliability` | outbox, delivery RPCs, trigger/status view | Good retry design, blocked by RPC exposure and absent scheduler/live Wix return validation. |
| `202608060007_block_a5_progress_xp_engine` | program map, second XP ledger, learning state, trigger/view | Blocked: title mapping, overexposed official mutation RPC, and duplicate canonical state. |
| `202608060008_block_a5_progress_payload_guard` | outbox normalization trigger | Reusable validation layer after A5 canonical redesign. |
| `202608060009_block_a6_certificate_graduation` | graduation/certificate queues/recommendations, issuance trigger, token verification | Blocked issuance RPC; useful idempotent schema and token verification; no email worker. |
| `202608060010_notification_routing` | routes and queue routing trigger | Partial; routes metadata only, no delivery. |
| `202608060011_block_a7_completion_validation` | readiness view/function | Diagnostic only. RPC permits null-auth execution inside its body and default public function privilege was not revoked. |
| `202608060012_block_a8_operations_monitoring` | audits, retry/rebuild, views | Partial; admin checks exist on exposed repair RPCs, but views/default grants and upstream A5 function require review. |
| `202608070101_student_access_hardening_prepare` | explicit plan map, status rules/discovery, access RPCs | Production-oriented and staged; uniquely revokes `PUBLIC` on student-access RPCs. Requires production mapping/status validation. |
| `202608070102_student_access_hardening_enforce` | course/module/lesson and progress RLS | Production-oriented guarded enforcement; live staff/student regression pending. |

### Trigger inventory

| Trigger | Purpose | Status |
| --- | --- | --- |
| `xp_ledger_refresh_total` | Recomputes profile XP from legacy `xp_ledger` | Reusable only if legacy ledger is selected as canonical; conflicts with `student_xp_ledger`. |
| `on_auth_user_created` | Creates/updates profile for new Auth user | Implemented; preserve. |
| `profiles_protect_role` | Prevents unauthorized role changes | Implemented; preserve. |
| `queue_wix_completion_after_approval` | Adds completion event to outbox | Partial; depends on secured A3/A4 workflow. |
| `run_a5_after_approval` | Rebuilds learning state/XP after approval | Blocked by A5 title mapping and canonical duplication. |
| `normalize_program_progress_payload` | Normalizes/validates program progress messages | Reusable after A5 redesign. |
| `run_a6_after_learning_completion` | Issues certificate at complete learning state | Blocked until issuance is internal-only and completion authority is validated. |
| `apply_certificate_notification_route` | Adds configured recipients to certificate queue | Partial; no delivery worker. |
| `register_wix_entitlement_status` | Discovers new Wix statuses fail-closed | Production-oriented; retain. |

### RLS policy assessment

All policy definitions were reviewed by domain. Policies are permissive and combine with logical OR, so retained staff `FOR ALL` policies continue to grant staff reads even after student policies are tightened.

| Policy family | Assessment |
| --- | --- |
| Profiles/roles | Self and staff reads plus protected role changes are generally reusable. Verify `claim_initial_owner` bootstrap is permanently closed after first owner. |
| Curriculum | Build 2.1 entitled course/module/lesson reads are the intended production model. Separate staff management policies are retained. Activities remain readable to all authenticated users when published and are not entitlement-aware. |
| Lesson/practice/submission progress | Own-or-staff reads are sound in intent. Build 2.1 progress writes require entitlement and preserve staff. Legacy practice/submission policies do not prove course/program membership. |
| Wix identity/entitlements | Own-row reads are sound. `wix_assignments` is overly broad: all authenticated users read all active assignments. |
| Storage | User-folder upload/read/update and staff read are reusable. No delete policy is present; API cleanup after RPC failure may fail for the student client because it calls Storage remove. |
| XP/achievements/certificates | Own/staff policies are reasonable, but `SECURITY DEFINER` RPC exposure can bypass them. Duplicate model families must be consolidated. |
| Student intelligence/portfolio | Mostly own-or-staff intent. Some tables are generated through dynamic policy creation and require deployed-schema inspection. Browser implementations bypass these canonical tables rather than RLS. |
| Admin/developer registries | Role-restricted policies are reusable, but no runtime consumes most control records. |
| ARIA governance | Staff/admin read/write separation is reasonable. No student runtime consumes the governed records. |
| Queues/audits/operations | Read policies generally restrict staff/admin. Mutation occurs through `SECURITY DEFINER` functions whose execution privileges are the main gap. |
| Build 2.1 mapping/status | Admin-only configuration policies plus authenticated access RPCs are appropriate; production validation remains mandatory. |

### Views and indexes

- Status/operations views (`jpac_block_a_status`, `jpac_a5_status`, `jpac_a6_status`, `jpac_block_a_readiness`, `jpac_operations_monitor`, `jpac_launch_readiness`) are useful diagnostics, not proof of successful E2E behavior. They are ordinary owner-executed views and their grants should be reviewed for least privilege.
- Unique indexes on Wix IDs/order IDs, external submissions, XP source keys, certificates, verification tokens, graduation events, and outbox dedupe keys are reusable idempotency controls.
- The partial active plan-course index and exact unique Wix plan mapping in Build 2.1 are appropriate.
- No index should be removed until deployed index usage and production data volume are inspected.

## Duplicate and consolidation map

| Concept | Competing implementations | Recommended canonical direction |
| --- | --- | --- |
| Purchased access | `enrollments` versus Wix entitlements/plan mapping | Wix entitlement + explicit mapping authorizes access; `enrollments` may remain academic assignment metadata only. |
| Course/program progress | lesson, course, activity, enrollment, Wix program and learning-state progress | Lesson progress as Academy evidence; explicit server aggregation; Wix program state only as synchronized external state. |
| XP | `xp_ledger` and `student_xp_ledger` | Select one append-only audited ledger and rebuild `profiles.total_xp`; do not dual-write. |
| Achievements | badges/student badges and achievement definitions/student achievements | Select one definitions/awards model, migrate records, preserve history. |
| Notifications | `notifications`, `student_notifications`, `certificate_email_queue` | One notification event model plus channel-specific delivery queue. |
| Portfolio | `portfolio_projects`, `media_assets`, `student_portfolio_documents`, browser portfolio | Supabase portfolio/media records; certificate documents may remain a typed portfolio artifact. Remove browser authority. |
| Audit | `audit_logs`, `system_audit_events`, `integration_events`, automation events | Keep domain event tables where required; select one general system audit ledger. |
| LAB course map | `tool_id` and `lab_tool_id` definitions on same table | One forward migration to a single column contract with preserved rows/FKs. |
| ARIA | governed DB core versus scripted client mentor/sandbox | Governed server-side ARIA runtime; client becomes presentation only. |
| Legacy course catalog | `launchCourses` versus `courses` + Wix mappings | Remove `launchCourses` from production paths. |

## Reuse priorities

1. Preserve Auth UUID/profile/role infrastructure and Build 2.1 entitlement controls.
2. Preserve Wix identity/event tables, explicit identifiers, raw payload/audit history, and idempotency constraints.
3. Reuse curriculum, lesson progress, submission storage, teacher review, outbox, learning-state, and credential structures only after the identified function/RLS/canonical-state blockers are corrected.
4. Reuse visual primitives and mature page layouts while replacing browser/static data with canonical services.
5. Preserve all production records during consolidation; use forward/rollback migrations and explicit backfills rather than dropping duplicate tables immediately.

## Removal or production-hiding candidates

Removal means removal from production routes/builds after confirming no production dependency; it does not authorize dropping production tables or data.

- Unrouted `HomePage`, legacy `CoursesPage`, legacy `DreamBoardPage`, `PlaceholderPage`, `CourseCard`, and `launchCourses`.
- Static Career and Achievements routes until connected to canonical career/achievement records.
- Static Creative Studio until it reads published `lab_tools` and launches validated tools.
- Client-simulated ARIA analysis/chat and challenge XP claims until governed workflows exist.
- Browser-only portfolio/readiness claims and guardian link indicator.
- Obsolete function overloads and superseded function bodies only through a separately reviewed migration after deployed dependency inspection.

## Required next audit/remediation order

1. Inspect the actual production migration ledger, schema, grants, policies, row counts, and function owners; repository order alone cannot prove deployed state.
2. Revoke default `PUBLIC` execution and explicitly grant every callable function according to role; make internal trigger/worker functions non-client-callable.
3. Remove A5 title-derived program mapping and require explicit Wix program IDs.
4. Repair `lab_tool_courses` through a data-preserving forward migration.
5. Choose canonical XP, achievement, progress, notification, portfolio, and audit models and document migrations before changing UI.
6. Enforce Wix program membership for assignment reads/submissions and validate Storage cleanup/deletion behavior.
7. Hide or label demo routes so no browser-controlled metric is represented as official.
8. Connect only approved UI to the selected canonical structures; do not build new features until these production-hardening gates pass.

## Audit coverage statement

The audit included all files under `src/pages`, `src/components`, `src/lib`, `src/context`, `src/layouts`, `api`, and `supabase/migrations`, plus current rollback and validation artifacts. CSS was inventoried for route/component coverage but contains no data or authorization behavior. Documentation was compared against implementation claims. Build 2.1 changes were treated as implemented locally but not production-deployed.
