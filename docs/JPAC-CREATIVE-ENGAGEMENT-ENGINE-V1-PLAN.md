# JPAC Creative Engagement Engine v1 Plan

## 1. Purpose

The JPAC Creative Engagement Engine should make the Academy feel like a creative home base rather than a static school portal. Its purpose is to keep students inspired to return, support meaningful daily and weekly engagement, and surface fresh experiences without requiring staff to manually update the homepage every day.

All displayed content must come from safe, moderated, admin-controlled sources. Automation selects among approved content; it never bypasses approval or publication controls.

## 2. Automated content areas

The engine should support these independently configurable areas:

- Rotating homepage hero copy from an approved content bank.
- Rotating hero background images from an approved asset bank.
- A daily creative prompt that changes once per calendar day.
- A weekly creative challenge that changes once per calendar week.
- A featured course card selected from student-visible, published courses only.
- A featured community highlight sourced only from approved Community Wall posts.
- A student spotlight placeholder until approved spotlight records and consent controls exist.
- Achievement encouragement that celebrates progress without changing XP, mastery, assessment, or certificate logic.
- An upcoming event or announcement block using approved internal content.
- A “continue creating” recommendation block based on already-authorized student access and existing progress data, without exposing draft curriculum.

Each area must have safe fallback content so an empty, expired, or unavailable content bank never produces a blank homepage.

## 3. Recommended homepage sections

The authenticated homepage should use this order while adapting to role and screen size:

1. **Welcome Hero** — approved rotating message, safe visual, and a clear return-to-learning action.
2. **Continue Learning** — the student’s existing accessible learning destination; no new progress behavior.
3. **Daily Creative Prompt** — one low-pressure, age-appropriate creative invitation.
4. **Community Highlights** — a small preview of approved Community Wall posts only.
5. **Featured Challenge** — the current approved weekly challenge and participation instructions.
6. **Student Spotlight** — an approved, consent-aware feature or a neutral placeholder.
7. **Creative Inspiration** — staff-approved imagery, encouragement, or creative practice ideas.
8. **Portfolio / Certificate Progress** — a read-only presentation of existing eligible progress, not new award logic.
9. **Upcoming JPAC Events** — approved announcements, dates, or a friendly empty state.

Students should see the most useful next action early, while inspirational and community content remains secondary to safe course access.

## 4. Content safety model

- Only admin- or teacher-approved content may appear in automated slots.
- Public user-generated content must never appear without moderation.
- Student names or photos must not appear in a spotlight without recorded approval and applicable parent or guardian consent.
- Do not store or display private contact information.
- Do not collect or display geolocation.
- Do not provide external public-sharing controls.
- Do not post to Facebook or any other social network.
- Do not accept copyrighted media uploads without documented permission and staff approval.
- Student-created content may be sourced only from approved Community Wall posts or approved submissions.
- Content selection must honor the viewer’s existing authorization and must never reveal draft courses or modules.
- Empty, inaccessible, expired, rejected, or hidden content must resolve to approved fallback content rather than loosening filters.

## 5. Automation logic

### Deterministic rotation

- The daily prompt changes once per day using the Academy’s configured timezone. A stable date-based selection prevents it from changing on every refresh.
- The weekly challenge changes once per week using a documented week boundary and timezone.
- Hero copy rotates through active, approved entries in the content bank. Rotation may be deterministic by day or follow an admin-defined sequence.
- Hero images rotate independently through active, approved assets with accessible alt text and mobile-safe focal settings.
- The featured course may rotate weekly, but only among published courses already visible to the current user.
- Community highlights query approved posts only and must exclude hidden, rejected, pending-review, or revision-requested content.
- Student spotlights query approved spotlight records only and require valid display approval and consent state.

### Eligibility and fallback order

For every content slot, the engine should:

