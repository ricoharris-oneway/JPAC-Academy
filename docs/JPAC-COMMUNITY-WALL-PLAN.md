# JPAC Internal Community Wall Plan

## 1. Purpose

The JPAC Community Wall should build community inside JPAC Academy without requiring students to use or post to Facebook. It should give students, parents or guardians, teachers, administrators, and developers an age-appropriate place to celebrate progress, ask class questions, and encourage one another.

J. Moné Live Updates remains a separate, read-only view of public posts from J. Moné's official Facebook page. The Community Wall must not publish student content to Facebook or any other external social network.

## 2. Recommended location

### Recommended MVP: dedicated `/community` route

A dedicated route is the preferred long-term home because it gives moderation, feed browsing, reporting, announcements, and future class channels enough room to grow. It also creates a clear access boundary that can be tested independently from Student Intelligence.

Pros:

- Keeps community activity separate from private student intelligence and progress data.
- Supports a full feed, moderation queue, reporting tools, and future channels without crowding another page.
- Makes role-specific navigation and access testing clearer.
- Reduces the chance that community content is mistaken for verified learning evidence.

Cons:

- Requires a new route and navigation entry.
- Adds another destination for users to learn.
- Needs its own loading, empty, error, and access states.

### Alternative: section inside Student Intelligence

An embedded Community Wall preview could show a small number of approved posts and link to the full community experience.

Pros:

- Places encouragement near student growth information.
- Provides a convenient entry point without requiring users to discover a new page.
- Could support a small MVP if the wall remains extremely limited.

Cons:

- Mixes moderated social content with private learning intelligence.
- Makes Student Intelligence longer and more complex.
- Provides limited space for moderation, reporting, filtering, and announcements.
- Increases the impact of Community Wall failures on an existing working page.

Recommendation: build the Community Wall on `/community`, then optionally add a read-only approved-post preview inside Student Intelligence.

## 3. User roles

- **Student:** creates posts and comments for review, reacts to approved content, and reports concerns. Students see only approved content within their authorized community scope.
- **Parent/guardian, if supported later:** sees consented highlights and reports concerns within the scope of linked students. This role should not be assumed until guardian identity and authorization are formally implemented.
- **Teacher:** reviews student content within assigned scope, requests edits, approves or rejects content, posts announcements, and responds to reports.
- **Admin:** manages all moderation, visibility, media, announcements, reports, consent controls, and audit review.
- **Developer:** supports and diagnoses the feature under internal access rules, without receiving broader editorial authority by default.

## 4. Allowed student post types

- Practice wins
- Assignment reflections
- Class questions
- Showcase submissions
- Peer encouragement
- Event excitement
- JPAC challenge responses

All student-created posts and comments remain hidden until approved.

## 5. Blocked content types

- Private contact information, including phone numbers, email addresses, home addresses, or precise locations
- Outside social handles unless specifically approved by an administrator
- Direct-messaging requests or attempts to move conversations into private channels
- Bullying, harassment, threats, hate, or targeted humiliation
- Unsafe personal details or disclosures that require staff intervention
- Copyrighted media without permission
- Impersonation or deceptive AI-generated media
- Inappropriate language, images, audio, or video
- Unapproved external links

Automated checks may assist reviewers later, but they must not replace accountable human moderation for minors.

## 6. Moderation workflow

1. A student submits a post or comment.
2. Its initial status is `pending_review`, and it is not visible in the approved feed.
3. An authorized teacher or administrator reviews the text, media, links, audience, and consent requirements.
4. The reviewer chooses `approved`, `rejected`, or `changes_requested` and records a reason when appropriate.
5. Approved content becomes visible only to its authorized internal audience.
6. Rejected content stays hidden. Content needing edits returns to its author without becoming visible.
7. Every moderation decision is written to an append-only audit log with actor, action, timestamp, reason, and before/after status.
8. Reports can hide or quarantine previously approved content while an authorized reviewer investigates.

Administrators need an emergency unpublish control. Removing content from view should not erase its moderation history.

## 7. Safety requirements for minors

- No private direct-message feature in v1
- No student posting to Facebook from JPAC
- No automatic cross-posting to any external service
- No geolocation collection or display
- No phone number or email address display
- Administrator controls for image, audio, video, and submission-reference visibility
- Parent/guardian consent-language placeholder pending legal and policy review
- A visible reporting mechanism on every post and comment
- Least-privilege access and server-side authorization for every create, review, reaction, and report action
- Student-friendly community rules and clear notice that submissions are reviewed
- Defined staff escalation path for safety disclosures, threats, or suspected abuse
- Retention and deletion rules approved before launch

## 8. Suggested database tables for a future migration

No schema changes are part of this planning artifact. A future reviewed migration could consider the following tables.

### `community_posts`

