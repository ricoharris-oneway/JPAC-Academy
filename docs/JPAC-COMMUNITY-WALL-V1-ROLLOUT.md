# JPAC Community Wall v1 Rollout

## Purpose

JPAC Community Wall v1 provides the database foundation for a moderated, internal community space without requiring students to use Facebook. It is designed for practice wins, reflections, class questions, showcase submissions, encouragement, event excitement, and JPAC challenge responses.

This artifact set does not execute the rollout, create community content, change student access, or implement a user interface.

## Artifact set

- `supabase/validation/202608230004_jpac_community_wall_v1_preflight.sql`
- `supabase/migrations/202608230004_jpac_community_wall_v1.sql`
- `supabase/validation/202608230004_jpac_community_wall_v1_post_validation.sql`
- `supabase/rollbacks/202608230004_jpac_community_wall_v1_rollback.sql`
- `docs/JPAC-COMMUNITY-WALL-V1-ROLLOUT.md`

The planning authority is `docs/JPAC-COMMUNITY-WALL-PLAN.md`.

## Schema summary

### `community_posts`

Stores moderated internal posts. Student-created posts default to `pending_review`. The table supports approved post categories, an optional HTTPS media reference, an optional existing submission reference, review fields, and timestamps. It contains no geolocation, phone, email, private-message, Facebook-publishing, or public-sharing fields.

### `community_comments`

Stores moderated comments on posts. Comments are not private messages, cannot be nested in v1, and default to `pending_review`.

### `community_reactions`

Stores non-anonymous positive reactions (`applause`, `celebrate`, `encourage`, or `inspired`) on exactly one approved post or approved comment. Partial unique indexes prevent duplicate identical reactions by the same user and target.

### `community_moderation_actions`

Stores the append-only application audit trail for approvals, rejections, revision requests, hiding/restoring content, reports, and report resolution. Authenticated application roles receive only `SELECT` and `INSERT`; no `UPDATE` or `DELETE` privilege is granted.

### `community_reports`

Stores safety reports for exactly one post or comment. Reports default to `open`; staff can manage review and resolution.

No table stores private conversations, direct-message recipients, geolocation, phone numbers, email addresses, social handles, cross-post destinations, or public share URLs.

## Moderation workflow

1. A student inserts a post or comment as their own profile.
2. Database defaults and RLS require the new content to be `pending_review`, unreviewed, and non-announcement content.
3. Pending content is visible only to its author and authorized JPAC staff.
4. An authorized teacher, administrator, or developer reviews the content.
5. The moderation application must record the decision in `community_moderation_actions` and update the target in the same application transaction or trusted server workflow.
6. `approved` content becomes visible to authenticated internal users.
7. `rejected`, `hidden`, and `archived` content remains outside the approved internal feed.
8. `needs_revision` content remains visible to its author and staff; the author may resubmit it as `pending_review`.
9. A report is visible to its reporter and staff. Staff records resolution in both the report and the moderation audit trail.

The v1 schema deliberately does not add database RPCs or triggers. Before student access is enabled, the trusted application workflow must guarantee that every moderation and report-resolution mutation is paired with an audit insert. Direct database editing is not an approved moderation workflow.

## Safety boundaries

- Internal authenticated community only
- All student posts and comments start as `pending_review`
- Approved content is the only general internal-feed content
- No anonymous access
- No private messaging
- No student-to-student direct-message fields
- No Facebook posting or automatic cross-posting
- No public external-sharing fields
- No geolocation or contact-display fields
- Optional media references must use HTTPS and remain subject to staff review
- No seeded posts, comments, reactions, reports, or announcements
- No curriculum, course, enrollment, submission evidence, certificate, XP, or progress mutation

Content rules, media validation, consent language, incident escalation, and retention policy must be approved before the UI is opened to students.

## RLS and access-control decision

All five tables are in the exposed `public` schema, so RLS is enabled on each table. Public and anonymous privileges are revoked. Policies use the existing JPAC `public.is_academy_staff()` and `public.is_academy_admin()` helpers and authenticated profile ownership.

- Students and authenticated users can read approved internal posts and comments.
- Authors can read their own pending, rejected, revision-requested, hidden, or archived content.
- Authors can submit only their own non-announcement content as `pending_review`.
- Authors can resubmit their own `needs_revision` content to `pending_review`.
- Only staff can moderate posts/comments and resolve reports.
- Only admins/developers can create an immediately approved admin announcement.
- Reactions can target only approved content, and users can remove only their own reactions.
- Users can create and read their own reports; staff can review all reports.
- Only staff can read or insert moderation audit rows; application roles cannot update or delete audit rows.

These policies provide database defense in depth. They do not replace server-side request validation, content moderation, consent checks, or the required atomic audit workflow.

## Preflight steps