1. Identify active content within its start and end window.
2. Enforce approval, audience, consent, and access requirements.
3. Apply the configured rotation or priority rule.
4. Use an approved static fallback if no eligible record exists.
5. Render a safe empty state when neither eligible nor fallback content is configured.

Scheduling and selection should be read-oriented. It must not publish records, alter student state, or write course progress as a side effect of rendering the homepage.

## 6. Suggested future database tables

These tables are proposals for a later migration phase. They are not part of this planning change.

### `creative_prompts`

Proposed fields: `id`, `title`, `prompt_body`, `discipline_tags`, `age_band`, `status`, `approved_by`, `approved_at`, `starts_at`, `ends_at`, `is_fallback`, `created_by`, `created_at`, `updated_at`.

Purpose: maintain reusable daily prompt content. Safety controls should restrict visible records to approved and active entries, constrain allowed statuses, require staff approval metadata, and prevent student-authored records from becoming visible automatically.

### `creative_challenges`

Proposed fields: `id`, `title`, `description`, `instructions`, `discipline_tags`, `age_band`, `status`, `approved_by`, `approved_at`, `starts_at`, `ends_at`, `is_fallback`, `created_by`, `created_at`, `updated_at`.

Purpose: manage weekly participation ideas without changing curriculum or assessment logic. Challenges should be non-credit engagement content unless a separate approved integration is designed later. Only active, approved challenges may be displayed.

### `homepage_hero_assets`

Proposed fields: `id`, `headline`, `supporting_copy`, `image_url`, `image_alt`, `mobile_image_url`, `focal_position`, `overlay_strength`, `status`, `approved_by`, `approved_at`, `starts_at`, `ends_at`, `created_by`, `created_at`, `updated_at`.

Purpose: provide approved hero copy and visual combinations. Safety controls should require HTTPS asset URLs, accessible alt text, staff approval, licensed or owned media, and bounded overlay/focal values.

### `homepage_content_slots`

Proposed fields: `id`, `slot_key`, `content_type`, `content_id`, `audience_roles`, `priority`, `status`, `starts_at`, `ends_at`, `fallback_key`, `approved_by`, `approved_at`, `created_at`, `updated_at`.

Purpose: configure what may appear in each homepage area. Unique active-slot and time-window rules should prevent conflicting assignments. Audience and approval checks must be enforced before selection.

### `student_spotlights`

Proposed fields: `id`, `student_id`, `display_name_override`, `headline`, `story`, `approved_media_url`, `consent_status`, `consent_recorded_at`, `consent_recorded_by`, `status`, `approved_by`, `approved_at`, `starts_at`, `ends_at`, `created_at`, `updated_at`.

Purpose: hold explicitly approved student features. Safety controls must minimize identity data, prohibit private contact fields, require approval and valid consent, and allow immediate hiding or archival. Public visibility should not be assumed.

### `featured_content_rules`

Proposed fields: `id`, `rule_key`, `slot_key`, `selection_mode`, `eligible_content_types`, `audience_roles`, `discipline_filters`, `rotation_period`, `timezone`, `fallback_key`, `is_active`, `approved_by`, `approved_at`, `created_at`, `updated_at`.

Purpose: define deterministic, explainable selection behavior. Rules should use enumerated modes, approved content sources, bounded filters, and staff-only management. No rule may override course access or moderation status.

### `engagement_events`

Proposed fields: `id`, `event_type`, `content_type`, `content_id`, `viewer_id`, `session_id`, `occurred_at`, `metadata`, `created_at`.

Purpose: support privacy-conscious measurement such as content impressions or voluntary interactions. Safety controls should minimize personal data, disallow contact and location fields, define retention limits, validate event types, and avoid recording curriculum completion, grades, mastery, or assessment evidence in this table.

## 7. MVP version

The MVP should remain deliberately simple and admin-managed:

- A static, reviewed prompt bank bundled with the application.
- Rotating homepage hero copy drawn from approved static entries.
- Rotating safe background visuals from an approved asset list.
- A daily creative prompt card with deterministic daily selection.
- A weekly challenge card with deterministic weekly selection.
- A small community preview that reads approved Community Wall posts only.
- Clear fallback and empty states for every dynamic area.
- Admin-managed content only; no student authoring or automated publication through the engine.

The MVP should not require a new scheduler or AI service. Date-based selection in the authenticated client or an existing trusted application layer is sufficient for approved static content.

## 8. Later version

After the MVP is stable and reviewed, later phases may add:

- An admin content scheduler with preview and approval states.
- An automatic spotlight nomination queue that still requires human approval and consent.
- AI-assisted prompt suggestions visible to admins only; generated suggestions remain drafts until approved.
- Seasonal themes using approved copy and asset banks.
- Event countdowns with timezone-safe start and end dates.
- Badge and streak visual celebrations that read existing state without changing award logic.
- Course-specific daily challenges limited to curriculum the student can already access.
- Personalized recommendations with transparent, access-safe eligibility rules.
- Parent-safe highlights with dedicated permissions and consent controls.
- Portfolio showcase integration limited to approved showcase records.

## 9. Visual design direction

The experience should use JPAC’s purple, gold, and black palette with a premium creative-dashboard feel. Cinematic arts backgrounds may include music, dance, acting, production, and AI creator imagery from approved sources. Subtle image overlays, stage-light textures, soft hover effects, and readable dark overlays should add energy without reducing contrast or distracting from the student’s next action.

Visual requirements should include responsive crops, meaningful alt text, keyboard-visible interactions, reduced-motion support, strong text contrast, and restrained animation. Background imagery must never carry essential instructions.

## 10. Implementation phases

### Phase 1 — Planning and content model

Confirm slot definitions, audiences, moderation sources, fallback rules, asset licensing, consent requirements, accessibility standards, and success measures.

### Phase 2 — Database migration artifacts

Design read-only preflight, narrowly scoped schema migration, post-validation, rollback, RLS, indexes, constraints, and zero-seed safety checks. Do not apply migrations until separately reviewed and approved.

### Phase 3 — Homepage visual upgrade

Build the reusable visual components, authenticated homepage layout, static approved banks, deterministic rotation, and approved Community Wall preview.

### Phase 4 — Admin content management

Add staff-only drafting, scheduling, preview, approval, expiration, asset metadata, fallback management, and audit history.

### Phase 5 — Automated rotation and personalization

Introduce server-governed rotation and access-safe personalization with observability, explicit fallbacks, privacy review, and administrative overrides.

## 11. Guardrails

- Do not auto-publish student content.
- Do not expose draft curriculum.
- Do not create public social posting or automatic cross-posting.
- Do not allow unmoderated student images.
- Do not create AI-generated public content without admin approval.
- Do not interfere with course progress, assessment, XP, mastery, enrollment, submission, or certificate logic.
- Do not treat engagement prompts or challenges as graded curriculum unless a separately approved design explicitly integrates them.
- Do not weaken Community Wall moderation or access policies to obtain homepage content.

## 12. Recommended first build

The first implementation should be a homepage creative visual upgrade with a reusable creative card system. It should add a daily prompt card using a safe static fallback bank and a compact community-highlights area that pulls approved Community Wall posts only.

This build should use deterministic local rotation for approved hero copy and visuals, preserve visible loading/error/empty states, and remain entirely behind authenticated access. It should not introduce AI automation, student spotlight data, scheduling tables, new publication behavior, or writes to student learning state.

### First-build acceptance boundaries

- Only approved static content and approved Community Wall posts appear.
- Missing content produces a safe fallback or friendly empty state.
- The community preview cannot query pending, hidden, rejected, or needs-revision posts.
- Featured course links cannot point to draft or unauthorized curriculum.
- No automation writes to student records or changes access.
- Staff retain full control over every content source used by the homepage.