Purpose: stores original posts, announcements, moderation state, and controlled attachment references.

Proposed fields:

- `id uuid primary key`
- `author_id uuid` referencing the authorized profile
- `post_type text` constrained to approved post categories and admin announcements
- `body text`
- `status text` such as `pending_review`, `changes_requested`, `approved`, `rejected`, `hidden`, or `archived`
- `audience_type text` such as academy, course, class, or group
- `audience_id uuid nullable` for a future authorized channel
- `media_url text nullable` for approved media only
- `submission_id uuid nullable` for an authorized showcase or assignment reference
- `is_announcement boolean default false`
- `approved_by uuid nullable`
- `approved_at timestamptz nullable`
- `created_at timestamptz`
- `updated_at timestamptz`

### `community_comments`

Purpose: stores moderated responses to approved posts without introducing private messaging.

Proposed fields:

- `id uuid primary key`
- `post_id uuid`
- `author_id uuid`
- `body text`
- `status text` using the moderation states applicable to comments
- `approved_by uuid nullable`
- `approved_at timestamptz nullable`
- `created_at timestamptz`
- `updated_at timestamptz`

Nested replies should be omitted from v1 or limited to one controlled level to reduce moderation complexity.

### `community_reactions`

Purpose: stores a small set of positive, non-anonymous reactions to approved posts or comments.

Proposed fields:

- `id uuid primary key`
- `actor_id uuid`
- `post_id uuid nullable`
- `comment_id uuid nullable`
- `reaction_type text` constrained to an approved positive set
- `created_at timestamptz`
- Unique constraint preventing duplicate identical reactions by the same actor and target
- Check constraint requiring exactly one target

### `community_moderation_actions`

Purpose: provides an append-only audit record for review and visibility decisions.

Proposed fields:

- `id uuid primary key`
- `actor_id uuid`
- `post_id uuid nullable`
- `comment_id uuid nullable`
- `action text` such as approve, reject, request edits, hide, restore, or archive
- `previous_status text nullable`
- `new_status text`
- `reason text nullable`
- `metadata jsonb` for non-sensitive operational context
- `created_at timestamptz`
- Check constraint requiring exactly one moderated target

### `community_reports`

Purpose: lets authorized users report concerning content and lets staff track resolution.

Proposed fields:

- `id uuid primary key`
- `reporter_id uuid`
- `post_id uuid nullable`
- `comment_id uuid nullable`
- `reason_category text`
- `details text nullable`
- `status text` such as `open`, `reviewing`, `resolved`, or `dismissed`
- `assigned_to uuid nullable`
- `resolution text nullable`
- `resolved_at timestamptz nullable`
- `created_at timestamptz`
- `updated_at timestamptz`
- Check constraint requiring exactly one reported target

Future schema design must include row-level security, role and audience authorization, content-length limits, safe media validation, indexes for moderation queues, and explicit cascade/retention behavior.

## 9. MVP feature set

- Create a text post using an allowed post type
- Attach one optional approved media URL or authorized submission reference
- Place all student content into a pending-review queue
- Allow authorized teachers or administrators to approve, reject, or request edits
- Show an internal feed containing approved posts only
- Offer a small set of positive reactions
- Allow users to report a post
- Allow administrators to publish clearly labeled announcement posts
- Provide visible loading, error, empty, and permission-denied states
- Record moderation actions in the audit log

## 10. Later feature set

- Class or group channels with explicit membership
- JPAC challenge prompts
- Featured student spotlights with consent controls
- Parent-visible highlights after guardian authorization is available
- Facebook share/export by an administrator only
- Meta Graph API integration if later approved
- In-app and email notification system with age-appropriate preferences

Each later feature requires its own privacy, authorization, consent, moderation, and rollout review.

## 11. Facebook integration boundary

- The current Facebook iframe is read-only social viewing of J. Moné's public Page timeline.
- Students must not post directly to Facebook from JPAC.
- JPAC must not automatically cross-post student content.
- An administrator-only share or export workflow may be considered later with explicit consent and review.
- Graph API integration requires a Meta app, appropriate access tokens, permissions, secure server-side token handling, and Meta app review before implementation.
- Facebook login is not required for the Community Wall MVP.

## 12. Pilot recommendation

Launch only as an internal, moderated wall for 3–5 internal test students. A teacher or administrator must approve every student post and comment. Disable public sharing, Facebook publishing, private messaging, draft-course expansion, and parent access during the pilot.

Pilot success should require:

- No unapproved student content becomes visible.
- No private contact information or unsafe external links are displayed.
- Reports and emergency hiding work as designed.
- Moderation actions are complete and auditable.
- Testers understand what is internal and what is public.
- Staff can stop the pilot without deleting its audit history.

The final pilot review should produce a documented go/no-go recommendation before expanding users, audiences, media types, or integrations.