1. Review the preflight file and confirm it begins a read-only transaction.
2. Execute it only through the approved database-change process.
3. Confirm all five community table names are absent.
4. Confirm required auth/profile objects and JPAC role helpers exist.
5. Confirm all ten protected course module counts match their baselines.
6. Confirm both Assignment Swap RPCs and two approved audit rows remain present.
7. Confirm student-state counts remain `xp_ledger=5`, `enrollments=1`, `submissions=1`, `certificates=0`, and `lesson_progress=5`.
8. Continue only when `OVERALL` is `PASS` with zero blockers.

## Migration steps

1. Obtain explicit approval after a clean preflight.
2. Review the migration and confirm only the five Community Wall tables, their constraints, indexes, grants, policies, and comments are in scope.
3. Apply the migration once through the approved migration workflow.
4. Do not seed content or enable UI access as part of the schema rollout.
5. Immediately run post-validation.

## Post-validation steps

1. Confirm exactly five Community Wall tables exist.
2. Confirm all required columns, primary keys, foreign keys, checks, status/action vocabularies, and target-cardinality constraints exist.
3. Confirm moderation-queue, approved-feed, ownership, report, reaction, and audit indexes exist.
4. Confirm all five tables have RLS enabled, conservative policies exist, and anonymous CRUD privileges are absent.
5. Confirm every Community Wall table contains zero rows.
6. Confirm protected curriculum, Assignment Swap, student-state, and certificate baselines remain unchanged.
7. Treat any `BLOCK` or nonzero blocker count as a failed rollout.

### Migration execution and validation correction

The Community Wall v1 migration completed successfully. The first post-validation run confirmed all five tables, all 52 required columns, all 15 expected indexes, zero seed rows, RLS on all five tables, all 17 conservative policies, zero anonymous table privileges, and unchanged protected curriculum, Assignment Swap, student-state, and certificate baselines.

The only reported blocker was the `SCHEMA / CONSTRAINTS` checker. The database correctly reported 5 primary keys, 17 foreign keys, and 24 check constraints against a minimum of 23. PostgreSQL catalog matching found two valid action-related checks and two valid report-status-related checks. The original validator required exactly one action match, so it produced a false blocker even though the schema was intact.

The corrected validator accepts one or more matching action checks and one or more matching report-status checks. Exact expectations remain unchanged for the five primary keys, 17 foreign keys, post-status check, comment-status check, and reaction-type check. The post-validation must be rerun through the approved read-only process to confirm `OVERALL PASS`; no migration repair or rollback is required for this validation-only mismatch.

The next read-only rerun stopped before returning findings because the `findings` CTE did not explicitly name its four literal/union output columns, while the final query referenced `report_section`. This was a validation SQL alias error, not a migration or schema failure. The CTE now declares `findings(report_section, code, result, details)` explicitly; all schema, RLS, policy, index, no-seed, protected-curriculum, Assignment Swap, student-state, and certificate checks remain unchanged.

## Rollback scope

The rollback drops only these five tables, in dependency-safe order:

1. `community_moderation_actions`
2. `community_reports`
3. `community_reactions`
4. `community_comments`
5. `community_posts`

Their table-owned indexes and RLS policies are removed with the tables. The rollback does not touch auth users, profiles, curriculum, courses, enrollments, submissions, certificates, XP, progress, Assignment Swap, or other student evidence.

Do not run rollback after real pilot content exists without a separately approved retention/export decision.

## UI implementation recommendations

- Prefer a dedicated authenticated `/community` route.
- Optionally show a small read-only approved-post preview inside Student Intelligence.
- Provide visible loading, error, empty, permission-denied, and pending-review states.
- Keep the post composer explicit about allowed content and human review.
- Show authors their own moderation status without exposing reviewer-only notes to other students.
- Build a separate staff moderation queue with approve, reject, request-revision, hide, restore, and report-resolution actions.
- Pair every moderation mutation with an audit insert through a trusted server-side transactional workflow before enabling student posting.
- Validate text lengths, approved post types, media URLs, submission ownership, and report targets server-side.
- Never display profile email or phone fields in the community UI.
- Do not query or display draft curriculum through the Community Wall.

## Pilot recommendation

Launch only after UI/access validation with 3–5 internal test students. Require teacher/admin review of every student post and comment. Use text-first content and at most carefully approved media or submission references. Keep parent access, public sharing, notifications, class channels, and external integrations disabled.

Pilot success requires that no pending/rejected content appears in the approved feed, reports reach staff, audit rows accompany every moderation decision, and the pilot can stop without affecting curriculum or student learning evidence.

## Public launch restrictions

Community Wall v1 is not approved for public launch. Do not enable paid/public student access until minor-safety policy, guardian consent language, staff coverage, media review, incident response, retention/deletion, accessibility, abuse testing, and legal review are complete.

Do not publish draft courses or broaden curriculum access as part of this feature.

## Facebook integration boundary

J. Moné Live Updates remains a read-only Facebook Page Plugin iframe. Students cannot publish to Facebook from JPAC, and Community Wall content is not automatically cross-posted.

An admin-only export/share workflow may be considered later with explicit consent and review. Meta Graph API work is out of scope until a Meta app, secure server-side tokens, permissions, and Meta app review are approved.
